from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db import models
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
import json
from datetime import date, datetime
from .models import Paciente, Propietario

# Importar desde las apps correctas
from inventario.models import Insumo
from servicios.models import Servicio

# Importar solo si existen
try:
    from clinica.models import Consulta, Examen, Documento
    from hospital.models import Hospitalizacion
    MODELOS_EXTENDIDOS = True
except ImportError:
    MODELOS_EXTENDIDOS = False

@login_required
def pacientes_view(request):
    """Vista para listar todos los pacientes"""
    pacientes = Paciente.objects.select_related('propietario').filter(activo=True).order_by('-fecha_registro')
    context = {'pacientes': pacientes}
    return render(request, 'pacientes/pacientes.html', context)

@login_required
def ficha_mascota_view(request, paciente_id):
    """Vista de la ficha de la mascota"""
    from cuentas.models import CustomUser
    
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    # Obtener consultas con medicamentos (ahora funcionará)
    consultas = paciente.consultas.prefetch_related('medicamentos').all()
    
    # Obtener otros datos relacionados
    hospitalizaciones = paciente.hospitalizaciones.all() if hasattr(paciente, 'hospitalizaciones') else []
    examenes = paciente.examenes.all() if hasattr(paciente, 'examenes') else []
    documentos = paciente.documentos.all() if hasattr(paciente, 'documentos') else []
    
    # ⭐ OBTENER VETERINARIOS CON FALLBACK
    veterinarios = CustomUser.objects.filter(rol='veterinario').order_by('nombre', 'apellido')
    
    # Si no hay con rol='veterinario', excluir administración y recepción
    if veterinarios.count() == 0:
        veterinarios = CustomUser.objects.exclude(
            rol__in=['administracion', 'recepcion']
        ).order_by('nombre', 'apellido')
    
    # Si aún no hay, usar todos los usuarios
    if veterinarios.count() == 0:
        veterinarios = CustomUser.objects.all().order_by('nombre', 'apellido')
    
    # ⭐ OBTENER PROPIETARIOS
    propietarios = Propietario.objects.all().order_by('nombre', 'apellido')
    
    # Serializar datos del paciente para JavaScript
    paciente_data = {
        'id': paciente.id,
        'nombre': paciente.nombre,
        'especie': paciente.especie,
        'peso': float(paciente.ultimo_peso) if paciente.ultimo_peso else None,
        'edad': paciente.edad_formateada,
        'propietario': paciente.propietario.nombre_completo,
    }
    
    context = {
        'paciente': paciente,
        'paciente_data_json': paciente_data,
        'consultas': consultas,
        'hospitalizaciones': hospitalizaciones,
        'examenes': examenes,
        'documentos': documentos,
        'veterinarios': veterinarios,  # ⭐ AGREGAR VETERINARIOS
        'propietarios': propietarios,  # ⭐ AGREGAR PROPIETARIOS
    }
    
    return render(request, 'consulta/ficha_mascota.html', context)

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
            
            propietario_id = data.get('propietario_id')
            actualizar_propietario = data.get('actualizar_propietario', False)
            
            if propietario_id:
                propietario = get_object_or_404(Propietario, id=propietario_id)
                if actualizar_propietario:
                    propietario_data = data.get('propietario', {})
                    propietario.nombre = propietario_data.get('nombre', propietario.nombre)
                    propietario.apellido = propietario_data.get('apellido', propietario.apellido)
                    propietario.telefono = propietario_data.get('telefono', propietario.telefono)
                    propietario.email = propietario_data.get('email', propietario.email)
                    propietario.direccion = propietario_data.get('direccion', propietario.direccion)
                    propietario.save()
            else:
                propietario_data = data.get('propietario', {})
                propietario = Propietario.objects.create(
                    nombre=propietario_data.get('nombre'),
                    apellido=propietario_data.get('apellido'),
                    telefono=propietario_data.get('telefono', ''),
                    email=propietario_data.get('email', ''),
                    direccion=propietario_data.get('direccion', '')
                )
            
            paciente_data = data.get('paciente', {})
            paciente = Paciente.objects.create(
                nombre=paciente_data.get('nombre'),
                especie=paciente_data.get('especie'),
                raza=paciente_data.get('raza', ''),
                edad_anos=paciente_data.get('edad_anos'),
                edad_meses=paciente_data.get('edad_meses'),
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
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@require_http_methods(["POST"])
@csrf_exempt
@login_required
def editar_paciente(request, paciente_id):
    """Vista para editar un paciente"""
    try:
        paciente = get_object_or_404(Paciente, id=paciente_id)
        
        data = {}
        for key in request.POST:
            data[key] = request.POST[key]
        
        campos_basicos = ['nombre', 'especie', 'raza', 'sexo', 'color', 'microchip', 'observaciones']
        for campo in campos_basicos:
            if campo in data:
                setattr(paciente, campo, data[campo] or '')
        
        tipo_edad = data.get('tipo_edad')
        
        if tipo_edad == 'fecha':
            fecha_nac = data.get('fecha_nacimiento')
            if fecha_nac:
                fecha_obj = datetime.strptime(fecha_nac, '%Y-%m-%d').date()
                
                if fecha_obj > date.today():
                    return JsonResponse({
                        'success': False,
                        'error': 'La fecha de nacimiento no puede ser futura'
                    }, status=400)
                
                paciente.fecha_nacimiento = fecha_obj
                paciente.edad_anos = None
                paciente.edad_meses = None
        elif tipo_edad == 'estimada':
            paciente.fecha_nacimiento = None
            edad_anos = data.get('edad_anos')
            edad_meses = data.get('edad_meses')
            paciente.edad_anos = int(edad_anos) if edad_anos and edad_anos.strip() else None
            paciente.edad_meses = int(edad_meses) if edad_meses and edad_meses.strip() else None
        
        if 'propietario_id' in data and data['propietario_id']:
            propietario = get_object_or_404(Propietario, id=data['propietario_id'])
            paciente.propietario = propietario
            
            if 'propietario_nombre_edit' in data:
                propietario.nombre = data['propietario_nombre_edit']
            if 'propietario_apellido_edit' in data:
                propietario.apellido = data['propietario_apellido_edit']
            if 'propietario_telefono' in data:
                propietario.telefono = data['propietario_telefono']
            if 'propietario_email' in data:
                propietario.email = data['propietario_email']
            if 'propietario_direccion' in data:
                propietario.direccion = data['propietario_direccion']
            
            propietario.save()
        elif 'propietario_nombre_edit' in data and data['propietario_nombre_edit']:
            nuevo_propietario = Propietario.objects.create(
                nombre=data.get('propietario_nombre_edit', ''),
                apellido=data.get('propietario_apellido_edit', ''),
                telefono=data.get('propietario_telefono', ''),
                email=data.get('propietario_email', ''),
                direccion=data.get('propietario_direccion', '')
            )
            paciente.propietario = nuevo_propietario
        
        paciente.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Paciente actualizado correctamente',
            'edad_formateada': paciente.edad_formateada,
            'debug': {
                'fecha_nacimiento': str(paciente.fecha_nacimiento) if paciente.fecha_nacimiento else None,
                'edad_anos': paciente.edad_anos,
                'edad_meses': paciente.edad_meses
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
@login_required
def eliminar_paciente(request, paciente_id):
    """Vista para eliminar (marcar como inactivo) un paciente"""
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    if request.method == 'POST':
        try:
            paciente.activo = False
            paciente.save()
            return JsonResponse({'success': True, 'message': 'Paciente eliminado exitosamente'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

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
            'nombre': p.nombre,
            'apellido': p.apellido,
            'nombre_completo': p.nombre_completo,
            'telefono': p.telefono or '',
            'email': p.email or '',
            'direccion': p.direccion or '',
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
