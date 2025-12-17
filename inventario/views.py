from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from functools import wraps
from decimal import Decimal
import json
import pytz
import traceback
from .models import Insumo
from django.db.models import Q


def solo_admin_y_vet(view_func):
    """Decorador para permitir solo admin y veterinarios editar inventario"""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.user.rol not in ['administracion', 'veterinario']:
            return JsonResponse({
                'success': False, 
                'error': 'No tienes permiso para editar el inventario'
            }, status=403)
        return view_func(request, *args, **kwargs)
    return wrapper

@csrf_exempt
@login_required
@solo_admin_y_vet
def crear_insumo(request):
    """Vista para crear un nuevo insumo"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Crear insumo con todos los campos
            insumo = Insumo.objects.create(
                medicamento=data.get('medicamento') or data.get('nombre_comercial', ''),
                marca=data.get('marca', ''),
                sku=data.get('sku', ''),
                tipo=data.get('tipo', ''),
                formato=data.get('formato', ''),
                descripcion=data.get('descripcion', ''),
                especie=data.get('especie', ''),
                precio_venta=Decimal(str(data.get('precio_venta', 0))) if data.get('precio_venta') else None,
                stock_actual=int(data.get('stock_actual', 0)),
                
                # Dosis según formato
                dosis_ml=Decimal(str(data.get('dosis_ml'))) if data.get('dosis_ml') else None,
                ml_contenedor=Decimal(str(data.get('ml_contenedor'))) if data.get('ml_contenedor') else None,
                cantidad_pastillas=int(data.get('cantidad_pastillas')) if data.get('cantidad_pastillas') else None,
                unidades_pipeta=int(data.get('unidades_pipeta')) if data.get('unidades_pipeta') else None,
                peso_kg=Decimal(str(data.get('peso_kg'))) if data.get('peso_kg') else None,
                
                # Rango de peso
                tiene_rango_peso=bool(data.get('tiene_rango_peso', False)),
                peso_min_kg=Decimal(str(data.get('peso_min_kg'))) if data.get('peso_min_kg') else None,
                peso_max_kg=Decimal(str(data.get('peso_max_kg'))) if data.get('peso_max_kg') else None,
                
                # Información adicional
                precauciones=data.get('precauciones', ''),
                contraindicaciones=data.get('contraindicaciones', ''),
                efectos_adversos=data.get('efectos_adversos', ''),
                
                # Metadata
                fecha_creacion=timezone.now(),
                usuario_ultimo_movimiento=request.user,
                tipo_ultimo_movimiento='registro_inicial'
            )
            
            # Actualizar fechas si tiene stock inicial
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
@solo_admin_y_vet
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
                'stock_minimo': float(insumo.stock_minimo) if insumo.stock_minimo else 10,
                'stock_medio': float(insumo.stock_medio) if insumo.stock_medio else 20,
                
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
@solo_admin_y_vet
def eliminar_insumo(request, insumo_id):
    """Vista para eliminar/archivar un insumo"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)
    
    print(f"🗑️ Procesando eliminación de insumo ID: {insumo_id}")
    
    from django.db import connection
    
    try:
        with connection.cursor() as cursor:
            # 1. Verificar existencia (usando comillas dobles para preservar case en PostgreSQL)
            cursor.execute('SELECT medicamento FROM inventario WHERE "idInventario" = %s', [insumo_id])
            row = cursor.fetchone()
            
            if not row:
                return JsonResponse({'success': False, 'error': 'Producto no encontrado'}, status=404)
            
            nombre_insumo = row[0]
            print(f"📦 Producto: {nombre_insumo}")
            
            # 2. Verificar relaciones (solo tablas que existen)
            relaciones = []
            tablas = [
                ('clinica_consulta_medicamentos', 'insumo_id', 'consultas'),
                ('clinica_hospitalizacion_insumos', 'insumo_id', 'hospitalizaciones'),  
                ('clinica_cirugia_medicamentos', 'insumo_id', 'cirugías'),
            ]
            
            for tabla, col, desc in tablas:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {tabla} WHERE {col} = %s", [insumo_id])
                    count = cursor.fetchone()[0]
                    if count > 0:
                        relaciones.append(f"{count} {desc}")
                except:
                    pass  # Tabla no existe, ignorar
            
            # 3. Si está en uso, ARCHIVAR en lugar de eliminar
            if relaciones:
                cursor.execute('UPDATE inventario SET archivado = true WHERE "idInventario" = %s', [insumo_id])
                print(f"📁 Archivado (en uso en: {", ".join(relaciones)}): {nombre_insumo}")
                
                return JsonResponse({
                    'success': True,
                    'archived': True,
                    'message': f'El producto "{nombre_insumo}" está siendo usado en {", ".join(relaciones)}. Se ha archivado en lugar de eliminarse.'
                })
            
            # 4. Si NO está en uso, eliminar permanentemente
            cursor.execute('DELETE FROM inventario WHERE "idInventario" = %s', [insumo_id])
            print(f"✅ Eliminado permanentemente: {nombre_insumo}")
            
            return JsonResponse({
                'success': True,
                'archived': False,
                'message': f'Producto "{nombre_insumo}" eliminado exitosamente'
            })
    
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {str(e)}")
        print(f"❌ Tipo de excepción: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        
        # Devolver el error específico para debugging
        return JsonResponse({
            'success': False,
            'error': f'Error: {str(e)}',
            'error_type': type(e).__name__
        }, status=400)

@csrf_exempt
@login_required
@solo_admin_y_vet
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
    """
    API para obtener productos del inventario
    Filtros disponibles:
    - especie: perro, gato, ambos
    - peso: peso del paciente en kg (para filtrar por rango)
    """
    try:
        # Obtener parámetros de filtro
        especie_filtro = request.GET.get('especie', '').lower()
        peso_filtro = request.GET.get('peso', None)
        
        # Query base
        productos = Insumo.objects.filter(stock_actual__gt=0)
        
        # Filtrar por especie
        if especie_filtro:
            # Incluir productos para la especie específica o "ambos"
            # Normalizar especie a minúsculas para comparación
            productos = productos.filter(
                Q(especie__iexact=especie_filtro) | 
                Q(especie__iexact='ambos') | 
                Q(especie__isnull=True) |
                Q(especie='')
            )
            print(f"🔍 Filtrado por especie '{especie_filtro}': {productos.count()} productos encontrados")
        
        # Filtrar por peso (si tiene rango de peso definido)
        if peso_filtro:
            try:
                peso = float(peso_filtro)
                # Incluir productos sin rango de peso O que el peso esté dentro del rango
                productos = productos.filter(
                    Q(tiene_rango_peso=False) |
                    Q(tiene_rango_peso__isnull=True) |
                    (
                        Q(tiene_rango_peso=True) &
                        Q(peso_min_kg__lte=peso) &
                        Q(peso_max_kg__gte=peso)
                    )
                )
            except ValueError:
                pass  # Si el peso no es válido, ignorar este filtro
        
        # Construir respuesta
        productos_data = []
        for producto in productos:
            productos_data.append({
                'id': producto.idInventario,
                'nombre': producto.medicamento,
                'marca': producto.marca or '',
                'especie': producto.especie or 'Todos',
                'formato': producto.formato or '',
                'stock': producto.stock_actual,
                'precio': float(producto.precio_venta) if producto.precio_venta else 0,
                'dosis_display': producto.get_dosis_display(),
                
                # Datos para cálculo de dosis
                'dosis_ml': float(producto.dosis_ml) if producto.dosis_ml else None,
                'cantidad_pastillas': producto.cantidad_pastillas,
                'unidades_pipeta': producto.unidades_pipeta,
                'peso_kg': float(producto.peso_kg) if producto.peso_kg else None,
                
                # Rango de peso
                'tiene_rango_peso': producto.tiene_rango_peso,
                'peso_min_kg': float(producto.peso_min_kg) if producto.peso_min_kg else None,
                'peso_max_kg': float(producto.peso_max_kg) if producto.peso_max_kg else None,
            })
        
        return JsonResponse({
            'success': True,
            'productos': productos_data,
            'total': len(productos_data),
            'filtros_aplicados': {
                'especie': especie_filtro or 'todos',
                'peso': peso_filtro
            }
        })
        
    except Exception as e:
        print(f"❌ Error en api_productos: {str(e)}")
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@login_required
def inventario_view(request):
    """Vista principal del inventario (activos o archivados)"""
    # Obtener el estado desde el parámetro GET (por defecto: activos)
    estado = request.GET.get('estado', 'activos')
    
    if estado == 'archivados':
        insumos = Insumo.objects.filter(archivado=True).order_by('medicamento')
    else:
        insumos = Insumo.objects.filter(archivado=False).order_by('medicamento')
    
    context = {
        'insumos': insumos,
        'estado_actual': estado
    }
    return render(request, 'inventario/inventario.html', context)

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


@csrf_exempt
@login_required
@solo_admin_y_vet
def actualizar_niveles_stock(request, insumo_id):
    """Vista para actualizar los niveles de stock mínimo y medio de un insumo"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            stock_minimo = data.get('stock_minimo')
            stock_medio = data.get('stock_medio')
            
            # Validar datos
            if stock_minimo is None or stock_medio is None:
                return JsonResponse({
                    'success': False,
                    'error': 'Faltan datos requeridos'
                }, status=400)
            
            stock_minimo = float(stock_minimo)
            stock_medio = float(stock_medio)
            
            if stock_minimo >= stock_medio:
                return JsonResponse({
                    'success': False,
                    'error': 'El stock mínimo debe ser menor al stock medio'
                }, status=400)
            
            # Actualizar insumo
            insumo = get_object_or_404(Insumo, idInventario=insumo_id)
            insumo.stock_minimo = stock_minimo
            insumo.stock_medio = stock_medio
            insumo.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Niveles de stock actualizados correctamente',
                'data': {
                    'stock_minimo': float(insumo.stock_minimo),
                    'stock_medio': float(insumo.stock_medio),
                    'stock_nivel': insumo.get_stock_nivel(),
                    'stock_color': insumo.get_stock_color()
                }
            })
            
        except Exception as e:
            print(f"❌ ERROR en actualizar_niveles_stock:")
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'error': 'Método no permitido'
    }, status=405)

@csrf_exempt
@login_required
def restaurar_producto(request, producto_id):
    """Vista para archivar/restaurar un producto"""
    producto = get_object_or_404(Insumo, idInventario=producto_id)
    
    if request.method == 'POST':
        try:
            # Alternar el estado archivado
            producto.archivado = not producto.archivado
            producto.save()
            
            mensaje = 'Producto archivado exitosamente' if producto.archivado else 'Producto restaurado exitosamente'
            return JsonResponse({'success': True, 'message': mensaje})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)
