"""
Servicios de lógica de negocio para el sistema de caja
Maneja: cálculo de insumos, cobros pendientes, pagos, descuento de stock, reportes
"""

from decimal import Decimal, ROUND_UP
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import SesionCaja, Venta, DetalleVenta, AuditoriaCaja
from inventario.models import Insumo
from servicios.models import Servicio


# =============================================================================
# CÁLCULO DE INSUMOS POR DOSIS
# =============================================================================

def calcular_cantidad_insumos(insumo, peso_paciente, dosis_ml_por_kg=None):
    """
    Calcula cuántos ítems se necesitan basándose en:
    - Peso del paciente
    - Dosis en ml/kg (puede venir del insumo o ser manual)
    - ML por contenedor del insumo
    
    Retorna:
        dict con:
            - cantidad: cantidad de ítems necesarios
            - dosis_total_ml: dosis total calculada
            - requiere_confirmacion: True si faltan datos
            - mensaje: mensaje descriptivo
    """
    resultado = {
        'cantidad': Decimal('1'),
        'dosis_total_ml': None,
        'requiere_confirmacion': False,
        'mensaje': '',
        'calculo_automatico': False
    }
    
    # Obtener dosis del insumo si no se proporcionó
    if dosis_ml_por_kg is None:
        dosis_ml_por_kg = insumo.dosis_ml
    
    # Verificar que tengamos todos los datos necesarios
    if not peso_paciente:
        resultado['requiere_confirmacion'] = True
        resultado['mensaje'] = "Falta el peso del paciente"
        return resultado
    
    if not dosis_ml_por_kg:
        resultado['requiere_confirmacion'] = True
        resultado['mensaje'] = f"El insumo '{insumo.medicamento}' no tiene dosis definida"
        return resultado
    
    if not insumo.ml_contenedor:
        resultado['requiere_confirmacion'] = True
        resultado['mensaje'] = f"El insumo '{insumo.medicamento}' no tiene ml por contenedor definido"
        return resultado
    
    # Calcular dosis total
    dosis_total = Decimal(str(peso_paciente)) * Decimal(str(dosis_ml_por_kg))
    resultado['dosis_total_ml'] = dosis_total
    
    # Calcular cantidad de contenedores (redondear hacia arriba)
    cantidad = (dosis_total / Decimal(str(insumo.ml_contenedor))).quantize(
        Decimal('1'),
        rounding=ROUND_UP
    )
    
    resultado['cantidad'] = cantidad
    resultado['calculo_automatico'] = True
    resultado['mensaje'] = (
        f"Dosis total: {dosis_total}ml. "
        f"Se requieren {cantidad} contenedor(es) de {insumo.ml_contenedor}ml"
    )
    
    return resultado


def obtener_datos_faltantes_insumo(insumo):
    """
    Verifica qué datos faltan en un insumo para poder hacer el cálculo automático
    
    Retorna:
        dict con campos faltantes
    """
    faltantes = {}
    
    if not insumo.dosis_ml:
        faltantes['dosis_ml'] = 'Dosis en ml/kg'
    
    if not insumo.ml_contenedor:
        faltantes['ml_contenedor'] = 'ML por contenedor'
    
    return faltantes


# =============================================================================
# CREACIÓN DE COBROS PENDIENTES
# =============================================================================

