from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from decimal import Decimal
import json
import pytz
import traceback
from .models import Insumo

@login_required
def inventario(request):
    """Vista para listar el inventario de insumos"""
    insumos = Insumo.objects.all().order_by('medicamento')
    context = {
        'insumos': insumos,
    }
    return render(request, 'inventario/inventario.html', context)

@csrf_exempt
@login_required
def crear_insumo(request):
    """Vista para crear un nuevo insumo"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            insumo = Insumo.objects.create(
                medicamento=data.get('medicamento'),
                sku=data.get('sku', ''),
                tipo=data.get('tipo', ''),
                descripcion=data.get('descripcion', ''),
                especie=data.get('especie', ''),
                precio_venta=Decimal(data.get('precio_venta', 0)),
                stock_actual=int(data.get('stock_actual', 0)),
                dosis_ml=Decimal(data.get('dosis_ml')) if data.get('dosis_ml') else None,
                peso_kg=Decimal(data.get('peso_kg')) if data.get('peso_kg') else None,
                ml_contenedor=Decimal(data.get('ml_contenedor')) if data.get('ml_contenedor') else None,
                precauciones=data.get('precauciones', ''),
                contraindicaciones=data.get('contraindicaciones', ''),
                efectos_adversos=data.get('efectos_adversos', ''),
                fecha_creacion=timezone.now(),
                usuario_ultimo_movimiento=request.user,
                tipo_ultimo_movimiento='registro_inicial'
            )
            
            if int(data.get('stock_actual', 0)) > 0:
                insumo.ultimo_ingreso = timezone.now()
                insumo.ultimo_movimiento = timezone.now()
                insumo.save()
            
            return JsonResponse({
                'success': True,
                'insumo_id': insumo.idInventario,
                'message': 'Insumo creado exitosamente'
            })
            
        except Exception as e:
            print(f"Error al crear insumo: {str(e)}")
            traceback.print_exc()
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def editar_insumo(request, insumo_id):
    """Vista para editar un insumo existente"""
    if request.method == 'POST':
        try:
            insumo = get_object_or_404(Insumo, idInventario=insumo_id)
            data = json.loads(request.body)
            
            print(f"📝 Datos recibidos para editar insumo {insumo_id}:", data)
            
            stock_anterior = insumo.stock_actual
            
            # Actualizar campos básicos
            if 'nombre_comercial' in data:
                insumo.medicamento = data['nombre_comercial']
            elif 'medicamento' in data:
                insumo.medicamento = data['medicamento']
            
            insumo.marca = data.get('marca', insumo.marca)
            insumo.sku = data.get('sku', insumo.sku)
            insumo.tipo = data.get('tipo', insumo.tipo)
            insumo.formato = data.get('formato', insumo.formato)
            insumo.descripcion = data.get('descripcion', insumo.descripcion)
            insumo.especie = data.get('especie', insumo.especie)
            
            if 'precio_venta' in data and data['precio_venta']:
                insumo.precio_venta = Decimal(str(data['precio_venta']))
            
            # Stock
            if 'stock_actual' in data:
                stock_nuevo = int(data['stock_actual'])
                insumo.stock_actual = stock_nuevo
                
                if stock_nuevo > stock_anterior:
                    insumo.ultimo_ingreso = timezone.now()
                    insumo.tipo_ultimo_movimiento = 'entrada'
                elif stock_nuevo < stock_anterior:
                    insumo.tipo_ultimo_movimiento = 'salida'
                else:
                    insumo.tipo_ultimo_movimiento = insumo.tipo_ultimo_movimiento or 'entrada'
            
            # Dosis según formato
            if 'dosis_ml' in data:
                insumo.dosis_ml = Decimal(str(data['dosis_ml'])) if data['dosis_ml'] else None
            if 'ml_contenedor' in data:
                insumo.ml_contenedor = Decimal(str(data['ml_contenedor'])) if data['ml_contenedor'] else None
            if 'cantidad_pastillas' in data:
                insumo.cantidad_pastillas = int(data['cantidad_pastillas']) if data['cantidad_pastillas'] else None
            if 'unidades_pipeta' in data:
                insumo.unidades_pipeta = int(data['unidades_pipeta']) if data['unidades_pipeta'] else None
            if 'peso_kg' in data:
                insumo.peso_kg = Decimal(str(data['peso_kg'])) if data['peso_kg'] else None
            
            # Rango de peso
            if 'tiene_rango_peso' in data:
                insumo.tiene_rango_peso = bool(data['tiene_rango_peso'])
            if 'peso_min_kg' in data:
                insumo.peso_min_kg = Decimal(str(data['peso_min_kg'])) if data['peso_min_kg'] else None
            if 'peso_max_kg' in data:
                insumo.peso_max_kg = Decimal(str(data['peso_max_kg'])) if data['peso_max_kg'] else None
            
            insumo.precauciones = data.get('precauciones', insumo.precauciones)
            insumo.contraindicaciones = data.get('contraindicaciones', insumo.contraindicaciones)
            insumo.efectos_adversos = data.get('efectos_adversos', insumo.efectos_adversos)
            
            insumo.ultimo_movimiento = timezone.now()
            insumo.usuario_ultimo_movimiento = request.user
            
            insumo.save()
            
            local_tz = pytz.timezone('America/Santiago')
            ultimo_ingreso = insumo.ultimo_ingreso.astimezone(local_tz) if insumo.ultimo_ingreso else None
            ultimo_movimiento = insumo.ultimo_movimiento.astimezone(local_tz) if insumo.ultimo_movimiento else None
            
            return JsonResponse({
                'success': True,
                'message': 'Insumo actualizado exitosamente',
                'debug': {
                    'ultimo_ingreso': ultimo_ingreso.strftime('%d/%m/%Y %H:%M') if ultimo_ingreso else '-',
                    'ultimo_movimiento': ultimo_movimiento.strftime('%d/%m/%Y %H:%M') if ultimo_movimiento else '-',
                    'tipo_movimiento_display': dict(Insumo.TIPO_MOVIMIENTO_CHOICES).get(insumo.tipo_ultimo_movimiento, '-'),
                    'usuario': insumo.get_usuario_nombre_completo() if insumo.usuario_ultimo_movimiento else '(sin registro)',
                    'stock_anterior': stock_anterior,
                    'stock_nuevo': insumo.stock_actual,
                    'dosis_display': insumo.get_dosis_display()
                }
            })
            
        except Exception as e:
            print(f"❌ Error al editar insumo: {str(e)}")
            traceback.print_exc()
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@login_required
def detalle_insumo(request, insumo_id):
    """Vista para obtener detalles completos de un insumo (JSON)"""
    try:
        insumo = get_object_or_404(Insumo, idInventario=insumo_id)
        
        usuario_nombre = "(sin registro)"
        if insumo.usuario_ultimo_movimiento:
            usuario_nombre = insumo.get_usuario_nombre_completo()
        
        local_tz = pytz.timezone('America/Santiago')
        
        fecha_creacion = insumo.fecha_creacion.astimezone(local_tz) if insumo.fecha_creacion else None
        ultimo_ingreso = insumo.ultimo_ingreso.astimezone(local_tz) if insumo.ultimo_ingreso else None
        ultimo_movimiento = insumo.ultimo_movimiento.astimezone(local_tz) if insumo.ultimo_movimiento else None
        
        return JsonResponse({
            'success': True,
            'insumo': {
                'idInventario': insumo.idInventario,
                'nombre_comercial': insumo.medicamento,
                'medicamento': insumo.medicamento,
                'marca': insumo.marca or '',
                'sku': insumo.sku or '',
                'tipo': insumo.tipo or '',
                'formato': insumo.formato or '',
                'descripcion': insumo.descripcion or '',
                'especie': insumo.especie or '',
                'precio_venta': float(insumo.precio_venta) if insumo.precio_venta else 0,
                'stock_actual': insumo.stock_actual,
                
                # Dosis según formato
                'dosis_ml': float(insumo.dosis_ml) if insumo.dosis_ml else None,
                'ml_contenedor': float(insumo.ml_contenedor) if insumo.ml_contenedor else None,
                'cantidad_pastillas': insumo.cantidad_pastillas,
                'unidades_pipeta': insumo.unidades_pipeta,
                'peso_kg': float(insumo.peso_kg) if insumo.peso_kg else None,
                
                # Rango de peso
                'tiene_rango_peso': insumo.tiene_rango_peso,
                'peso_min_kg': float(insumo.peso_min_kg) if insumo.peso_min_kg else None,
                'peso_max_kg': float(insumo.peso_max_kg) if insumo.peso_max_kg else None,
                
                'precauciones': insumo.precauciones or '',
                'contraindicaciones': insumo.contraindicaciones or '',
                'efectos_adversos': insumo.efectos_adversos or '',
                'fecha_creacion_formatted': fecha_creacion.strftime('%d/%m/%Y %H:%M') if fecha_creacion else '-',
                'ultimo_ingreso_formatted': ultimo_ingreso.strftime('%d/%m/%Y %H:%M') if ultimo_ingreso else '-',
                'ultimo_movimiento_formatted': ultimo_movimiento.strftime('%d/%m/%Y %H:%M') if ultimo_movimiento else '-',
                'tipo_ultimo_movimiento_display': dict(Insumo.TIPO_MOVIMIENTO_CHOICES).get(insumo.tipo_ultimo_movimiento, '-') if insumo.tipo_ultimo_movimiento else '-',
                'usuario_ultimo_movimiento': usuario_nombre,
                
                # Dosis formateada
                'dosis_display': insumo.get_dosis_display(),
            }
        })
    except Exception as e:
        print(f"❌ ERROR en detalle_insumo:")
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
@login_required
def eliminar_insumo(request, insumo_id):
    """Vista para eliminar un insumo"""
    if request.method == 'POST':
        try:
            insumo = get_object_or_404(Insumo, idInventario=insumo_id)
            insumo.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Insumo eliminado exitosamente'
            })
            
        except Exception as e:
            print(f"Error al eliminar insumo: {str(e)}")
            traceback.print_exc()
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def modificar_stock_insumo(request, insumo_id):
    """Vista para modificar el stock de un insumo"""
    if request.method == 'POST':
        try:
            insumo = get_object_or_404(Insumo, idInventario=insumo_id)
            data = json.loads(request.body)
            
            # ⭐ NUEVO: Aceptar stock_actual directamente (desde modal de stock rápido)
            if 'stock_actual' in data:
                stock_nuevo = int(data['stock_actual'])
                stock_anterior = insumo.stock_actual
                
                # Determinar tipo de movimiento
                if stock_nuevo > stock_anterior:
                    tipo_movimiento = 'entrada'
                    cantidad = stock_nuevo - stock_anterior
                    insumo.ultimo_ingreso = timezone.now()
                elif stock_nuevo < stock_anterior:
                    tipo_movimiento = 'salida'
                    cantidad = stock_anterior - stock_nuevo
                else:
                    return JsonResponse({
                        'success': False,
                        'error': 'El stock no ha cambiado'
                    }, status=400)
                
                insumo.stock_actual = stock_nuevo
                
            else:
                # Método anterior con tipo_movimiento y cantidad
                tipo_movimiento = data.get('tipo_movimiento')
                cantidad = int(data.get('cantidad', 0))
                
                if cantidad <= 0:
                    return JsonResponse({
                        'success': False,
                        'error': 'La cantidad debe ser mayor a 0'
                    }, status=400)
                
                stock_anterior = insumo.stock_actual
                
                if tipo_movimiento == 'entrada':
                    insumo.stock_actual += cantidad
                    insumo.ultimo_ingreso = timezone.now()
                elif tipo_movimiento == 'salida':
                    if insumo.stock_actual < cantidad:
                        return JsonResponse({
                            'success': False,
                            'error': f'Stock insuficiente. Stock actual: {insumo.stock_actual}'
                        }, status=400)
                    insumo.stock_actual -= cantidad
                else:
                    return JsonResponse({
                        'success': False,
                        'error': 'Tipo de movimiento no válido'
                    }, status=400)
            
            insumo.ultimo_movimiento = timezone.now()
            insumo.tipo_ultimo_movimiento = tipo_movimiento
            insumo.usuario_ultimo_movimiento = request.user
            insumo.save()
            
            # Datos para debug
            local_tz = pytz.timezone('America/Santiago')
            ultimo_ingreso = insumo.ultimo_ingreso.astimezone(local_tz) if insumo.ultimo_ingreso else None
            ultimo_movimiento = insumo.ultimo_movimiento.astimezone(local_tz) if insumo.ultimo_movimiento else None
            
            return JsonResponse({
                'success': True,
                'message': f'Stock actualizado correctamente',
                'stock_anterior': stock_anterior,
                'stock_actual': insumo.stock_actual,
                'cantidad': cantidad,
                'tipo_movimiento': tipo_movimiento,
                'debug': {
                    'ultimo_ingreso': ultimo_ingreso.strftime('%d/%m/%Y %H:%M') if ultimo_ingreso else '-',
                    'ultimo_movimiento': ultimo_movimiento.strftime('%d/%m/%Y %H:%M') if ultimo_movimiento else '-',
                    'tipo_movimiento_display': dict(Insumo.TIPO_MOVIMIENTO_CHOICES).get(tipo_movimiento, '-'),
                    'usuario': insumo.get_usuario_nombre_completo() if insumo.usuario_ultimo_movimiento else '(sin registro)'
                }
            })
            
        except Exception as e:
            print(f"Error al modificar stock: {str(e)}")
            traceback.print_exc()
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitado'}, status=405)

@require_http_methods(["GET"])
def api_productos(request):
    """API para obtener lista de productos del inventario"""
    try:
        insumos = Insumo.objects.all()
        
        productos = []
        for insumo in insumos:
            productos.append({
                'id': insumo.idInventario,
                'nombre': insumo.medicamento,
                'sku': insumo.sku or '',
                'tipo': insumo.tipo or '',
                'precio': float(insumo.precio_venta) if insumo.precio_venta else 0,
                'stock': insumo.stock_actual,
                'dosis_ml': float(insumo.dosis_ml) if insumo.dosis_ml else 0,
                'peso_kg': float(insumo.peso_kg) if insumo.peso_kg else 1,
            })
        
        return JsonResponse(productos, safe=False)
    except Exception as e:
        import traceback
        print(f"Error en api_productos: {str(e)}")
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def inventario_view(request):
    """Vista principal del inventario"""
    insumos = Insumo.objects.all()
    return render(request, 'inventario/inventario.html', {'insumos': insumos})

@login_required
def productos_api(request):
    """API para búsqueda de productos en el inventario"""
    try:
        search = request.GET.get('search', '')
        
        if search:
            productos = Insumo.objects.filter(medicamento__icontains=search)[:10]
        else:
            productos = Insumo.objects.all()[:20]
        
        data = []
        for p in productos:
            data.append({
                'id': p.idInventario,  # Cambiado de idInsumo a idInventario
                'nombre': p.medicamento,
                'stock': p.stock_actual,
                'precio': float(p.precio_venta) if p.precio_venta else 0,
            })
        
        return JsonResponse(data, safe=False)
    except Exception as e:
        # Log del error para debugging
        import traceback
        print(f"Error en productos_api: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)
