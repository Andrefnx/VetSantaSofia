from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
import json
import traceback
from .models import Servicio, ServicioInsumo
from inventario.models import Insumo

@login_required
def servicios(request):
    """Vista para listar los servicios"""
    servicios = Servicio.objects.all().order_by('nombre')
    context = {
        'servicios': servicios,
    }
    return render(request, 'servicios/servicios.html', context)

@login_required
def crear_servicio(request):
    """Vista para crear un nuevo servicio"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            servicio = Servicio.objects.create(
                nombre=data.get('nombre'),
                descripcion=data.get('descripcion', ''),
                categoria=data.get('categoria', ''),
                precio=int(data.get('precio', 0)),
                duracion=int(data.get('duracion', 0))
            )
            
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

@login_required
def eliminar_servicio(request, servicio_id):
    """Vista para eliminar un servicio"""
    if request.method == 'POST':
        try:
            servicio = get_object_or_404(Servicio, idServicio=servicio_id)
            servicio.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Servicio eliminado exitosamente'
            })
            
        except Exception as e:
            print(f"Error al eliminar servicio: {str(e)}")
            traceback.print_exc()
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)