@transaction.atomic
def crear_cobro_pendiente_desde_consulta(consulta, usuario):
    """
    Crea un cobro pendiente automáticamente desde una consulta
    
    Pasos:
    1. Crea la venta en estado pendiente
    2. Agrega servicios
    3. Agrega insumos calculados
    4. Calcula totales
    5. Registra auditoría
    """
    from clinica.models import ConsultaInsumo
    
    # Verificar que no exista ya un cobro para esta consulta
    if hasattr(consulta, 'venta') and consulta.venta:
        raise ValidationError("Esta consulta ya tiene un cobro asociado")
    
    # Crear la venta
    venta = Venta.objects.create(
        tipo_origen='consulta',
        consulta=consulta,
        paciente=consulta.paciente,
        estado='pendiente',
        usuario_creacion=usuario
    )
    
    # Agregar servicios
    for servicio in consulta.servicios.all():
        DetalleVenta.objects.create(
            venta=venta,
            tipo='servicio',
            servicio=servicio,
            descripcion=servicio.nombre,
            cantidad=1,
            precio_unitario=servicio.precio
        )
    
    # Agregar insumos con cálculo automático
    for consulta_insumo in consulta.insumos_detalle.all():
        DetalleVenta.objects.create(
            venta=venta,
            tipo='insumo',
            insumo=consulta_insumo.insumo,
            descripcion=consulta_insumo.insumo.medicamento,
            cantidad=consulta_insumo.cantidad_final,
            precio_unitario=consulta_insumo.insumo.precio_venta or Decimal('0'),
            peso_paciente=consulta_insumo.peso_paciente,
            dosis_calculada_ml=consulta_insumo.dosis_total_ml,
            ml_contenedor=consulta_insumo.ml_por_contenedor,
            calculo_automatico=consulta_insumo.calculo_automatico
        )
    
    # Recalcular totales
    venta.calcular_totales()
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='crear_venta',
        usuario=usuario,
        descripcion=f"Cobro pendiente creado automáticamente desde consulta #{consulta.id}"
    )
    
    return venta


@transaction.atomic
def crear_cobro_pendiente_desde_hospitalizacion(hospitalizacion, usuario):
    """
    Crea un cobro pendiente desde una hospitalización
    Incluye: servicios, insumos de hospitalización, cirugías, etc.
    """
    from clinica.models import HospitalizacionInsumo, CirugiaInsumo
    
    # Verificar que no exista ya un cobro
    if hasattr(hospitalizacion, 'venta') and hospitalizacion.venta:
        raise ValidationError("Esta hospitalización ya tiene un cobro asociado")
    
    # Crear la venta
    venta = Venta.objects.create(
        tipo_origen='hospitalizacion',
        hospitalizacion=hospitalizacion,
        paciente=hospitalizacion.paciente,
        estado='pendiente',
        usuario_creacion=usuario
    )
    
    # Agregar insumos de hospitalización
    for hosp_insumo in hospitalizacion.insumos_detalle.all():
        DetalleVenta.objects.create(
            venta=venta,
            tipo='insumo',
            insumo=hosp_insumo.insumo,
            descripcion=f"{hosp_insumo.insumo.medicamento} (Hospitalización)",
            cantidad=hosp_insumo.cantidad_final,
            precio_unitario=hosp_insumo.insumo.precio_venta or Decimal('0'),
            peso_paciente=hosp_insumo.peso_paciente,
            dosis_calculada_ml=hosp_insumo.dosis_total_ml,
            ml_contenedor=hosp_insumo.ml_por_contenedor,
            calculo_automatico=hosp_insumo.calculo_automatico
        )
    
    # Agregar cirugías y sus insumos
    for cirugia in hospitalizacion.cirugias.all():
        # Agregar servicio de cirugía si existe
        if cirugia.servicio:
            DetalleVenta.objects.create(
                venta=venta,
                tipo='servicio',
                servicio=cirugia.servicio,
                descripcion=f"Cirugía: {cirugia.tipo_cirugia}",
                cantidad=1,
                precio_unitario=cirugia.servicio.precio
            )
        
        # Agregar insumos de cirugía
        for cirugia_insumo in cirugia.insumos_detalle.all():
            DetalleVenta.objects.create(
                venta=venta,
                tipo='insumo',
                insumo=cirugia_insumo.insumo,
                descripcion=f"{cirugia_insumo.insumo.medicamento} (Cirugía: {cirugia.tipo_cirugia})",
                cantidad=cirugia_insumo.cantidad_final,
                precio_unitario=cirugia_insumo.insumo.precio_venta or Decimal('0'),
                peso_paciente=cirugia_insumo.peso_paciente,
                dosis_calculada_ml=cirugia_insumo.dosis_total_ml,
                ml_contenedor=cirugia_insumo.ml_por_contenedor,
                calculo_automatico=cirugia_insumo.calculo_automatico
            )
    
    # Recalcular totales
    venta.calcular_totales()
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='crear_venta',
        usuario=usuario,
        descripcion=f"Cobro pendiente creado desde hospitalización #{hospitalizacion.id}"
    )
    
    return venta


