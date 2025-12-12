from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Q
import json
from datetime import date, datetime, timedelta, time
from pacientes.models import Paciente
from servicios.models import Servicio
from cuentas.models import CustomUser
from .models import Cita, DisponibilidadVeterinario, HorarioFijoVeterinario

@login_required
def agenda(request):
    """Vista principal de la agenda"""
    # Obtener veterinarios activos
    veterinarios = CustomUser.objects.filter(
        rol='veterinario',
        is_active=True
    ).order_by('nombre', 'apellido')
    
    # Obtener pacientes activos
    pacientes = Paciente.objects.filter(activo=True).select_related('propietario')
    
    # Obtener servicios
    servicios = Servicio.objects.all().order_by('categoria', 'nombre')

    veterinarios_json = json.dumps(list(veterinarios.values('id', 'nombre', 'apellido', 'rol')), cls=DjangoJSONEncoder)
    servicios_json = json.dumps(
        list(servicios.values('idServicio', 'nombre', 'categoria', 'duracion', 'precio')),
        cls=DjangoJSONEncoder
    )
    
    context = {
        'veterinarios': veterinarios,
        'pacientes': pacientes,
        'servicios': servicios,
        'veterinarios_json': veterinarios_json,
        'servicios_json': servicios_json,
    }
    return render(request, 'agenda/agenda.html', context)

@login_required
def citas_dia(request, year, month, day):
    """Vista para obtener citas de un día específico"""
    fecha = date(year, month, day)
    citas = Cita.objects.filter(fecha=fecha).select_related('paciente', 'veterinario')
    
    citas_data = [{
        'id': cita.id,
        'paciente': cita.paciente.nombre,
        'paciente_id': cita.paciente.id,
        'veterinario': f"{cita.veterinario.nombre} {cita.veterinario.apellido}" if cita.veterinario else 'Sin asignar',
        'veterinario_id': cita.veterinario.id if cita.veterinario else None,
        'servicio': cita.servicio.nombre if cita.servicio else '',
        'servicio_id': cita.servicio.idServicio if cita.servicio else None,
        'hora_inicio': cita.hora_inicio.strftime('%H:%M'),
        'hora_fin': cita.hora_fin.strftime('%H:%M') if cita.hora_fin else '',
        'tipo': cita.tipo,
        'tipo_display': cita.get_tipo_display(),
        'estado': cita.estado,
        'estado_display': cita.get_estado_display(),
        'motivo': cita.motivo,
        'notas': cita.notas or '',
    } for cita in citas]
    
    return JsonResponse({'success': True, 'citas': citas_data})

