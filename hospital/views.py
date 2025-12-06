from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.db import models
from .models import Insumo, Servicio, Paciente, Propietario
from django.views.decorators.csrf import csrf_exempt
import json
from django.contrib.auth.decorators import login_required
from django.utils import timezone

# Importar solo si existen
try:
    from .models import Consulta, Hospitalizacion, Examen, Documento
    MODELOS_EXTENDIDOS = True
except ImportError:
    MODELOS_EXTENDIDOS = False

# --- CONSULTAS ---
def consulta_view(request):
    return render(request, 'consultas/consulta.html')

# --- HOSPITALIZACIÓN ---
def hospital_view(request):
    return render(request, 'hospitalizacion/hospital.html')

# --- PACIENTES ---
@login_required
def pacientes_view(request):
    """Vista para listar todos los pacientes"""
    pacientes = Paciente.objects.select_related('propietario').filter(activo=True).order_by('-fecha_registro')
    
    context = {
        'pacientes': pacientes,
    }
    
    return render(request, 'pacientes/pacientes.html', context)

@login_required
def ficha_mascota_view(request, paciente_id):
    """Vista para mostrar la ficha de un paciente específico"""
    paciente = get_object_or_404(Paciente, id=paciente_id, activo=True)
    
    context = {
        'paciente': paciente,
    }
    
    # Agregar datos relacionados solo si los modelos existen
    if MODELOS_EXTENDIDOS:
        try:
            context['consultas'] = Consulta.objects.filter(paciente=paciente).order_by('-fecha')[:10]
        except:
            context['consultas'] = []
        
        try:
            context['hospitalizaciones'] = Hospitalizacion.objects.filter(idMascota=paciente).order_by('-fecha_ingreso')
        except:
            context['hospitalizaciones'] = []
        
        try:
            context['examenes'] = Examen.objects.filter(paciente=paciente).order_by('-fecha')
        except:
            context['examenes'] = []
        
        try:
            context['documentos'] = Documento.objects.filter(paciente=paciente).order_by('-fecha_subida')
        except:
            context['documentos'] = []
        
        if context['consultas']:
            ultima_consulta = context['consultas'][0]
            paciente.fecha_ultimo_control = ultima_consulta.fecha
            if hasattr(ultima_consulta, 'peso') and ultima_consulta.peso:
                paciente.ultimo_peso = ultima_consulta.peso
            paciente.save()
    else:
        context['consultas'] = []
        context['hospitalizaciones'] = []
        context['examenes'] = []
        context['documentos'] = []
    
    return render(request, 'pacientes/ficha_mascota.html', context)

@login_required
def detalle_paciente(request, paciente_id):
    """Vista para obtener detalles completos de un paciente (JSON)"""
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    return JsonResponse({
        'success': True,
        'paciente': {
            'id': paciente.id,
            'nombre': paciente.nombre,
            'especie': paciente.especie,
            'raza': paciente.raza or '',
            'edad': paciente.edad or '',
            'sexo': paciente.sexo,
            'color': paciente.color or '',
            'microchip': paciente.microchip or '',
            'ultimo_peso': float(paciente.ultimo_peso) if paciente.ultimo_peso else None,
            'observaciones': paciente.observaciones or '',
        },
        'propietario': {
            'id': paciente.propietario.id,
            'nombre': paciente.propietario.nombre,
            'apellido': paciente.propietario.apellido,
            'nombre_completo': paciente.propietario.nombre_completo,
            'telefono': paciente.propietario.telefono or '',
            'email': paciente.propietario.email or '',
            'direccion': paciente.propietario.direccion or '',
        }
    })

