# caja/views.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.db.models import Sum
from django.db import transaction
from django.core.exceptions import ValidationError
from decimal import Decimal

# Importar desde las apps correctas
from inventario.models import Insumo
from servicios.models import Servicio
from .models import Caja, MovimientoCaja
from .forms import AperturaCajaForm, CierreCajaForm

@login_required
def caja(request):
    # Traer todos los productos del inventario
    # Restringir acceso a roles permitidos
    if not (request.user.is_superuser or request.user.is_staff or request.user.rol in ['recepcion', 'administracion']):
        return redirect('dashboard:dashboard')

    productos = Insumo.objects.filter(archivado=False)
    # Traer todos los servicios veterinarios
    servicios = Servicio.objects.filter(activo=True)

    return render(request, 'cash_register.html', {
        'productos': productos,
        'servicios': servicios,
    })

@csrf_exempt
@login_required
def procesar_venta(request):
    """
    Procesa una venta desde la caja registradora
    Crea la venta, agrega detalles, descuenta stock y marca como pagada
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if request.method == 'POST':
        try:
            logger.info("=" * 80)
            logger.info("🛒 PROCESAR VENTA - Inicio")
            logger.info("=" * 80)
            
            data = json.loads(request.body)
            items = data.get('items', [])
            metodo_pago = data.get('metodo_pago', 'efectivo')
            cliente = data.get('cliente', 'Cliente General')
            venta_en_proceso_id = data.get('venta_en_proceso_id')
            detalles_pago = data.get('detalles_pago', {})  # Dict con desglose de pagos mixtos
            
            logger.info(f"📊 Datos recibidos:")
            logger.info(f"   - Items: {len(items)}")
            logger.info(f"   - Método pago: {metodo_pago}")
            logger.info(f"   - Cliente: {cliente}")
            logger.info(f"   - Venta en proceso ID: {venta_en_proceso_id}")
            
            from .models import Venta, DetalleVenta
            from .services import obtener_sesion_activa, procesar_pago
            from django.utils import timezone
            
            # VALIDACIÓN CRÍTICA: Verificar que hay sesión de caja abierta
            sesion_activa = obtener_sesion_activa()
            if not sesion_activa:
                return JsonResponse({
                    'success': False,
                    'error': 'No hay sesión de caja abierta. Por favor, solicita a un administrador que abra la caja.'
                }, status=400)
            
            with transaction.atomic():
                # Si hay una venta en proceso, usarla. Si no, crear una nueva
                if venta_en_proceso_id:
                    venta = Venta.objects.get(id=venta_en_proceso_id, estado='en_proceso')
                    # Guardar desglose de pago mixto en observaciones
                    if detalles_pago and metodo_pago == 'mixto':
                        venta.observaciones = f"Desglose pago: {json.dumps(detalles_pago)}"
                        venta.save()
                    
                    # Usar procesar_pago para confirmar y descontar stock
                    procesar_pago(
                        venta=venta,
                        usuario=request.user,
                        metodo_pago=metodo_pago,
                        sesion_caja=sesion_activa
                    )
                else:
                    # Crear nueva venta en estado pendiente
                    observaciones_venta = None
                    if detalles_pago and metodo_pago == 'mixto':
                        observaciones_venta = f"Desglose pago: {json.dumps(detalles_pago)}"
                    
                    venta = Venta.objects.create(
                        tipo_origen='venta_libre',
                        usuario_creacion=request.user,
                        estado='pendiente',  # Crear como pendiente primero
                        sesion=sesion_activa,
                        observaciones=observaciones_venta
                    )
                    
                    # Crear detalles de venta
                    logger.info(f"\n📦 Procesando {len(items)} items:")
                    for idx, item in enumerate(items, 1):
                        logger.info(f"\n  Item {idx}:")
                        logger.info(f"    - Datos raw: {item}")
                        
                        nombre = item.get('name', 'SIN NOMBRE')
                        cantidad = Decimal(str(item.get('quantity', 1)))
                        precio_unitario = Decimal(str(item.get('price', 0)))
                        tipo_raw = item.get('tipo', 'insumo')
                        item_id = item.get('id')
                        
                        logger.info(f"    - Nombre: {nombre}")
                        logger.info(f"    - Cantidad: {cantidad}")
                        logger.info(f"    - Precio: {precio_unitario}")
                        logger.info(f"    - Tipo raw: {tipo_raw} (type: {type(tipo_raw).__name__})")
                        logger.info(f"    - ID: {item_id} (type: {type(item_id).__name__})")
                        
                        # Normalizar tipo (puede venir como string o número)
                        if tipo_raw == 0 or tipo_raw == 'insumo':
                            tipo = 'insumo'
                        elif tipo_raw == 1 or tipo_raw == 'servicio':
                            tipo = 'servicio'
                        else:
                            tipo = 'insumo'  # Por defecto
                        
                        logger.info(f"    - Tipo normalizado: {tipo}")
                        
                        # Validar que el ID sea un número si existe
                        if item_id is not None:
                            try:
                                item_id = int(item_id)
                                logger.info(f"    - ID convertido a int: {item_id}")
                            except (ValueError, TypeError) as e:
                                logger.error(f"    - ❌ ID no es un número válido: {item_id} ({type(item_id).__name__})")
                                return JsonResponse({
                                    'success': False,
                                    'error': f'ID inválido para item "{nombre}": {item_id}. Debe ser un número.'
                                }, status=400)
                        
                        # Obtener el objeto usando tipo e ID
                        servicio = None
                        insumo = None
                        
                        # Verificar si tenemos un ID válido
                        if not item_id:
                            logger.warning(f"    - ⚠️  Item sin ID: {nombre} (tipo={tipo}, id={item_id})")
                        
                        if tipo == 'servicio' and item_id:
                            try:
                                logger.info(f"    - Buscando servicio con ID {item_id}...")
                                servicio = Servicio.objects.get(pk=item_id)
                                logger.info(f"    - Servicio encontrado: {servicio.nombre}")
                                # Validar que el servicio esté activo
                                if not servicio.activo:
                                    logger.error(f"    - ❌ Servicio inactivo: {servicio.nombre}")
                                    return JsonResponse({
                                        'success': False,
                                        'error': f'El servicio "{servicio.nombre}" no está disponible para la venta (inactivo).'
                                    }, status=400)
                            except Servicio.DoesNotExist:
                                logger.error(f"    - ❌ Servicio no encontrado con ID {item_id}")
                                return JsonResponse({
                                    'success': False,
                                    'error': f'Servicio con ID {item_id} no encontrado.'
                                }, status=400)
                        elif tipo == 'insumo' and item_id:
                            try:
                                logger.info(f"    - Buscando insumo con ID {item_id}...")
                                insumo = Insumo.objects.get(pk=item_id)
                                logger.info(f"    - Insumo encontrado: {insumo.medicamento}")
                                # Validar que el insumo no esté archivado
                                if insumo.archivado:
                                    logger.error(f"    - ❌ Insumo archivado: {insumo.medicamento}")
                                    return JsonResponse({
                                        'success': False,
                                        'error': f'El producto "{insumo.medicamento}" no está disponible para la venta (archivado).'
                                    }, status=400)
                            except Insumo.DoesNotExist:
                                logger.error(f"    - ❌ Insumo no encontrado con ID {item_id}")
                                return JsonResponse({
                                    'success': False,
                                    'error': f'Producto con ID {item_id} no encontrado.'
                                }, status=400)
                        elif not item_id:
                            # Si no hay ID, se permite crear un item "libre" con solo descripción y precio
                            # Esto es útil para artículos que no están catalogados en el sistema
                            logger.warning(f"    - ⚠️  Item libre (sin referencia a producto/servicio catalogado)")
                        
                        # NOTA: Se permite que servicio e insumo sean None para items "libres"
                        # Estos son items sin referencia a productos catalogados en el sistema
                        logger.info(f"    - ✅ Item validado: servicio={servicio}, insumo={insumo}")
                        
                        # Crear detalle de venta
                        DetalleVenta.objects.create(
                            venta=venta,
                            tipo=tipo,
                            servicio=servicio,
                            insumo=insumo,
                            descripcion=nombre,
                            cantidad=cantidad,
                            precio_unitario=precio_unitario
                        )
                    
                    # Recalcular totales
                    venta.calcular_totales()
                    
                    # Procesar pago (esto descuenta stock automáticamente)
                    procesar_pago(
                        venta=venta,
                        usuario=request.user,
                        metodo_pago=metodo_pago,
                        sesion_caja=sesion_activa
                    )
                
                return JsonResponse({
                    'success': True,
                    'venta_id': venta.id,
                    'numero_venta': venta.numero_venta,
                    'total': str(venta.total)
                })
                
        except ValidationError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"❌ ValidationError en procesar_venta: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"❌ Exception en procesar_venta: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return JsonResponse({
                'success': False, 
                'error': f'Error interno del servidor: {str(e)}',
                'detail': str(type(e).__name__)
            }, status=500)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@login_required
def cashregister(request):
    """Vista principal de la caja registradora"""
    # Restringir acceso a roles permitidos
    if not (request.user.is_superuser or request.user.is_staff or request.user.rol in ['recepcion', 'administracion']):
        return redirect('dashboard:dashboard')

    # Verificar si hay una caja abierta
    caja_abierta = Caja.objects.filter(usuario=request.user, fecha_cierre__isnull=True).first()
    
    context = {
        'caja_abierta': caja_abierta,
    }
    
    if caja_abierta:
        # Obtener movimientos de la caja actual
        movimientos = MovimientoCaja.objects.filter(caja=caja_abierta).order_by('-fecha')
        
        # Calcular totales
        total_ingresos = movimientos.filter(tipo='ingreso').aggregate(Sum('monto'))['monto__sum'] or 0
        total_egresos = movimientos.filter(tipo='egreso').aggregate(Sum('monto'))['monto__sum'] or 0
        
        context.update({
            'movimientos': movimientos,
            'total_ingresos': total_ingresos,
            'total_egresos': total_egresos,
            'saldo_actual': caja_abierta.monto_inicial + total_ingresos - total_egresos,
        })
    
    return render(request, 'caja/cash_register.html', context)

@login_required
def apertura_cierre(request):
    """Vista para apertura y cierre de caja"""
    caja_abierta = Caja.objects.filter(usuario=request.user, fecha_cierre__isnull=True).first()
    
    if request.method == 'POST':
        if not caja_abierta:
            # Apertura de caja
            form = AperturaCajaForm(request.POST)
            if form.is_valid():
                caja = form.save(commit=False)
                caja.usuario = request.user
                caja.save()
                return redirect('caja:cashregister')
        else:
            # Cierre de caja
            form = CierreCajaForm(request.POST, instance=caja_abierta)
            if form.is_valid():
                caja = form.save(commit=False)
                caja.fecha_cierre = timezone.now()
                
                # Calcular totales
                movimientos = MovimientoCaja.objects.filter(caja=caja)
                total_ingresos = movimientos.filter(tipo='ingreso').aggregate(Sum('monto'))['monto__sum'] or 0
                total_egresos = movimientos.filter(tipo='egreso').aggregate(Sum('monto'))['monto__sum'] or 0
                caja.monto_final = caja.monto_inicial + total_ingresos - total_egresos
                
                caja.save()
                return redirect('caja:reporte', caja_id=caja.id)
    else:
        if caja_abierta:
            form = CierreCajaForm(instance=caja_abierta)
        else:
            form = AperturaCajaForm()
    
    context = {
        'form': form,
        'caja_abierta': caja_abierta,
    }
    
    return render(request, 'caja/apertura_cierre.html', context)

@csrf_exempt
@login_required
def registrar_movimiento(request):
    """Vista para registrar un movimiento en la caja"""
    if request.method == 'POST':
        try:
            caja_abierta = Caja.objects.filter(usuario=request.user, fecha_cierre__isnull=True).first()
            
            if not caja_abierta:
                return JsonResponse({
                    'success': False,
                    'error': 'No hay una caja abierta'
                }, status=400)
            
            data = json.loads(request.body)
            
            movimiento = MovimientoCaja.objects.create(
                caja=caja_abierta,
                tipo=data.get('tipo'),
                monto=Decimal(data.get('monto')),
                concepto=data.get('concepto', ''),
                metodo_pago=data.get('metodo_pago', 'efectivo'),
                descripcion=data.get('descripcion', '')
            )
            
            return JsonResponse({
                'success': True,
                'movimiento_id': movimiento.id,
                'message': 'Movimiento registrado exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@login_required
def reporte(request, caja_id):
    """Vista para mostrar el reporte de una caja cerrada"""
    caja = get_object_or_404(Caja, id=caja_id, usuario=request.user)
    movimientos = MovimientoCaja.objects.filter(caja=caja).order_by('fecha')
    
    # Calcular totales
    total_ingresos = movimientos.filter(tipo='ingreso').aggregate(Sum('monto'))['monto__sum'] or 0
    total_egresos = movimientos.filter(tipo='egreso').aggregate(Sum('monto'))['monto__sum'] or 0
    
    context = {
        'caja': caja,
        'movimientos': movimientos,
        'total_ingresos': total_ingresos,
        'total_egresos': total_egresos,
        'saldo_final': caja.monto_inicial + total_ingresos - total_egresos,
    }
    
    return render(request, 'caja/reporte.html', context)