@csrf_exempt
@login_required
def crear_cita(request):
    """Vista para crear una nueva cita"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Validar disponibilidad del veterinario
            veterinario_id = data.get('veterinario_id')
            fecha_str = data.get('fecha')
            hora_inicio_str = data.get('hora_inicio')
            
            if veterinario_id and fecha_str and hora_inicio_str:
                fecha_cita = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                hora_inicio_cita = datetime.strptime(hora_inicio_str, '%H:%M').time()
                dia_semana = fecha_cita.weekday()
                
                # Verificar si tiene horario fijo para ese día
                horario_fijo = HorarioFijoVeterinario.objects.filter(
                    veterinario_id=veterinario_id,
                    dia_semana=dia_semana,
                    activo=True,
                    hora_inicio__lte=hora_inicio_cita,
                    hora_fin__gt=hora_inicio_cita
                ).exists()
                
                # Verificar si hay excepción (ausencia) para esa fecha
                excepcion = DisponibilidadVeterinario.objects.filter(
                    veterinario_id=veterinario_id,
                    fecha=fecha_cita,
                    tipo__in=['vacaciones', 'licencia', 'ausencia']
                ).exists()
                
                if not horario_fijo:
                    return JsonResponse({
                        'success': False, 
                        'error': 'El veterinario no tiene disponibilidad configurada para este día'
                    }, status=400)
                
                if excepcion:
                    return JsonResponse({
                        'success': False, 
                        'error': 'El veterinario no está disponible en esta fecha (vacaciones/licencia)'
                    }, status=400)
            
            cita = Cita(
                paciente_id=data.get('paciente_id'),
                veterinario_id=veterinario_id,
                servicio_id=data.get('servicio_id'),
                fecha=data.get('fecha'),
                hora_inicio=data.get('hora_inicio'),
                hora_fin=data.get('hora_fin'),
                tipo=data.get('tipo', 'consulta'),
                estado=data.get('estado', 'pendiente'),
                motivo=data.get('motivo', ''),
                notas=data.get('notas', ''),
            )
            cita.save()
            
            return JsonResponse({
                'success': True,
                'cita_id': cita.id,
                'cita': {
                    'id': cita.id,
                    'paciente': cita.paciente.nombre,
                    'veterinario': f"{cita.veterinario.nombre} {cita.veterinario.apellido}" if cita.veterinario else '',
                    'servicio': cita.servicio.nombre if cita.servicio else '',
                    'fecha': cita.fecha.isoformat(),
                    'hora_inicio': cita.hora_inicio.strftime('%H:%M'),
                    'hora_fin': cita.hora_fin.strftime('%H:%M') if cita.hora_fin else '',
                    'tipo': cita.tipo,
                    'estado': cita.estado,
                },
                'message': 'Cita creada exitosamente'
            })
            
        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def editar_cita(request, cita_id):
    """Vista para editar una cita"""
    if request.method == 'POST':
        try:
            cita = get_object_or_404(Cita, id=cita_id)
            data = json.loads(request.body)
            
            cita.paciente_id = data.get('paciente_id', cita.paciente_id)
            cita.veterinario_id = data.get('veterinario_id', cita.veterinario_id)
            cita.servicio_id = data.get('servicio_id', cita.servicio_id)
            cita.fecha = data.get('fecha', cita.fecha)
            cita.hora_inicio = data.get('hora_inicio', cita.hora_inicio)
            cita.hora_fin = data.get('hora_fin', cita.hora_fin)
            cita.tipo = data.get('tipo', cita.tipo)
            cita.estado = data.get('estado', cita.estado)
            cita.motivo = data.get('motivo', cita.motivo)
            cita.notas = data.get('notas', cita.notas)
            cita.save()
            
            return JsonResponse({
                'success': True,
                'cita': {
                    'id': cita.id,
                    'paciente': cita.paciente.nombre,
                    'veterinario': f"{cita.veterinario.nombre} {cita.veterinario.apellido}" if cita.veterinario else '',
                    'servicio': cita.servicio.nombre if cita.servicio else '',
                    'fecha': cita.fecha.isoformat(),
                    'hora_inicio': cita.hora_inicio.strftime('%H:%M'),
                    'hora_fin': cita.hora_fin.strftime('%H:%M') if cita.hora_fin else '',
                    'tipo': cita.tipo,
                    'estado': cita.estado,
                },
                'message': 'Cita actualizada exitosamente'
            })
            
        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def eliminar_cita(request, cita_id):
    """Vista para eliminar una cita"""
    if request.method == 'POST':
        try:
            cita = Cita.objects.get(id=cita_id)
            cita.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Cita eliminada exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


# ============================================
#  VISTAS DE DISPONIBILIDAD DE VETERINARIOS
# ============================================

@login_required
def disponibilidad_mes(request, year, month):
    """Obtener disponibilidad de todos los veterinarios para un mes"""
    try:
        fecha_inicio = date(year, month, 1)
        if month == 12:
            fecha_fin = date(year + 1, 1, 1)
        else:
            fecha_fin = date(year, month + 1, 1)
        
        disponibilidades = DisponibilidadVeterinario.objects.filter(
            fecha__gte=fecha_inicio,
            fecha__lt=fecha_fin
        ).select_related('veterinario').order_by('fecha', 'hora_inicio')
        
        data = []
        for disp in disponibilidades:
            data.append({
                'id': disp.id,
                'veterinario_id': disp.veterinario.id,
                'veterinario_nombre': f"{disp.veterinario.nombre} {disp.veterinario.apellido}",
                'fecha': disp.fecha.isoformat(),
                'hora_inicio': disp.hora_inicio.strftime('%H:%M'),
                'hora_fin': disp.hora_fin.strftime('%H:%M'),
                'tipo': disp.tipo,
                'tipo_display': disp.get_tipo_display(),
                'notas': disp.notas or '',
            })
        
        return JsonResponse({'success': True, 'disponibilidades': data})
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
def disponibilidad_dia(request, year, month, day):
    """Obtener disponibilidad de todos los veterinarios para un día específico"""
    try:
        fecha = date(year, month, day)
        
        disponibilidades = DisponibilidadVeterinario.objects.filter(
            fecha=fecha
        ).select_related('veterinario').order_by('veterinario__nombre', 'hora_inicio')
        
        data = []
        for disp in disponibilidades:
            data.append({
                'id': disp.id,
                'veterinario_id': disp.veterinario.id,
                'veterinario_nombre': f"{disp.veterinario.nombre} {disp.veterinario.apellido}",
                'hora_inicio': disp.hora_inicio.strftime('%H:%M'),
                'hora_fin': disp.hora_fin.strftime('%H:%M'),
                'tipo': disp.tipo,
                'tipo_display': disp.get_tipo_display(),
                'notas': disp.notas or '',
            })
        
        return JsonResponse({'success': True, 'fecha': fecha.isoformat(), 'disponibilidades': data})
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@csrf_exempt
@login_required
def crear_disponibilidad(request):
    """Crear nueva disponibilidad de veterinario"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Validar permisos: solo el veterinario mismo o un administrador puede crear disponibilidad
            veterinario_id = data.get('veterinario_id')
            if request.user.rol != 'administracion' and request.user.id != veterinario_id:
                return JsonResponse({
                    'success': False,
                    'error': 'No tiene permisos para crear disponibilidad para otro veterinario'
                }, status=403)
            
            disponibilidad = DisponibilidadVeterinario(
                veterinario_id=veterinario_id,
                fecha=data.get('fecha'),
                hora_inicio=data.get('hora_inicio'),
                hora_fin=data.get('hora_fin'),
                tipo=data.get('tipo', 'disponible'),
                notas=data.get('notas', '')
            )
            disponibilidad.save()
            
            return JsonResponse({
                'success': True,
                'disponibilidad_id': disponibilidad.id,
                'message': 'Disponibilidad creada exitosamente'
            })
            
        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