@transaction.atomic
def crear_venta_libre(usuario, items_servicios=None, items_insumos=None, paciente=None, observaciones=''):
    """
    Crea una venta libre (sin consulta ni hospitalización)
    
    Args:
        usuario: Usuario que crea la venta
        items_servicios: Lista de dict {'servicio_id': X, 'cantidad': Y}
        items_insumos: Lista de dict {'insumo_id': X, 'cantidad': Y}
        paciente: Paciente opcional
        observaciones: Observaciones de la venta
    """
    # Crear la venta
    venta = Venta.objects.create(
        tipo_origen='venta_libre',
        paciente=paciente,
        estado='pendiente',
        usuario_creacion=usuario,
        observaciones=observaciones
    )
    
    # Agregar servicios
    if items_servicios:
        for item in items_servicios:
            servicio = Servicio.objects.get(pk=item['servicio_id'])
            DetalleVenta.objects.create(
                venta=venta,
                tipo='servicio',
                servicio=servicio,
                descripcion=servicio.nombre,
                cantidad=item.get('cantidad', 1),
                precio_unitario=servicio.precio
            )
    
    # Agregar insumos
    if items_insumos:
        for item in items_insumos:
            insumo = Insumo.objects.get(pk=item['insumo_id'])
            DetalleVenta.objects.create(
                venta=venta,
                tipo='insumo',
                insumo=insumo,
                descripcion=insumo.medicamento,
                cantidad=item.get('cantidad', 1),
                precio_unitario=insumo.precio_venta or Decimal('0')
            )
    
    # Recalcular totales
    venta.calcular_totales()
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='crear_venta',
        usuario=usuario,
        descripcion="Venta libre creada manualmente"
    )
    
    return venta


# =============================================================================
# EDICIÓN DE COBROS PENDIENTES
# =============================================================================

@transaction.atomic
def agregar_detalle_venta(venta, tipo, item_id, cantidad, usuario, precio_manual=None):
    """
    Agrega un detalle (servicio o insumo) a una venta pendiente
    """
    if venta.estado != 'pendiente':
        raise ValidationError("Solo se pueden editar ventas pendientes")
    
    # Obtener el item
    if tipo == 'servicio':
        servicio = Servicio.objects.get(pk=item_id)
        detalle = DetalleVenta.objects.create(
            venta=venta,
            tipo='servicio',
            servicio=servicio,
            descripcion=servicio.nombre,
            cantidad=cantidad,
            precio_unitario=precio_manual or servicio.precio
        )
    else:  # insumo
        insumo = Insumo.objects.get(pk=item_id)
        detalle = DetalleVenta.objects.create(
            venta=venta,
            tipo='insumo',
            insumo=insumo,
            descripcion=insumo.medicamento,
            cantidad=cantidad,
            precio_unitario=precio_manual or (insumo.precio_venta or Decimal('0'))
        )
    
    # Recalcular totales
    venta.calcular_totales()
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='agregar_detalle',
        usuario=usuario,
        descripcion=f"Agregado: {detalle.descripcion} x{cantidad}",
        datos_nuevos={'detalle_id': detalle.id, 'descripcion': detalle.descripcion, 'cantidad': str(cantidad)}
    )
    
    return detalle


