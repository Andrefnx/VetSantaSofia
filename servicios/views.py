from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
import json
import traceback
from .models import Servicio, ServicioInsumo
from inventario.models import Insumo

@login_required
def servicios(request):
    """Vista para listar los servicios (activos o archivados)"""
    # Obtener el estado desde el parámetro GET (por defecto: activos)
    estado = request.GET.get('estado', 'activos')
    
    if estado == 'archivados':
        servicios = Servicio.objects.filter(activo=False).order_by('nombre')
    else:
        servicios = Servicio.objects.filter(activo=True).order_by('nombre')
    
    context = {
        'servicios': servicios,
        'estado_actual': estado,
    }
    return render(request, 'servicios/servicios.html', context)

@login_required
def crear_servicio(request):
    """Vista para crear un nuevo servicio"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            servicio = Servicio(
                nombre=data.get('nombre'),
                descripcion=data.get('descripcion', ''),
                categoria=data.get('categoria', ''),
                precio=int(data.get('precio', 0)),
                duracion=int(data.get('duracion', 0))
            )
            servicio._usuario_modificacion = request.user
            servicio.save()
            
            # Agregar insumos si existen
            insumos = data.get('insumos', [])
            for insumo_data in insumos:
                insumo = get_object_or_404(Insumo, idInventario=insumo_data['id'])
                ServicioInsumo.objects.create(
                    servicio=servicio,
                    insumo=insumo,
                    cantidad=int(insumo_data.get('cantidad', 1))
                )
            
            return JsonResponse({
                'success': True,
                'servicio_id': servicio.idServicio,
                'message': 'Servicio creado exitosamente'
            })
            
        except Exception as e:
            print(f"Error al crear servicio: {str(e)}")
            traceback.print_exc()
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@login_required
def editar_servicio(request, servicio_id):
    """Vista para editar un servicio existente"""
    if request.method == 'POST':
        try:
            servicio = get_object_or_404(Servicio, idServicio=servicio_id)
            data = json.loads(request.body)
            
            servicio.nombre = data.get('nombre', servicio.nombre)
            servicio.descripcion = data.get('descripcion', servicio.descripcion)
            servicio.categoria = data.get('categoria', servicio.categoria)
            servicio.precio = int(data.get('precio', servicio.precio))
            servicio.duracion = int(data.get('duracion', servicio.duracion))
            servicio._usuario_modificacion = request.user
            servicio.save()
            
            # Actualizar insumos
            ServicioInsumo.objects.filter(servicio=servicio).delete()
            insumos = data.get('insumos', [])
            for insumo_data in insumos:
                insumo = get_object_or_404(Insumo, idInventario=insumo_data['id'])
                ServicioInsumo.objects.create(
                    servicio=servicio,
                    insumo=insumo,
                    cantidad=int(insumo_data.get('cantidad', 1))
                )
            
            return JsonResponse({
                'success': True,
                'message': 'Servicio actualizado exitosamente'
            })
            
        except Exception as e:
            print(f"Error al editar servicio: {str(e)}")
            traceback.print_exc()
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def eliminar_servicio(request, servicio_id):
    """
    Vista para eliminar/desactivar un servicio.
    
    REGLA DE NEGOCIO:
    - Si el servicio tiene referencias en citas o ventas:
      → SOFT DELETE: Se marca como activo=False (no se elimina físicamente)
      → Preserva el historial de citas programadas y ventas realizadas
      → El servicio no se mostrará en nuevas operaciones pero permanece en históricos
    - Si NO tiene referencias:
      → HARD DELETE: Se elimina físicamente usando ORM de Django
      → Esto también eliminará en cascada los ServicioInsumo asociados
    
    PROTECCIONES:
    - Usa ORM en lugar de SQL directo para respetar relaciones CASCADE/PROTECT
    - Captura ProtectedError por si hay referencias no detectadas manualmente
    - Nunca expone excepciones técnicas al usuario final
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)
    
    from django.db.models import ProtectedError
    
    try:
        servicio = get_object_or_404(Servicio, idServicio=servicio_id)
        nombre_servicio = servicio.nombre
        print(f"🗑️ Procesando eliminación de servicio: {nombre_servicio}")
        
        # Verificar si el servicio está siendo usado en otras tablas
        relaciones = []
        
        with connection.cursor() as cursor:
            # Verificar en agenda (citas)
            cursor.execute('SELECT COUNT(*) FROM agenda_cita WHERE servicio_id = %s', [servicio_id])
            count_citas = cursor.fetchone()[0]
            if count_citas > 0:
                relaciones.append(f"{count_citas} citas")
            
            # Verificar en detalles de ventas de caja
            cursor.execute('SELECT COUNT(*) FROM caja_detalleventa WHERE servicio_id = %s', [servicio_id])
            count_ventas = cursor.fetchone()[0]
            if count_ventas > 0:
                relaciones.append(f"{count_ventas} ventas")
        
        # SOFT DELETE: Si tiene relaciones, desactivar (NO eliminar físicamente)
        if relaciones:
            servicio.activo = False
            servicio._usuario_modificacion = request.user
            servicio.save()
            print(f"📁 SOFT DELETE - Desactivado (en uso en: {', '.join(relaciones)}): {nombre_servicio}")
            
            return JsonResponse({
                'success': True,
                'archived': True,
                'message': f'Este servicio está siendo usado en citas o ventas, por lo que será desactivado. '
                          f'No se puede eliminar porque está en uso en: {", ".join(relaciones)}.'
            })
        
        # HARD DELETE: Si NO tiene relaciones, intentar eliminación física con ORM
        try:
            print(f"🗑️ HARD DELETE - Eliminación física con ORM: {nombre_servicio}")
            # ORM eliminará automáticamente los ServicioInsumo asociados (CASCADE)
            servicio.delete()
            print(f"✅ Eliminado permanentemente (incluye ServicioInsumo asociados): {nombre_servicio}")
            
            return JsonResponse({
                'success': True,
                'archived': False,
                'message': f'Servicio "{nombre_servicio}" eliminado exitosamente'
            })
            
        except ProtectedError as e:
            # FALLBACK: Si ORM detecta referencias PROTECT no validadas manualmente
            print(f"⚠️ ProtectedError detectado - Aplicando soft delete como fallback")
            servicio.activo = False
            servicio._usuario_modificacion = request.user
            servicio.save()
            
            return JsonResponse({
                'success': True,
                'archived': True,
                'message': 'Este servicio está siendo usado en citas o ventas, por lo que será desactivado.'
            })
        
    except Servicio.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Servicio no encontrado'}, status=404)
        
    except Exception as e:
        # Capturar cualquier otro error inesperado sin exponer detalles técnicos
        print(f"❌ ERROR al eliminar servicio: {str(e)}")
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': 'Ocurrió un error al procesar la solicitud. Por favor, contacta al administrador.'
        }, status=400)


@csrf_exempt
@login_required
def archivar_servicio(request, servicio_id):
    """Vista para archivar/restaurar un servicio (soft delete)"""
    servicio = get_object_or_404(Servicio, idServicio=servicio_id)
    
    if request.method == 'POST':
        try:
            # Alternar el estado activo (soft delete)
            servicio.activo = not servicio.activo
            servicio._usuario_modificacion = request.user
            servicio.save()
            
            mensaje = 'Servicio archivado exitosamente' if not servicio.activo else 'Servicio restaurado exitosamente'
            return JsonResponse({'success': True, 'message': mensaje})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)