@csrf_exempt
@login_required
def editar_disponibilidad(request, disponibilidad_id):
    """Editar disponibilidad existente"""
    if request.method == 'POST':
        try:
            disponibilidad = get_object_or_404(DisponibilidadVeterinario, id=disponibilidad_id)
            
            # Validar permisos
            if request.user.rol != 'administracion' and request.user.id != disponibilidad.veterinario_id:
                return JsonResponse({
                    'success': False,
                    'error': 'No tiene permisos para editar esta disponibilidad'
                }, status=403)
            
            data = json.loads(request.body)
            
            disponibilidad.fecha = data.get('fecha', disponibilidad.fecha)
            disponibilidad.hora_inicio = data.get('hora_inicio', disponibilidad.hora_inicio)
            disponibilidad.hora_fin = data.get('hora_fin', disponibilidad.hora_fin)
            disponibilidad.tipo = data.get('tipo', disponibilidad.tipo)
            disponibilidad.notas = data.get('notas', disponibilidad.notas)
            disponibilidad.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Disponibilidad actualizada exitosamente'
            })
            
        except ValidationError as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


@csrf_exempt
@login_required
def eliminar_disponibilidad(request, disponibilidad_id):
    """Eliminar disponibilidad"""
    if request.method == 'POST':
        try:
            disponibilidad = get_object_or_404(DisponibilidadVeterinario, id=disponibilidad_id)
            
            # Validar permisos
            if request.user.rol != 'administracion' and request.user.id != disponibilidad.veterinario_id:
                return JsonResponse({
                    'success': False,
                    'error': 'No tiene permisos para eliminar esta disponibilidad'
                }, status=403)
            
            disponibilidad.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Disponibilidad eliminada exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