@transaction.atomic
def eliminar_detalle_venta(detalle_id, usuario):
    """
    Elimina un detalle de una venta pendiente
    """
    detalle = DetalleVenta.objects.get(pk=detalle_id)
    venta = detalle.venta
    
    if venta.estado != 'pendiente':
        raise ValidationError("Solo se pueden editar ventas pendientes")
    
    # Guardar datos para auditoría
    datos_anteriores = {
        'descripcion': detalle.descripcion,
        'cantidad': str(detalle.cantidad),
        'subtotal': str(detalle.subtotal)
    }
    
    # Eliminar
    detalle.delete()
    
    # Recalcular totales
    venta.calcular_totales()
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='eliminar_detalle',
        usuario=usuario,
        descripcion=f"Eliminado: {datos_anteriores['descripcion']} x{datos_anteriores['cantidad']}",
        datos_anteriores=datos_anteriores
    )


@transaction.atomic
def modificar_cantidad_detalle(detalle_id, nueva_cantidad, usuario):
    """
    Modifica la cantidad de un detalle en una venta pendiente
    """
    detalle = DetalleVenta.objects.get(pk=detalle_id)
    venta = detalle.venta
    
    if venta.estado != 'pendiente':
        raise ValidationError("Solo se pueden editar ventas pendientes")
    
    cantidad_anterior = detalle.cantidad
    detalle.cantidad = nueva_cantidad
    detalle.save()
    
    # Recalcular totales
    venta.calcular_totales()
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='modificar_detalle',
        usuario=usuario,
        descripcion=f"Cantidad modificada: {detalle.descripcion} de {cantidad_anterior} a {nueva_cantidad}",
        datos_anteriores={'cantidad': str(cantidad_anterior)},
        datos_nuevos={'cantidad': str(nueva_cantidad)}
    )


@transaction.atomic
def aplicar_descuento_venta(venta, descuento, usuario, motivo=''):
    """
    Aplica un descuento a una venta
    """
    if venta.estado not in ['pendiente', 'pagado']:
        raise ValidationError("No se puede aplicar descuento a esta venta")
    
    descuento_anterior = venta.descuento
    venta.descuento = descuento
    venta.calcular_totales()
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='aplicar_descuento',
        usuario=usuario,
        descripcion=f"Descuento aplicado: ${descuento}. Motivo: {motivo}",
        datos_anteriores={'descuento': str(descuento_anterior)},
        datos_nuevos={'descuento': str(descuento), 'motivo': motivo}
    )


# =============================================================================
# PROCESAMIENTO DE PAGOS Y DESCUENTO DE STOCK
# =============================================================================

@transaction.atomic
def procesar_pago(venta, usuario, metodo_pago, sesion_caja=None):
    """
    Confirma el pago de una venta y descuenta el stock de insumos
    
    REGLA CRÍTICA: El stock solo se descuenta aquí, nunca antes
    """
    if venta.estado != 'pendiente':
        raise ValidationError("Esta venta ya fue procesada o cancelada")
    
    # Verificar sesión de caja abierta
    if sesion_caja and sesion_caja.esta_cerrada:
        raise ValidationError("La sesión de caja está cerrada")
    
    # Marcar como pagado
    venta.estado = 'pagado'
    venta.metodo_pago = metodo_pago
    venta.fecha_pago = timezone.now()
    venta.usuario_cobro = usuario
    venta.sesion = sesion_caja
    venta.save()
    
    # DESCONTAR STOCK de insumos
    for detalle in venta.detalles.filter(tipo='insumo'):
        if detalle.insumo and not detalle.stock_descontado:
            descontar_stock_insumo(detalle)
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='confirmar_pago',
        usuario=usuario,
        descripcion=f"Pago confirmado - Método: {venta.get_metodo_pago_display()} - Total: ${venta.total}",
        datos_nuevos={
            'metodo_pago': metodo_pago,
            'total': str(venta.total),
            'sesion_id': sesion_caja.id if sesion_caja else None
        }
    )
    
    return venta


