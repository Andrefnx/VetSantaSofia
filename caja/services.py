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
    print(f"\n🔍 Buscando insumos de consulta #{consulta.id}...")
    insumos_consulta = consulta.insumos_detalle.all()
    print(f"   📦 Total ConsultaInsumo encontrados: {insumos_consulta.count()}")
    
    for consulta_insumo in insumos_consulta:
        print(f"\n   💊 Creando DetalleVenta para: {consulta_insumo.insumo.medicamento}")
        print(f"      - Cantidad: {consulta_insumo.cantidad_final}")
        print(f"      - Precio unitario: ${consulta_insumo.insumo.precio_venta or 0}")
        
        detalle = DetalleVenta.objects.create(
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
        print(f"      ✅ DetalleVenta #{detalle.id} creado")
    
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
    Agrega un detalle (servicio o insumo) a una venta pendiente.
    
    RESTRICCIÓN:
    - Solo permite agregar detalles a ventas manuales (venta_libre)
    - NO permite modificar ventas creadas desde clínica (consulta/hospitalización)
    
    Args:
        venta: Venta a modificar
        tipo: 'servicio' o 'insumo'
        item_id: ID del servicio o insumo
        cantidad: Cantidad a agregar
        usuario: Usuario que realiza la modificación
        precio_manual: Precio manual (opcional)
    
    Raises:
        ValidationError: Si la venta no está pendiente o proviene de clínica
    """
    if venta.estado != 'pendiente':
        raise ValidationError("Solo se pueden editar ventas pendientes")
    
    # ⚠️ PROTECCIÓN: No permitir agregar detalles a ventas de clínica
    if venta.tipo_origen in ['consulta', 'hospitalizacion']:
        raise ValidationError(
            f"No se pueden agregar detalles a una venta creada desde {venta.get_tipo_origen_display()}. "
            f"Los detalles fueron establecidos en el módulo clínico y no deben modificarse. "
            f"Si necesita ajustar los items, edite la consulta/hospitalización directamente."
        )
    
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
    Elimina un detalle de una venta pendiente.
    
    RESTRICCIÓN:
    - Solo permite eliminar detalles de ventas manuales (venta_libre)
    - NO permite modificar ventas creadas desde clínica
    """
    detalle = DetalleVenta.objects.get(pk=detalle_id)
    venta = detalle.venta
    
    if venta.estado != 'pendiente':
        raise ValidationError("Solo se pueden editar ventas pendientes")
    
    # ⚠️ PROTECCIÓN: No permitir eliminar detalles de ventas de clínica
    if venta.tipo_origen in ['consulta', 'hospitalizacion']:
        raise ValidationError(
            f"No se pueden eliminar detalles de una venta creada desde {venta.get_tipo_origen_display()}. "
            f"Los detalles fueron establecidos en el módulo clínico."
        )
    
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
    Modifica la cantidad de un detalle en una venta pendiente.
    
    RESTRICCIÓN:
    - Solo permite modificar cantidades en ventas manuales (venta_libre)
    - NO permite modificar ventas creadas desde clínica
    """
    detalle = DetalleVenta.objects.get(pk=detalle_id)
    venta = detalle.venta
    
    if venta.estado != 'pendiente':
        raise ValidationError("Solo se pueden editar ventas pendientes")
    
    # ⚠️ PROTECCIÓN: No permitir modificar cantidades de ventas de clínica
    if venta.tipo_origen in ['consulta', 'hospitalizacion']:
        raise ValidationError(
            f"No se pueden modificar cantidades de una venta creada desde {venta.get_tipo_origen_display()}. "
            f"Las cantidades fueron calculadas en el módulo clínico."
        )
    
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
    Confirma el pago de una venta y descuenta el stock de insumos.
    
    REGLA CRÍTICA: El stock solo se descuenta aquí, nunca antes.
    
    FLUJO ATÓMICO (TODO O NADA):
    1. Valida estado de la venta
    2. Valida sesión de caja
    3. Valida total calculado (si origen clínica)
    4. Valida que existan detalles
    5. Descuenta stock de insumos (solo los no descontados)
    6. Marca la venta como pagada (AL FINAL)
    7. Registra auditoría
    
    IMPORTANTE:
    - Si falla el descuento de stock → NO queda pagada (rollback)
    - NO sincroniza con consulta.insumos_descontados (campo deprecado)
    - Usa solo DetalleVenta.stock_descontado como fuente de verdad
    
    Args:
        venta: Instancia de Venta a procesar
        usuario: Usuario que confirma el pago
        metodo_pago: Método de pago usado
        sesion_caja: Sesión de caja activa (opcional)
    
    Returns:
        Venta procesada
    
    Raises:
        ValidationError: Si la venta ya fue procesada, sesión cerrada, o stock insuficiente
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"=" * 80)
    logger.info(f"🔵 PROCESANDO PAGO - Venta #{venta.numero_venta}")
    logger.info(f"=" * 80)
    logger.info(f"📋 Venta ID: {venta.id}")
    logger.info(f"📍 Origen: {venta.get_tipo_origen_display()}")
    logger.info(f"💰 Total: ${venta.total}")
    logger.info(f"💳 Método: {metodo_pago}")
    logger.info(f"👤 Usuario: {usuario.username}")
    
    # ==========================================================================
    # VALIDACIÓN 1: Estado de la venta
    # ==========================================================================
    if venta.estado != 'pendiente':
        logger.error(f"❌ Venta ya procesada: estado={venta.estado}")
        raise ValidationError(
            f"Esta venta ya fue {venta.get_estado_display().lower()}. "
            f"No se puede procesar nuevamente."
        )
    
    # ==========================================================================
    # VALIDACIÓN 2: Sesión de caja
    # ==========================================================================
    if sesion_caja and sesion_caja.esta_cerrada:
        logger.error(f"❌ Sesión de caja cerrada: sesion_id={sesion_caja.id}")
        raise ValidationError("La sesión de caja está cerrada")
    
    # ==========================================================================
    # VALIDACIÓN 3: Total calculado (para ventas de clínica)
    # ==========================================================================
    if venta.tipo_origen == 'consulta' and venta.consulta:
        if not venta.consulta.total_calculado:
            logger.error(
                f"❌ Consulta sin total calculado: consulta_id={venta.consulta.id}"
            )
            raise ValidationError(
                f"La consulta #{venta.consulta.id} no tiene el total calculado. "
                f"Finalice la consulta en el módulo clínico antes de cobrar."
            )
        
        # Validar que los totales coincidan
        if venta.total != venta.consulta.total_congelado:
            logger.error(
                f"❌ Totales no coinciden: venta=${venta.total} vs consulta=${venta.consulta.total_congelado}"
            )
            raise ValidationError(
                f"El total de la venta (${venta.total}) no coincide con el total "
                f"congelado de la consulta (${venta.consulta.total_congelado}). "
                f"Contacte al administrador."
            )
        
        logger.info(f"✅ Consulta validada: total_congelado=${venta.consulta.total_congelado}")
    
    elif venta.tipo_origen == 'hospitalizacion' and venta.hospitalizacion:
        if not venta.hospitalizacion.total_calculado:
            logger.error(
                f"❌ Hospitalización sin total calculado: hosp_id={venta.hospitalizacion.id}"
            )
            raise ValidationError(
                f"La hospitalización #{venta.hospitalizacion.id} no tiene el total calculado. "
                f"Finalice la hospitalización antes de cobrar."
            )
        
        if venta.total != venta.hospitalizacion.total_congelado:
            logger.error(
                f"❌ Totales no coinciden: venta=${venta.total} vs hosp=${venta.hospitalizacion.total_congelado}"
            )
            raise ValidationError(
                f"El total de la venta no coincide con el total congelado. "
                f"Contacte al administrador."
            )
        
        logger.info(f"✅ Hospitalización validada: total_congelado=${venta.hospitalizacion.total_congelado}")
    
    # ==========================================================================
    # VALIDACIÓN 4: Verificar que existan detalles
    # ==========================================================================
    if not venta.detalles.exists():
        logger.error(f"❌ Venta sin detalles: venta_id={venta.id}")
        raise ValidationError(
            f"La venta {venta.numero_venta} no tiene servicios ni insumos. "
            f"No se puede procesar el pago."
        )
    
    logger.info(f"✅ Venta tiene {venta.detalles.count()} detalle(s)")
    
    # ==========================================================================
    # PASO 1: DESCONTAR STOCK de insumos (solo los no descontados)
    # ==========================================================================
    # IMPORTANTE: Descuento ANTES de marcar como pagada
    # Si falla, la transacción hace rollback y NO queda pagada
    logger.info(f"\n📦 Procesando descuento de stock...")
    
    # Obtener todos los detalles de insumos
    detalles_insumos = venta.detalles.filter(tipo='insumo')
    total_detalles = detalles_insumos.count()
    logger.info(f"📊 Total de insumos en venta: {total_detalles}")
    
    # Filtrar los que ya fueron descontados
    detalles_ya_descontados = detalles_insumos.filter(stock_descontado=True)
    ya_descontados_count = detalles_ya_descontados.count()
    
    if ya_descontados_count > 0:
        logger.warning(
            f"⚠️  {ya_descontados_count} insumo(s) ya tienen stock descontado (se omitirán)"
        )
        for det in detalles_ya_descontados:
            logger.warning(
                f"   - {det.descripcion}: descontado el {det.fecha_descuento_stock}"
            )
    
    # Procesar solo los pendientes
    detalles_pendientes = detalles_insumos.filter(stock_descontado=False)
    pendientes_count = detalles_pendientes.count()
    logger.info(f"📉 Insumos pendientes de descuento: {pendientes_count}")
    
    insumos_descontados = []
    errores = []
    
    for detalle in detalles_pendientes:
        if not detalle.insumo:
            logger.warning(
                f"⚠️  Detalle #{detalle.id} ({detalle.descripcion}) no tiene insumo asociado - omitiendo"
            )
            continue
        
        try:
            logger.info(f"\n  🔹 Procesando: {detalle.insumo.medicamento}")
            logger.info(f"     Cantidad: {detalle.cantidad}")
            logger.info(f"     Stock actual: {detalle.insumo.stock_actual}")
            
            descontar_stock_insumo(detalle)
            
            insumos_descontados.append({
                'insumo': detalle.insumo.medicamento,
                'cantidad': detalle.cantidad,
                'stock_final': detalle.insumo.stock_actual
            })
            
            logger.info(f"     ✅ Descontado - Stock final: {detalle.insumo.stock_actual}")
            
        except ValidationError as ve:
            error_msg = f"{detalle.insumo.medicamento}: {str(ve)}"
            errores.append(error_msg)
            logger.error(f"     ❌ Error: {str(ve)}")
    
    # Si hubo errores, hacer rollback
    if errores:
        logger.error(f"\n❌ ERRORES EN DESCUENTO DE STOCK:")
        for error in errores:
            logger.error(f"   - {error}")
        raise ValidationError(
            f"Error al descontar stock: {'; '.join(errores)}"
        )
    
    logger.info(f"\n✅ Stock descontado exitosamente: {len(insumos_descontados)} insumo(s)")
    
    # ==========================================================================
    # PASO 2: Marcar como pagada (AL FINAL, después de descuento exitoso)
    # ==========================================================================
    # CRÍTICO: Solo se marca como pagada si el descuento fue exitoso
    # Si falló el descuento, la transacción hace rollback y NO se marca
    logger.info(f"\n📝 Marcando venta como pagada...")
    
    fecha_pago = timezone.now()
    venta.estado = 'pagado'
    venta.metodo_pago = metodo_pago
    venta.fecha_pago = fecha_pago
    venta.usuario_cobro = usuario
    venta.sesion = sesion_caja
    venta.save(update_fields=['estado', 'metodo_pago', 'fecha_pago', 'usuario_cobro', 'sesion'])
    
    logger.info(f"✅ Venta marcada como pagada: {venta.numero_venta}")
    logger.info(f"   Método: {venta.get_metodo_pago_display()}")
    logger.info(f"   Fecha: {fecha_pago.strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info(f"   Usuario: {usuario.username}")
    
    # ==========================================================================
    # PASO 3: Registrar auditoría
    # ==========================================================================
    # NOTA: NO sincronizamos con consulta.insumos_descontados (campo deprecado)
    # La fuente de verdad es DetalleVenta.stock_descontado
    logger.info(f"\n📝 Registrando auditoría...")
    
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='confirmar_pago',
        usuario=usuario,
        descripcion=f"Pago confirmado - Método: {venta.get_metodo_pago_display()} - Total: ${venta.total} - Insumos descontados: {len(insumos_descontados)}",
        datos_nuevos={
            'metodo_pago': metodo_pago,
            'total': str(venta.total),
            'sesion_id': sesion_caja.id if sesion_caja else None,
            'insumos_descontados': insumos_descontados
        }
    )
    
    logger.info(f"=" * 80)
    logger.info(f"✅ PAGO PROCESADO EXITOSAMENTE")
    logger.info(f"   Venta: {venta.numero_venta}")
    logger.info(f"   Estado: {venta.get_estado_display()}")
    logger.info(f"   Total: ${venta.total}")
    logger.info(f"   Método: {venta.get_metodo_pago_display()}")
    logger.info(f"   Insumos descontados: {len(insumos_descontados)}")
    logger.info(f"   Fecha/Hora: {venta.fecha_pago.strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info(f"=" * 80)
    logger.info(f"")
    logger.info(f"🔒 TRANSACCIÓN COMPLETADA - Todos los cambios guardados")
    logger.info(f"")
    
    return venta


def descontar_stock_insumo(detalle_venta):
    """
    Descuenta el stock de un insumo desde DetalleVenta.
    
    REGLAS DE SEGURIDAD:
    1. Solo se ejecuta cuando el pago es confirmado
    2. Verifica que no se haya descontado previamente (flag stock_descontado)
    3. Valida stock suficiente ANTES de descontar
    4. Usa transacción atómica para garantizar consistencia
    5. Marca el detalle como descontado DESPUÉS de descontar
    
    IMPORTANTE:
    - NO descontar si stock_descontado == True
    - NO permitir stock negativo
    - Registrar fecha exacta del descuento
    
    Args:
        detalle_venta: Instancia de DetalleVenta con el insumo a descontar
    
    Raises:
        ValidationError: Si ya descontado, sin insumo, o stock insuficiente
    """
    from django.db import transaction
    import logging
    logger = logging.getLogger(__name__)
    
    # ==========================================================================
    # VALIDACIÓN 1: Verificar que no se haya descontado previamente
    # ==========================================================================
    if detalle_venta.stock_descontado:
        logger.error(
            f"❌ Intento de doble descuento - DetalleVenta #{detalle_venta.id}: "
            f"{detalle_venta.descripcion} - Ya descontado el {detalle_venta.fecha_descuento_stock}"
        )
        raise ValidationError(
            f"El stock del insumo '{detalle_venta.descripcion}' ya fue descontado "
            f"el {detalle_venta.fecha_descuento_stock.strftime('%d/%m/%Y %H:%M')}. "
            f"No se puede descontar nuevamente."
        )
    
    # ==========================================================================
    # VALIDACIÓN 2: Verificar que tenga insumo asociado
    # ==========================================================================
    if not detalle_venta.insumo:
        logger.error(
            f"❌ DetalleVenta #{detalle_venta.id} no tiene insumo asociado: {detalle_venta.descripcion}"
        )
        raise ValidationError(
            f"El detalle '{detalle_venta.descripcion}' no tiene un insumo asociado. "
            f"No se puede descontar stock."
        )
    
    insumo = detalle_venta.insumo
    cantidad = int(detalle_venta.cantidad)
    
    logger.debug(
        f"🔍 Validando descuento: {insumo.medicamento} - "
        f"Cantidad a descontar: {cantidad} - Stock actual: {insumo.stock_actual}"
    )
    
    # ==========================================================================
    # VALIDACIÓN 3: Verificar stock disponible
    # ==========================================================================
    if insumo.stock_actual < cantidad:
        logger.error(
            f"❌ Stock insuficiente para {insumo.medicamento} - "
            f"Requerido: {cantidad}, Disponible: {insumo.stock_actual}"
        )
        raise ValidationError(
            f"Stock insuficiente para '{insumo.medicamento}'. "
            f"Requerido: {cantidad}, Disponible: {insumo.stock_actual}. "
            f"Registre nuevos ingresos de inventario antes de procesar el pago."
        )
    
    # ==========================================================================
    # DESCUENTO ATÓMICO: Stock + Flags
    # ==========================================================================
    with transaction.atomic():
        # Guardar valores anteriores para logging
        stock_anterior = insumo.stock_actual
        
        # Descontar stock
        insumo.stock_actual -= cantidad
        insumo.ultimo_movimiento = timezone.now()
        insumo.tipo_ultimo_movimiento = 'salida'
        insumo.save(update_fields=['stock_actual', 'ultimo_movimiento', 'tipo_ultimo_movimiento'])
        
        logger.debug(
            f"📉 Stock descontado: {insumo.medicamento} - "
            f"{stock_anterior} → {insumo.stock_actual} (descontado: {cantidad})"
        )
        
        # Marcar como descontado
        detalle_venta.stock_descontado = True
        detalle_venta.fecha_descuento_stock = timezone.now()
        detalle_venta.save(update_fields=['stock_descontado', 'fecha_descuento_stock'])
        
        logger.debug(
            f"✅ DetalleVenta #{detalle_venta.id} marcado como stock_descontado=True"
        )
    
    logger.info(
        f"✅ Descuento exitoso: {insumo.medicamento} - "
        f"Cantidad: {cantidad} - Stock final: {insumo.stock_actual}"
    )


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