@login_required
def slots_disponibles(request, veterinario_id, year, month, day):
    """
    Obtener slots de tiempo disponibles para un veterinario en un día específico.
    Retorna bloques de 15 minutos que están disponibles.
    """
    try:
        fecha = date(year, month, day)
        veterinario = get_object_or_404(CustomUser, id=veterinario_id, rol='veterinario')
        
        # Obtener disponibilidades del veterinario para ese día
        disponibilidades = DisponibilidadVeterinario.objects.filter(
            veterinario=veterinario,
            fecha=fecha,
            tipo='disponible'
        ).order_by('hora_inicio')
        
        if not disponibilidades.exists():
            return JsonResponse({
                'success': True,
                'fecha': fecha.isoformat(),
                'slots': [],
                'message': 'El veterinario no tiene disponibilidad configurada para este día'
            })
        
        # Obtener citas existentes del veterinario para ese día
        citas = Cita.objects.filter(
            veterinario=veterinario,
            fecha=fecha,
            estado__in=['pendiente', 'confirmada', 'en_curso']
        ).order_by('hora_inicio')
        
        # Generar slots disponibles
        slots_disponibles = []
        
        for disp in disponibilidades:
            # Generar slots de 15 minutos dentro de la disponibilidad
            hora_actual = datetime.combine(fecha, disp.hora_inicio)
            hora_fin = datetime.combine(fecha, disp.hora_fin)
            
            while hora_actual < hora_fin:
                slot_inicio = hora_actual.time()
                slot_fin = (hora_actual + timedelta(minutes=15)).time()
                
                # Verificar si el slot está ocupado por alguna cita
                slot_ocupado = False
                for cita in citas:
                    if cita.hora_fin:
                        if slot_inicio < cita.hora_fin and slot_fin > cita.hora_inicio:
                            slot_ocupado = True
                            break
                
                if not slot_ocupado:
                    slots_disponibles.append({
                        'hora': slot_inicio.strftime('%H:%M'),
                        'disponible': True
                    })
                
                hora_actual += timedelta(minutes=15)
        
        return JsonResponse({
            'success': True,
            'fecha': fecha.isoformat(),
            'veterinario': f"{veterinario.nombre} {veterinario.apellido}",
            'slots': slots_disponibles
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


# ============================================
# VISTAS DE HORARIOS FIJOS
# ============================================

@login_required
@require_http_methods(["GET"])
def horarios_fijos(request, veterinario_id):
    """Obtener horarios fijos de un veterinario"""
    try:
        veterinario = get_object_or_404(CustomUser, pk=veterinario_id, rol='veterinario')
        horarios = HorarioFijoVeterinario.objects.filter(
            veterinario=veterinario,
            activo=True
        ).order_by('dia_semana', 'hora_inicio')
        
        horarios_data = []
        for horario in horarios:
            horarios_data.append({
                'id': horario.id,
                'dia_semana': horario.dia_semana,
                'dia_nombre': horario.get_dia_semana_display(),
                'hora_inicio': horario.hora_inicio.strftime('%H:%M'),
                'hora_fin': horario.hora_fin.strftime('%H:%M'),
                'notas': horario.notas or ''
            })
        
        return JsonResponse({
            'success': True,
            'horarios': horarios_data
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["POST"])
def crear_horario_fijo(request):
    """Crear un nuevo horario fijo"""
    try:
        data = json.loads(request.body)
        veterinario = get_object_or_404(CustomUser, pk=data['veterinario_id'], rol='veterinario')
        
        horario = HorarioFijoVeterinario.objects.create(
            veterinario=veterinario,
            dia_semana=int(data['dia_semana']),
            hora_inicio=data['hora_inicio'],
            hora_fin=data['hora_fin'],
            notas=data.get('notas', '')
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Horario fijo creado exitosamente',
            'horario_id': horario.id
        })
    
    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["POST"])
def editar_horario_fijo(request, horario_id):
    """Editar un horario fijo existente"""
    try:
        data = json.loads(request.body)
        horario = get_object_or_404(HorarioFijoVeterinario, pk=horario_id)
        
        horario.dia_semana = int(data.get('dia_semana', horario.dia_semana))
        horario.hora_inicio = data.get('hora_inicio', horario.hora_inicio)
        horario.hora_fin = data.get('hora_fin', horario.hora_fin)
        horario.notas = data.get('notas', horario.notas)
        horario.activo = data.get('activo', horario.activo)
        
        horario.full_clean()
        horario.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Horario fijo actualizado exitosamente'
        })
    
    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["POST"])
def eliminar_horario_fijo(request, horario_id):
    """Eliminar (desactivar) un horario fijo"""
    try:
        horario = get_object_or_404(HorarioFijoVeterinario, pk=horario_id)
        horario.activo = False
        horario.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Horario fijo eliminado exitosamente'
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