@csrf_exempt
@login_required
def crear_paciente(request):
    """Vista para crear un nuevo paciente"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Obtener o crear propietario
            propietario_id = data.get('propietario_id')
            actualizar_propietario = data.get('actualizar_propietario', False)
            
            if propietario_id:
                # Usar propietario existente
                propietario = get_object_or_404(Propietario, id=propietario_id)
                
                # Si se marcó para actualizar, actualizar sus datos
                if actualizar_propietario:
                    propietario_data = data.get('propietario', {})
                    propietario.nombre = propietario_data.get('nombre', propietario.nombre)
                    propietario.apellido = propietario_data.get('apellido', propietario.apellido)
                    propietario.telefono = propietario_data.get('telefono', propietario.telefono)
                    propietario.email = propietario_data.get('email', propietario.email)
                    propietario.direccion = propietario_data.get('direccion', propietario.direccion)
                    propietario.save()
            else:
                # Crear nuevo propietario
                propietario_data = data.get('propietario', {})
                propietario = Propietario.objects.create(
                    nombre=propietario_data.get('nombre'),
                    apellido=propietario_data.get('apellido'),
                    telefono=propietario_data.get('telefono', ''),
                    email=propietario_data.get('email', ''),
                    direccion=propietario_data.get('direccion', '')
                )
            
            # Crear paciente
            paciente_data = data.get('paciente', {})
            paciente = Paciente.objects.create(
                nombre=paciente_data.get('nombre'),
                especie=paciente_data.get('especie'),
                raza=paciente_data.get('raza', ''),
                edad=paciente_data.get('edad', ''),
                sexo=paciente_data.get('sexo'),
                color=paciente_data.get('color', ''),
                microchip=paciente_data.get('microchip', ''),
                ultimo_peso=paciente_data.get('ultimo_peso'),
                observaciones=paciente_data.get('observaciones', ''),
                propietario=propietario
            )
            
            return JsonResponse({
                'success': True,
                'paciente_id': paciente.id,
                'message': 'Paciente creado exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def editar_paciente(request, paciente_id):
    """Vista para editar un paciente"""
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Actualizar propietario si se proporcionaron datos
            propietario_id = data.get('propietario_id')
            actualizar_propietario = data.get('actualizar_propietario', False)
            
            if propietario_id and actualizar_propietario:
                propietario = get_object_or_404(Propietario, id=propietario_id)
                propietario_data = data.get('propietario', {})
                propietario.nombre = propietario_data.get('nombre', propietario.nombre)
                propietario.apellido = propietario_data.get('apellido', propietario.apellido)
                propietario.telefono = propietario_data.get('telefono', propietario.telefono)
                propietario.email = propietario_data.get('email', propietario.email)
                propietario.direccion = propietario_data.get('direccion', propietario.direccion)
                propietario.save()
            
            # Actualizar datos del paciente
            paciente_data = data.get('paciente', {})
            paciente.nombre = paciente_data.get('nombre', paciente.nombre)
            paciente.especie = paciente_data.get('especie', paciente.especie)
            paciente.raza = paciente_data.get('raza', paciente.raza)
            paciente.edad = paciente_data.get('edad', paciente.edad)
            paciente.sexo = paciente_data.get('sexo', paciente.sexo)
            paciente.color = paciente_data.get('color', paciente.color)
            paciente.microchip = paciente_data.get('microchip', paciente.microchip)
            paciente.observaciones = paciente_data.get('observaciones', paciente.observaciones)
            
            if paciente_data.get('ultimo_peso'):
                paciente.ultimo_peso = paciente_data.get('ultimo_peso')
            
            paciente.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Paciente actualizado exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def eliminar_paciente(request, paciente_id):
    """Vista para eliminar (marcar como inactivo) un paciente"""
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    if request.method == 'POST':
        try:
            paciente.activo = False
            paciente.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Paciente eliminado exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

# --- PROPIETARIOS ---
@login_required
def buscar_propietarios(request):
    """Vista para buscar propietarios"""
    query = request.GET.get('q', '').strip()
    
    if len(query) < 2:
        return JsonResponse({
            'success': False,
            'error': 'La búsqueda debe tener al menos 2 caracteres'
        })
    
    propietarios = Propietario.objects.filter(
        models.Q(nombre__icontains=query) |
        models.Q(apellido__icontains=query) |
        models.Q(telefono__icontains=query) |
        models.Q(email__icontains=query)
    )[:10]
    
    return JsonResponse({
        'success': True,
        'propietarios': [{
            'id': p.id,
            'nombre_completo': p.nombre_completo,
            'telefono': p.telefono,
            'email': p.email,
        } for p in propietarios]
    })

@login_required
def detalle_propietario(request, propietario_id):
    """Vista para obtener detalles de un propietario"""
    propietario = get_object_or_404(Propietario, id=propietario_id)
    
    return JsonResponse({
        'success': True,
        'propietario': {
            'id': propietario.id,
            'nombre': propietario.nombre,
            'apellido': propietario.apellido,
            'nombre_completo': propietario.nombre_completo,
            'telefono': propietario.telefono,
            'email': propietario.email,
            'direccion': propietario.direccion,
        }
    })

# --- VETERINARIOS ---
def vet_ficha_view(request):
    return render(request, 'veterinarios/vet_ficha.html')

def vet_disponibilidad_view(request):
    return render(request, 'veterinarios/vet_disponibilidad.html')

def vet_view(request):
    return render(request, 'veterinarios/veterinarios.html')

# --- INVENTARIO ---
def inventario(request):
    insumos = Insumo.objects.all()
    return render(request, 'inventario/inventario.html', {'insumos': insumos})

@csrf_exempt
def crear_insumo(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            insumo = Insumo.objects.create(
                medicamento=data.get('medicamento'),
                categoria=data.get('categoria'),
                stock_actual=data.get('stock_actual', 0),
                precio_venta=data.get('precio_venta', 0)
            )
            return JsonResponse({'success': True, 'message': 'Insumo creado exitosamente'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
def editar_insumo(request, insumo_id):
    insumo = get_object_or_404(Insumo, id=insumo_id)
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            insumo.medicamento = data.get('medicamento', insumo.medicamento)
            insumo.categoria = data.get('categoria', insumo.categoria)
            insumo.stock_actual = data.get('stock_actual', insumo.stock_actual)
            insumo.precio_venta = data.get('precio_venta', insumo.precio_venta)
            insumo.save()
            return JsonResponse({'success': True, 'message': 'Insumo actualizado'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
def eliminar_insumo(request, insumo_id):
    insumo = get_object_or_404(Insumo, id=insumo_id)
    if request.method == 'POST':
        try:
            insumo.delete()
            return JsonResponse({'success': True, 'message': 'Insumo eliminado'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
def modificar_stock(request, insumo_id):
    insumo = get_object_or_404(Insumo, id=insumo_id)
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            insumo.stock_actual = data.get('stock_actual', insumo.stock_actual)
            insumo.save()
            return JsonResponse({'success': True, 'message': 'Stock actualizado'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

# --- SERVICIOS ---
def servicios(request):
    servicios = Servicio.objects.all()
    return render(request, 'servicios/servicios.html', {'servicios': servicios})

@csrf_exempt
def crear_servicio(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            servicio = Servicio.objects.create(
                nombre=data.get('nombre'),
                categoria=data.get('categoria'),
                precio=data.get('precio', 0),
                duracion=data.get('duracion', 0)
            )
            return JsonResponse({'success': True, 'message': 'Servicio creado'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
def editar_servicio(request, servicio_id):
    servicio = get_object_or_404(Servicio, id=servicio_id)
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            servicio.nombre = data.get('nombre', servicio.nombre)
            servicio.categoria = data.get('categoria', servicio.categoria)
            servicio.precio = data.get('precio', servicio.precio)
            servicio.duracion = data.get('duracion', servicio.duracion)
            servicio.save()
            return JsonResponse({'success': True, 'message': 'Servicio actualizado'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
def eliminar_servicio(request, servicio_id):
    servicio = get_object_or_404(Servicio, id=servicio_id)
    if request.method == 'POST':
        try:
            servicio.delete()
            return JsonResponse({'success': True, 'message': 'Servicio eliminado'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

# --- DASHBOARD ---
def test_view(request):
    return render(request, 'test.html')

def dashboard_pacientes(request):
    return render(request, 'dashboard_pacientes.html')