def descontar_stock_insumo(detalle_venta):
    """
    Descuenta el stock de un insumo
    Se ejecuta solo cuando el pago es confirmado
    """
    if detalle_venta.stock_descontado:
        raise ValidationError("El stock ya fue descontado para este detalle")
    
    insumo = detalle_venta.insumo
    cantidad = int(detalle_venta.cantidad)
    
    # Verificar stock disponible
    if insumo.stock_actual < cantidad:
        raise ValidationError(
            f"Stock insuficiente para {insumo.medicamento}. "
            f"Disponible: {insumo.stock_actual}, Requerido: {cantidad}"
        )
    
    # Descontar
    insumo.stock_actual -= cantidad
    insumo.ultimo_movimiento = timezone.now()
    insumo.tipo_ultimo_movimiento = 'salida'
    insumo.save()
    
    # Marcar como descontado
    detalle_venta.stock_descontado = True
    detalle_venta.fecha_descuento_stock = timezone.now()
    detalle_venta.save()


@transaction.atomic
def cancelar_venta(venta, usuario, motivo=''):
    """
    Cancela una venta
    Si ya estaba pagada, reintegra el stock
    """
    if venta.estado == 'cancelado':
        raise ValidationError("Esta venta ya está cancelada")
    
    estado_anterior = venta.estado
    
    # Si estaba pagada, reintegrar stock
    if estado_anterior == 'pagado':
        for detalle in venta.detalles.filter(tipo='insumo', stock_descontado=True):
            if detalle.insumo:
                detalle.insumo.stock_actual += int(detalle.cantidad)
                detalle.insumo.save()
                detalle.stock_descontado = False
                detalle.save()
    
    # Cancelar
    venta.estado = 'cancelado'
    venta.save()
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='cancelar_venta',
        usuario=usuario,
        descripcion=f"Venta cancelada. Motivo: {motivo}",
        datos_anteriores={'estado': estado_anterior},
        datos_nuevos={'estado': 'cancelado', 'motivo': motivo}
    )


# =============================================================================
# SESIONES DE CAJA
# =============================================================================

@transaction.atomic
def abrir_sesion_caja(usuario, monto_inicial=0, observaciones=''):
    """
    Abre una nueva sesión de caja
    """
    # Verificar que no haya otra sesión abierta
    sesion_abierta = SesionCaja.objects.filter(esta_cerrada=False).first()
    if sesion_abierta:
        raise ValidationError(
            f"Ya existe una sesión abierta desde {sesion_abierta.fecha_apertura.strftime('%d/%m/%Y %H:%M')}"
        )
    
    # Crear sesión
    sesion = SesionCaja.objects.create(
        usuario_apertura=usuario,
        monto_inicial=monto_inicial,
        observaciones_apertura=observaciones
    )
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        sesion=sesion,
        accion='abrir_sesion',
        usuario=usuario,
        descripcion=f"Sesión abierta con monto inicial de ${monto_inicial}",
        datos_nuevos={'monto_inicial': str(monto_inicial)}
    )
    
    return sesion


@transaction.atomic
def cerrar_sesion_caja(sesion, usuario, monto_contado, observaciones=''):
    """
    Cierra una sesión de caja y genera el reporte
    """
    if sesion.esta_cerrada:
        raise ValidationError("Esta sesión ya está cerrada")
    
    # Verificar que no haya ventas pendientes
    ventas_pendientes = sesion.ventas.filter(estado='pendiente').count()
    if ventas_pendientes > 0:
        raise ValidationError(
            f"No se puede cerrar la sesión. Hay {ventas_pendientes} cobro(s) pendiente(s)"
        )
    
    # Cerrar sesión
    sesion.cerrar_sesion(usuario, monto_contado, observaciones)
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        sesion=sesion,
        accion='cerrar_sesion',
        usuario=usuario,
        descripcion=f"Sesión cerrada. Diferencia: ${sesion.diferencia}",
        datos_nuevos={
            'monto_final_calculado': str(sesion.monto_final_calculado),
            'monto_final_contado': str(sesion.monto_final_contado),
            'diferencia': str(sesion.diferencia)
        }
    )
    
    return sesion


# =============================================================================
# REPORTES
# =============================================================================

