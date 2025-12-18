"""
Vistas para el sistema extendido de caja con cobros pendientes
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.core.exceptions import ValidationError
from decimal import Decimal
import json

from .models import SesionCaja, Venta, DetalleVenta, AuditoriaCaja
from .services import (
    abrir_sesion_caja,
    cerrar_sesion_caja,
    obtener_sesion_activa,
    obtener_cobros_pendientes,
    crear_venta_libre,
    agregar_detalle_venta,
    eliminar_detalle_venta,
    modificar_cantidad_detalle,
    aplicar_descuento_venta,
    procesar_pago,
    cancelar_venta,
    generar_reporte_sesion,
)
from clinica.models import Consulta, Hospitalizacion
from pacientes.models import Paciente
from servicios.models import Servicio
from inventario.models import Insumo


# =============================================================================
# PERMISOS
# =============================================================================

def es_admin_o_recepcion(user):
    """Verifica que el usuario sea admin o recepción"""
    return user.is_staff or user.rol in ['administracion', 'recepcion']


# =============================================================================
# DASHBOARD DE CAJA
# =============================================================================

@login_required
@user_passes_test(es_admin_o_recepcion)
def dashboard_caja(request):
    """
    Vista principal del sistema de caja
    Muestra sesión activa, cobros pendientes, etc.
    """
    sesion_activa = obtener_sesion_activa()
    cobros_pendientes = obtener_cobros_pendientes(sesion=sesion_activa)
    
    context = {
        'sesion_activa': sesion_activa,
        'cobros_pendientes': cobros_pendientes,
        'puede_abrir_caja': not sesion_activa,
        'puede_cerrar_caja': sesion_activa is not None,
    }
    
    return render(request, 'caja/dashboard_caja.html', context)


# =============================================================================
# SESIONES DE CAJA
# =============================================================================

@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["GET", "POST"])
def abrir_caja(request):
    """Abre una nueva sesión de caja"""
    if request.method == 'POST':
        try:
            monto_inicial = Decimal(request.POST.get('monto_inicial', '0'))
            observaciones = request.POST.get('observaciones', '')
            
            sesion = abrir_sesion_caja(
                usuario=request.user,
                monto_inicial=monto_inicial,
                observaciones=observaciones
            )
            
            return JsonResponse({
                'success': True,
                'sesion_id': sesion.id,
                'mensaje': 'Sesión de caja abierta exitosamente'
            })
        except ValidationError as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f"Error al abrir sesión: {str(e)}"
            }, status=500)
    
    # GET: Mostrar formulario de apertura
    return render(request, 'caja/abrir_caja.html')


@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["GET", "POST"])
def cerrar_caja(request, sesion_id):
    """Cierra una sesión de caja"""
    sesion = get_object_or_404(SesionCaja, pk=sesion_id, esta_cerrada=False)
    
    if request.method == 'POST':
        try:
            monto_contado = Decimal(request.POST.get('monto_contado'))
            observaciones = request.POST.get('observaciones', '')
            
            cerrar_sesion_caja(
                sesion=sesion,
                usuario=request.user,
                monto_contado=monto_contado,
                observaciones=observaciones
            )
            
            return JsonResponse({
                'success': True,
                'mensaje': 'Sesión cerrada exitosamente',
                'diferencia': str(sesion.diferencia)
            })
        except ValidationError as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f"Error al cerrar sesión: {str(e)}"
            }, status=500)
    
    # GET: Mostrar formulario de cierre
    reporte_previo = generar_reporte_sesion(sesion)
    
    context = {
        'sesion': sesion,
        'reporte': reporte_previo,
    }
    
    return render(request, 'caja/cerrar_caja.html', context)


# =============================================================================
# COBROS PENDIENTES
# =============================================================================

@login_required
@user_passes_test(es_admin_o_recepcion)
def lista_cobros_pendientes(request):
    """Lista todos los cobros pendientes"""
    cobros = obtener_cobros_pendientes()
    
    # Filtro opcional por paciente
    paciente_id = request.GET.get('paciente')
    if paciente_id:
        cobros = cobros.filter(paciente_id=paciente_id)
    
    context = {
        'cobros': cobros,
        'total_pendiente': sum(c.total for c in cobros),
    }
    
    return render(request, 'caja/lista_cobros_pendientes.html', context)


@login_required
@user_passes_test(es_admin_o_recepcion)
def detalle_cobro_pendiente(request, venta_id):
    """
    Muestra el detalle de un cobro pendiente
    Permite editar (agregar/quitar items, descuentos)
    """
    venta = get_object_or_404(Venta, pk=venta_id, estado='pendiente')
    
    context = {
        'venta': venta,
        'detalles': venta.detalles.all(),
        'puede_editar': True,
        'servicios_disponibles': Servicio.objects.all(),
        'insumos_disponibles': Insumo.objects.filter(stock_actual__gt=0),
    }
    
    return render(request, 'caja/detalle_cobro_pendiente.html', context)


@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["GET"])
def api_cobros_pendientes(request):
    """
    API: Retorna cobros pendientes en formato JSON para cargar en el carrito de caja
    """
    cobros = obtener_cobros_pendientes()
    
    # Filtro opcional por paciente
    paciente_id = request.GET.get('paciente')
    if paciente_id:
        cobros = cobros.filter(paciente_id=paciente_id)
    
    # Serializar cobros con sus detalles
    cobros_data = []
    for venta in cobros:
        detalles_data = []
        for detalle in venta.detalles.all():
            detalles_data.append({
                'id': detalle.id,
                'tipo': detalle.tipo,
                'descripcion': detalle.descripcion,
                'cantidad': float(detalle.cantidad),
                'precio_unitario': float(detalle.precio_unitario),
                'subtotal': float(detalle.subtotal),
            })
        
        cobros_data.append({
            'id': venta.id,
            'numero_venta': venta.numero_venta,
            'tipo_origen': venta.tipo_origen,
            'tipo_origen_display': venta.get_tipo_origen_display(),
            'paciente': venta.paciente.nombre if venta.paciente else 'Sin paciente',
            'paciente_id': venta.paciente.id if venta.paciente else None,
            'subtotal_servicios': float(venta.subtotal_servicios),
            'subtotal_insumos': float(venta.subtotal_insumos),
            'descuento': float(venta.descuento),
            'total': float(venta.total),
            'fecha_creacion': venta.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
            'detalles': detalles_data,
        })
    
    return JsonResponse({
        'success': True,
        'cobros': cobros_data,
        'total_cobros': len(cobros_data),
    })


@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["POST"])
def marcar_cobro_en_proceso(request, venta_id):
    """
    Marca un cobro pendiente como 'en_proceso' cuando se carga en la caja
    Esto lo saca de la lista de Pagos Pendientes temporalmente
    """
    try:
        venta = Venta.objects.get(id=venta_id, estado='pendiente')
        
        # Cambiar estado a 'en_proceso' (temporal mientras está en caja)
        venta.estado = 'en_proceso'
        venta.save(update_fields=['estado'])
        
        # Registrar auditoría
        AuditoriaCaja.objects.create(
            venta=venta,
            accion='cargar_en_caja',
            usuario=request.user,
            descripcion=f"Cobro cargado en caja para procesar"
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Cobro {venta.numero_venta} cargado en caja'
        })
        
    except Venta.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Cobro no encontrado o ya no está pendiente'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["POST"])
def devolver_cobro_a_pendiente(request, venta_id):
    """
    Devuelve un cobro de 'en_proceso' a 'pendiente' (guardar como borrador)
    Actualiza los detalles de la venta con los cambios realizados en el carrito
    """
    try:
        data = json.loads(request.body)
        items = data.get('items', [])
        
        venta = Venta.objects.get(id=venta_id, estado='en_proceso')
        
        with transaction.atomic():
            # Si se enviaron items, actualizar los detalles de la venta
            if items:
                # Eliminar detalles anteriores
                venta.detalles.all().delete()
                
                # Crear nuevos detalles con los items actuales del carrito
                subtotal_total = Decimal('0.00')
                
                for item in items:
                    nombre = item['name']
                    cantidad = Decimal(str(item['quantity']))
                    precio_unitario = Decimal(str(item['price']))
                    subtotal = cantidad * precio_unitario
                    
                    # Determinar si es servicio o insumo
                    servicio = None
                    insumo = None
                    tipo = 'insumo'
                    
                    try:
                        servicio = Servicio.objects.get(nombre=nombre)
                        tipo = 'servicio'
                    except Servicio.DoesNotExist:
                        try:
                            insumo = Insumo.objects.get(medicamento=nombre)
                            tipo = 'insumo'
                        except Insumo.DoesNotExist:
                            pass
                    
                    # Crear detalle de venta
                    DetalleVenta.objects.create(
                        venta=venta,
                        tipo=tipo,
                        servicio=servicio,
                        insumo=insumo,
                        descripcion=nombre,
                        cantidad=cantidad,
                        precio_unitario=precio_unitario,
                        subtotal=subtotal
                    )
                    
                    subtotal_total += subtotal
                
                # Actualizar totales de la venta
                venta.total = subtotal_total
                
                # Calcular subtotales por tipo
                subtotal_servicios = Decimal('0.00')
                subtotal_insumos = Decimal('0.00')
                
                for detalle in venta.detalles.all():
                    if detalle.tipo == 'servicio':
                        subtotal_servicios += detalle.subtotal
                    else:
                        subtotal_insumos += detalle.subtotal
                
                venta.subtotal_servicios = subtotal_servicios
                venta.subtotal_insumos = subtotal_insumos
            
            # Cambiar estado de vuelta a 'pendiente'
            venta.estado = 'pendiente'
            venta.save()
            
            # Registrar auditoría
            AuditoriaCaja.objects.create(
                venta=venta,
                accion='devolver_a_pendiente',
                usuario=request.user,
                descripcion=f"Cobro devuelto a pendiente desde caja (borrador actualizado)"
            )
        
        return JsonResponse({
            'success': True,
            'message': f'Cobro {venta.numero_venta} devuelto a pagos pendientes'
        })
        
    except Venta.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Cobro no encontrado o no está en proceso'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["POST", "DELETE"])
def eliminar_cobro_pendiente(request, venta_id):
    """
    Elimina/cancela un cobro pendiente (cambia estado a 'cancelado')
    Solo se pueden eliminar ventas con estado 'pendiente'
    """
    try:
        venta = Venta.objects.get(id=venta_id, estado='pendiente')
        
        # Cambiar estado a cancelado
        venta.estado = 'cancelado'
        venta.save(update_fields=['estado'])
        
        # Registrar auditoría
        AuditoriaCaja.objects.create(
            venta=venta,
            accion='cancelar_venta',
            usuario=request.user,
            descripcion=f"Cobro pendiente cancelado manualmente desde caja"
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Cobro {venta.numero_venta} cancelado exitosamente'
        })
        
    except Venta.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Cobro no encontrado o ya no está pendiente'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["POST"])
def guardar_borrador(request):
    """
    Guarda el carrito actual como un cobro pendiente (borrador)
    Crea una venta con estado 'pendiente' desde los items del carrito
    """
    try:
        data = json.loads(request.body)
        items = data.get('items', [])
        cliente = data.get('cliente', '')
        
        if not items:
            return JsonResponse({
                'success': False,
                'error': 'El carrito está vacío'
            }, status=400)
        
        with transaction.atomic():
            # Crear venta pendiente
            venta = Venta.objects.create(
                tipo_origen='venta_libre',
                usuario_creacion=request.user,
                estado='pendiente'
            )
            
            # Crear detalles de venta
            subtotal_total = Decimal('0.00')
            
            for item in items:
                nombre = item['name']
                cantidad = Decimal(str(item['quantity']))
                precio_unitario = Decimal(str(item['price']))
                subtotal = cantidad * precio_unitario
                
                # Determinar si es servicio o insumo
                servicio = None
                insumo = None
                tipo = 'insumo'
                
                try:
                    servicio = Servicio.objects.get(nombre=nombre)
                    tipo = 'servicio'
                except Servicio.DoesNotExist:
                    try:
                        insumo = Insumo.objects.get(medicamento=nombre)
                        tipo = 'insumo'
                    except Insumo.DoesNotExist:
                        pass
                
                # Crear detalle de venta
                DetalleVenta.objects.create(
                    venta=venta,
                    tipo=tipo,
                    servicio=servicio,
                    insumo=insumo,
                    descripcion=nombre,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    subtotal=subtotal
                )
                
                subtotal_total += subtotal
            
            # Actualizar totales de la venta (con IVA incluido)
            venta.total = subtotal_total
            
            # Calcular subtotales por tipo
            subtotal_servicios = Decimal('0.00')
            subtotal_insumos = Decimal('0.00')
            
            for detalle in venta.detalles.all():
                if detalle.tipo == 'servicio':
                    subtotal_servicios += detalle.subtotal
                else:
                    subtotal_insumos += detalle.subtotal
            
            venta.subtotal_servicios = subtotal_servicios
            venta.subtotal_insumos = subtotal_insumos
            venta.save()
            
            # Registrar auditoría
            AuditoriaCaja.objects.create(
                venta=venta,
                accion='crear_venta',
                usuario=request.user,
                descripcion=f"Carrito guardado como borrador (pago pendiente)"
            )
            
            return JsonResponse({
                'success': True,
                'venta_id': venta.id,
                'numero_venta': venta.numero_venta,
                'message': f'Borrador guardado como {venta.numero_venta}'
            })
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


# =============================================================================
# VENTA LIBRE
# =============================================================================

@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["GET", "POST"])
def crear_venta_libre_view(request):
    """Crea una venta libre (sin consulta ni hospitalización)"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            paciente_id = data.get('paciente_id')
            paciente = Paciente.objects.get(pk=paciente_id) if paciente_id else None
            
            items_servicios = data.get('servicios', [])
            items_insumos = data.get('insumos', [])
            observaciones = data.get('observaciones', '')
            
            venta = crear_venta_libre(
                usuario=request.user,
                items_servicios=items_servicios,
                items_insumos=items_insumos,
                paciente=paciente,
                observaciones=observaciones
            )
            
            return JsonResponse({
                'success': True,
                'venta_id': venta.id,
                'numero_venta': venta.numero_venta,
                'total': str(venta.total)
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
    
    # GET: Formulario de venta libre
    context = {
        'servicios': Servicio.objects.all(),
        'insumos': Insumo.objects.filter(stock_actual__gt=0),
        'pacientes': Paciente.objects.filter(activo=True),
    }
    
    return render(request, 'caja/crear_venta_libre.html', context)


# =============================================================================
# EDICIÓN DE VENTAS (AJAX)
# =============================================================================

@csrf_exempt
@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["POST"])
def agregar_item_venta(request, venta_id):
    """Agrega un item (servicio o insumo) a una venta pendiente"""
    try:
        venta = get_object_or_404(Venta, pk=venta_id, estado='pendiente')
        data = json.loads(request.body)
        
        tipo = data.get('tipo')  # 'servicio' o 'insumo'
        item_id = data.get('item_id')
        cantidad = Decimal(data.get('cantidad', 1))
        precio_manual = data.get('precio_manual')
        
        if precio_manual:
            precio_manual = Decimal(precio_manual)
        
        detalle = agregar_detalle_venta(
            venta=venta,
            tipo=tipo,
            item_id=item_id,
            cantidad=cantidad,
            usuario=request.user,
            precio_manual=precio_manual
        )
        
        return JsonResponse({
            'success': True,
            'detalle_id': detalle.id,
            'descripcion': detalle.descripcion,
            'cantidad': str(detalle.cantidad),
            'subtotal': str(detalle.subtotal),
            'total_venta': str(venta.total)
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["POST"])
def eliminar_item_venta(request, detalle_id):
    """Elimina un item de una venta pendiente"""
    try:
        detalle = get_object_or_404(DetalleVenta, pk=detalle_id)
        venta_id = detalle.venta.id
        
        eliminar_detalle_venta(detalle_id, request.user)
        
        venta = Venta.objects.get(pk=venta_id)
        
        return JsonResponse({
            'success': True,
            'total_venta': str(venta.total)
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["POST"])
def modificar_cantidad_item(request, detalle_id):
    """Modifica la cantidad de un item en una venta pendiente"""
    try:
        data = json.loads(request.body)
        nueva_cantidad = Decimal(data.get('cantidad'))
        
        modificar_cantidad_detalle(detalle_id, nueva_cantidad, request.user)
        
        detalle = DetalleVenta.objects.get(pk=detalle_id)
        
        return JsonResponse({
            'success': True,
            'subtotal': str(detalle.subtotal),
            'total_venta': str(detalle.venta.total)
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["POST"])
def aplicar_descuento(request, venta_id):
    """Aplica un descuento a una venta"""
    try:
        venta = get_object_or_404(Venta, pk=venta_id)
        data = json.loads(request.body)
        
        descuento = Decimal(data.get('descuento', 0))
        motivo = data.get('motivo', '')
        
        aplicar_descuento_venta(venta, descuento, request.user, motivo)
        
        return JsonResponse({
            'success': True,
            'total': str(venta.total),
            'descuento': str(venta.descuento)
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


# =============================================================================
# PROCESAMIENTO DE PAGOS
# =============================================================================

@csrf_exempt
@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["POST"])
def confirmar_pago_venta(request, venta_id):
    """
    Confirma el pago de una venta
    AQUÍ SE DESCUENTA EL STOCK
    """
    try:
        venta = get_object_or_404(Venta, pk=venta_id, estado='pendiente')
        data = json.loads(request.body)
        
        metodo_pago = data.get('metodo_pago', 'efectivo')
        sesion_activa = obtener_sesion_activa()
        
        # Procesar pago (descuenta stock automáticamente)
        procesar_pago(
            venta=venta,
            usuario=request.user,
            metodo_pago=metodo_pago,
            sesion_caja=sesion_activa
        )
        
        return JsonResponse({
            'success': True,
            'mensaje': 'Pago confirmado y stock descontado',
            'venta_id': venta.id,
            'numero_venta': venta.numero_venta,
            'total': str(venta.total)
        })
    except ValidationError as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f"Error al procesar pago: {str(e)}"
        }, status=500)


@csrf_exempt
@login_required
@user_passes_test(es_admin_o_recepcion)
@require_http_methods(["POST"])
def cancelar_venta_view(request, venta_id):
    """Cancela una venta (reintegra stock si ya estaba pagada)"""
    try:
        venta = get_object_or_404(Venta, pk=venta_id)
        data = json.loads(request.body)
        motivo = data.get('motivo', 'Sin motivo especificado')
        
        cancelar_venta(venta, request.user, motivo)
        
        return JsonResponse({
            'success': True,
            'mensaje': 'Venta cancelada'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


# =============================================================================
# REPORTES
# =============================================================================

@login_required
@user_passes_test(es_admin_o_recepcion)
def ver_reporte_sesion(request, sesion_id):
    """Muestra el reporte completo de una sesión de caja"""
    sesion = get_object_or_404(SesionCaja, pk=sesion_id)
    reporte = generar_reporte_sesion(sesion)
    
    context = {
        'sesion': sesion,
        'reporte': reporte,
    }
    
    return render(request, 'caja/reporte_sesion.html', context)


@login_required
@user_passes_test(es_admin_o_recepcion)
def historial_sesiones(request):
    """Muestra el historial de todas las sesiones de caja"""
    sesiones = SesionCaja.objects.all().order_by('-fecha_apertura')[:50]
    
    context = {
        'sesiones': sesiones,
    }
    
    return render(request, 'caja/historial_sesiones.html', context)


# =============================================================================
# API PARA AUTOCOMPLETADO / BÚSQUEDA
# =============================================================================

@login_required
def buscar_paciente(request):
    """API para buscar pacientes por nombre"""
    query = request.GET.get('q', '')
    
    if len(query) < 2:
        return JsonResponse({'pacientes': []})
    
    pacientes = Paciente.objects.filter(
        nombre__icontains=query,
        activo=True
    )[:10]
    
    return JsonResponse({
        'pacientes': [
            {
                'id': p.id,
                'nombre': p.nombre,
                'propietario': p.propietario.nombre_completo,
                'especie': p.get_especie_display()
            }
            for p in pacientes
        ]
    })


@login_required
def buscar_servicio(request):
    """API para buscar servicios"""
    query = request.GET.get('q', '')
    
    servicios = Servicio.objects.filter(nombre__icontains=query)[:10]
    
    return JsonResponse({
        'servicios': [
            {
                'id': s.id,
                'nombre': s.nombre,
                'precio': str(s.precio),
                'categoria': s.categoria
            }
            for s in servicios
        ]
    })


@login_required
def buscar_insumo(request):
    """API para buscar insumos disponibles"""
    query = request.GET.get('q', '')
    
    insumos = Insumo.objects.filter(
        medicamento__icontains=query,
        stock_actual__gt=0
    )[:10]
    
    return JsonResponse({
        'insumos': [
            {
                'id': i.id,
                'medicamento': i.medicamento,
                'precio': str(i.precio_venta or 0),
                'stock': i.stock_actual,
                'formato': i.get_formato_display()
            }
            for i in insumos
        ]
    })


# =============================================================================
# IMPRESIÓN DE BOLETA
# =============================================================================

@login_required
@user_passes_test(es_admin_o_recepcion)
def imprimir_boleta(request, venta_id):
    """
    Vista para generar e imprimir la boleta de una venta pagada
    Solo se muestra si la venta está en estado 'pagado'
    """
    venta = get_object_or_404(Venta, id=venta_id, estado='pagado')
    
    # Calcular subtotal neto e IVA (IVA incluido en el precio)
    # Subtotal neto = Total / 1.19
    # IVA = Total - Subtotal neto
    subtotal_neto = round(venta.total / Decimal('1.19'))
    iva_calculado = venta.total - subtotal_neto
    
    # Si hay descuento, calcular el subtotal bruto
    subtotal_bruto = venta.total + venta.descuento if venta.descuento > 0 else venta.total
    
    context = {
        'venta': venta,
        'usuario_actual': request.user,
        'subtotal_neto': subtotal_neto,
        'iva_calculado': iva_calculado,
        'subtotal_bruto': subtotal_bruto,
    }
    
    return render(request, 'caja/boleta.html', context)