def generar_reporte_sesion(sesion):
    """
    Genera un reporte completo de una sesión de caja
    """
    from django.db.models import Sum, Count, Q
    
    ventas_pagadas = sesion.ventas.filter(estado='pagado')
    
    reporte = {
        'sesion': {
            'id': sesion.id,
            'fecha_apertura': sesion.fecha_apertura,
            'fecha_cierre': sesion.fecha_cierre,
            'usuario_apertura': sesion.usuario_apertura.nombre_completo,
            'usuario_cierre': sesion.usuario_cierre.nombre_completo if sesion.usuario_cierre else None,
            'monto_inicial': sesion.monto_inicial,
            'monto_final_calculado': sesion.monto_final_calculado,
            'monto_final_contado': sesion.monto_final_contado,
            'diferencia': sesion.diferencia,
        },
        'resumen': {
            'total_vendido': ventas_pagadas.aggregate(Sum('total'))['total__sum'] or Decimal('0'),
            'cantidad_ventas': ventas_pagadas.count(),
            'ventas_con_paciente': ventas_pagadas.exclude(paciente__isnull=True).count(),
            'ventas_sin_paciente': ventas_pagadas.filter(paciente__isnull=True).count(),
        },
        'medios_pago': {},
        'ventas': [],
        'insumos_consumidos': [],
        'auditoria': []
    }
    
    # Resumen por medio de pago
    for metodo, _ in Venta.METODO_PAGO_CHOICES:
        total = ventas_pagadas.filter(metodo_pago=metodo).aggregate(Sum('total'))['total__sum'] or Decimal('0')
        cantidad = ventas_pagadas.filter(metodo_pago=metodo).count()
        if cantidad > 0:
            reporte['medios_pago'][metodo] = {
                'total': total,
                'cantidad': cantidad
            }
    
    # Detalle de ventas
    for venta in ventas_pagadas:
        reporte['ventas'].append({
            'numero': venta.numero_venta,
            'paciente': venta.paciente.nombre if venta.paciente else 'Venta Libre',
            'tipo_origen': venta.get_tipo_origen_display(),
            'total': venta.total,
            'metodo_pago': venta.get_metodo_pago_display(),
            'fecha_pago': venta.fecha_pago,
        })
    
    # Insumos consumidos
    from django.db.models import F
    insumos_consumidos = DetalleVenta.objects.filter(
        venta__in=ventas_pagadas,
        tipo='insumo',
        stock_descontado=True
    ).values(
        'insumo__medicamento'
    ).annotate(
        cantidad_total=Sum('cantidad'),
        valor_total=Sum(F('cantidad') * F('precio_unitario'))
    ).order_by('-cantidad_total')
    
    for item in insumos_consumidos:
        reporte['insumos_consumidos'].append({
            'insumo': item['insumo__medicamento'],
            'cantidad': item['cantidad_total'],
            'valor_total': item['valor_total']
        })
    
    # Auditoría
    auditorias = AuditoriaCaja.objects.filter(
        Q(sesion=sesion) | Q(venta__sesion=sesion)
    ).select_related('usuario')[:50]  # Últimas 50
    
    for auditoria in auditorias:
        reporte['auditoria'].append({
            'fecha': auditoria.fecha,
            'usuario': auditoria.usuario.nombre_completo,
            'accion': auditoria.get_accion_display(),
            'descripcion': auditoria.descripcion
        })
    
    return reporte


def obtener_sesion_activa():
    """
    Retorna la sesión de caja activa o None
    """
    return SesionCaja.objects.filter(esta_cerrada=False).first()


def obtener_cobros_pendientes(sesion=None, paciente=None):
    """
    Obtiene los cobros pendientes
    Puede filtrar por sesión o paciente
    """
    queryset = Venta.objects.filter(estado='pendiente')
    
    if sesion:
        queryset = queryset.filter(sesion=sesion)
    
    if paciente:
        queryset = queryset.filter(paciente=paciente)
    
    return queryset.select_related('paciente', 'usuario_creacion').prefetch_related('detalles')
