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
from .models import (
    Cita,
    DisponibilidadVeterinario,
    HorarioFijoVeterinario,
    DisponibilidadBloquesDia,
    time_to_block_index,
    block_index_to_time,
    BLOCK_MINUTES,
)


def _build_day_blocks(availability: DisponibilidadBloquesDia, citas_qs):
    """Construye la lista de 96 bloques con estado available/occupied/unavailable."""
    blocks = []
    for idx in range(96):
        start_t = block_index_to_time(idx)
        end_t = block_index_to_time(idx + 1)
        blocks.append({
            'block_index': idx,
            'start_time': start_t.strftime('%H:%M'),
            'end_time': end_t.strftime('%H:%M'),
            'status': 'unavailable',
            'label': '',
        })

    if availability and availability.trabaja:
        for rng in availability.rangos:
            for idx in range(rng['start_block'], rng['end_block']):
                blocks[idx]['status'] = 'available'

    # Marcar ocupados por citas
    for cita in citas_qs:
        try:
            start_block = cita.start_block if cita.start_block is not None else time_to_block_index(cita.hora_inicio)
            end_block = cita.end_block if cita.end_block is not None else time_to_block_index(cita.hora_fin)
        except ValidationError:
            continue

        for idx in range(start_block, end_block):
            if 0 <= idx < 96:
                blocks[idx]['status'] = 'occupied'
                blocks[idx]['label'] = cita.paciente.nombre if cita.paciente_id else 'Ocupado'

    return blocks

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
# NUEVAS VISTAS BASADAS EN BLOQUES DE 15 MIN
# ============================================


@login_required
@require_http_methods(["GET"])
def agenda_bloques_dia(request, veterinario_id, year, month, day):
    """Devuelve los 96 bloques del día con estado available/occupied/unavailable."""
    try:
        fecha = date(year, month, day)
        veterinario = get_object_or_404(CustomUser, id=veterinario_id, rol='veterinario')

        disponibilidad = DisponibilidadBloquesDia.objects.filter(
            veterinario=veterinario,
            fecha=fecha
        ).first()

        citas = Cita.objects.filter(
            veterinario=veterinario,
            fecha=fecha,
            estado__in=['pendiente', 'confirmada', 'en_curso']
        ).select_related('paciente')

        blocks = _build_day_blocks(disponibilidad, citas)

        return JsonResponse({
            'success': True,
            'fecha': fecha.isoformat(),
            'veterinario': f"{veterinario.nombre} {veterinario.apellido}",
            'trabaja': bool(disponibilidad.trabaja) if disponibilidad else False,
            'blocks': blocks,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def agendar_cita_por_bloques(request):
    """Crea una cita usando bloque_inicio + servicio (calcula bloques requeridos)."""
    try:
        data = json.loads(request.body)
        paciente_id = data.get('paciente_id')
        servicio_id = data.get('servicio_id')
        veterinario_id = data.get('veterinario_id')
        fecha_str = data.get('fecha')
        hora_inicio_str = data.get('hora_inicio')

        if not all([paciente_id, servicio_id, veterinario_id, fecha_str, hora_inicio_str]):
            return JsonResponse({'success': False, 'error': 'Faltan datos requeridos.'}, status=400)

        fecha_cita = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        hora_inicio = datetime.strptime(hora_inicio_str, '%H:%M').time()
        start_block = time_to_block_index(hora_inicio)

        servicio = get_object_or_404(Servicio, pk=servicio_id)
        blocks_required = servicio.blocks_required
        end_block = start_block + blocks_required
        if end_block > 96:
            return JsonResponse({'success': False, 'error': 'El servicio no cabe al final del día.'}, status=400)

        disponibilidad = DisponibilidadBloquesDia.objects.filter(
            veterinario_id=veterinario_id,
            fecha=fecha_cita
        ).first()

        if not disponibilidad or not disponibilidad.trabaja:
            return JsonResponse({'success': False, 'error': 'El veterinario no trabaja este día.'}, status=400)

        dentro = any(
            rng['start_block'] <= start_block and end_block <= rng['end_block']
            for rng in disponibilidad.rangos
        )
        if not dentro:
            return JsonResponse({'success': False, 'error': 'Fuera de la disponibilidad configurada.'}, status=400)

        citas = Cita.objects.filter(
            veterinario_id=veterinario_id,
            fecha=fecha_cita,
            estado__in=['pendiente', 'confirmada', 'en_curso']
        )

        for cita in citas:
            c_start = cita.start_block if cita.start_block is not None else time_to_block_index(cita.hora_inicio)
            c_end = cita.end_block if cita.end_block is not None else time_to_block_index(cita.hora_fin)
            if start_block < c_end and end_block > c_start:
                return JsonResponse({
                    'success': False,
                    'error': f'Bloques ocupados por otra cita {cita.hora_inicio.strftime("%H:%M")} - {cita.hora_fin.strftime("%H:%M")}.',
                }, status=400)

        cita = Cita(
            paciente_id=paciente_id,
            veterinario_id=veterinario_id,
            servicio_id=servicio_id,
            fecha=fecha_cita,
            hora_inicio=hora_inicio,
            start_block=start_block,
            end_block=end_block,
            tipo=data.get('tipo', 'consulta'),
            estado=data.get('estado', 'pendiente'),
            motivo=data.get('motivo', ''),
            notas=data.get('notas', ''),
        )
        cita.save()

        return JsonResponse({
            'success': True,
            'cita_id': cita.id,
            'hora_fin': cita.hora_fin.strftime('%H:%M') if cita.hora_fin else None,
            'start_block': cita.start_block,
            'end_block': cita.end_block,
            'message': 'Cita creada exitosamente.'
        })

    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
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


def _generar_disponibilidades_desde_horario_semanal(veterinario, semanas=8):
    """
    Genera DisponibilidadBloquesDia para un veterinario basándose en su HorarioFijoVeterinario.
    Genera disponibilidades para las próximas 'semanas' semanas desde hoy.
    """
    from datetime import date, timedelta
    
    # Obtener todos los horarios fijos activos del veterinario
    horarios_fijos = HorarioFijoVeterinario.objects.filter(
        veterinario=veterinario,
        activo=True
    ).order_by('dia_semana', 'hora_inicio')
    
    if not horarios_fijos.exists():
        return
    
    # Agrupar horarios por día de la semana
    horarios_por_dia = {}
    for h in horarios_fijos:
        if h.dia_semana not in horarios_por_dia:
            horarios_por_dia[h.dia_semana] = []
        horarios_por_dia[h.dia_semana].append(h)
    
    # Generar disponibilidades para las próximas semanas
    fecha_inicio = date.today()
    fecha_fin = fecha_inicio + timedelta(weeks=semanas)
    
    fecha_actual = fecha_inicio
    while fecha_actual <= fecha_fin:
        # Obtener el día de la semana (0=lunes, 6=domingo)
        dia_semana = fecha_actual.weekday()
        
        # Si hay horarios para este día, crear/actualizar disponibilidad
        if dia_semana in horarios_por_dia:
            horarios = horarios_por_dia[dia_semana]
            
            # Convertir horarios a bloques
            rangos_bloques = []
            for h in horarios:
                start_block = time_to_block_index(h.hora_inicio)
                end_block = time_to_block_index(h.hora_fin)
                rangos_bloques.append({
                    'start_block': start_block,
                    'end_block': end_block
                })
            
            # Crear o actualizar disponibilidad
            disp, created = DisponibilidadBloquesDia.objects.get_or_create(
                veterinario=veterinario,
                fecha=fecha_actual,
                defaults={
                    'trabaja': True,
                    'rangos': rangos_bloques,
                    'notas': 'Generado automáticamente desde horario semanal'
                }
            )
            
            # Si ya existía, actualizar solo si fue generado automáticamente
            if not created and (disp.notas == 'Generado automáticamente desde horario semanal' or disp.notas == 'No trabaja este día'):
                disp.trabaja = True
                disp.rangos = rangos_bloques
                disp.notas = 'Generado automáticamente desde horario semanal'
                disp.save()
        else:
            # Si no hay horarios para este día, marcar como no trabaja
            disp, created = DisponibilidadBloquesDia.objects.get_or_create(
                veterinario=veterinario,
                fecha=fecha_actual,
                defaults={
                    'trabaja': False,
                    'rangos': [],
                    'notas': 'No trabaja este día'
                }
            )
            
            # Si ya existía, actualizar solo si no tiene notas personalizadas
            if not created and (disp.notas == 'No trabaja este día' or disp.notas == 'Generado automáticamente desde horario semanal'):
                disp.trabaja = False
                disp.rangos = []
                disp.save()
        
        fecha_actual += timedelta(days=1)


@login_required
@require_http_methods(["POST"])
def regenerar_disponibilidades_veterinario(request, veterinario_id):
    """Regenera las disponibilidades diarias para un veterinario desde su horario semanal"""
    try:
        veterinario = get_object_or_404(CustomUser, pk=veterinario_id, rol='veterinario')
        _generar_disponibilidades_desde_horario_semanal(veterinario, semanas=8)
        
        return JsonResponse({
            'success': True,
            'message': 'Disponibilidades regeneradas correctamente'
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["GET"])
def obtener_horario_semanal(request, veterinario_id):
    """Obtener el horario semanal de un veterinario"""
    try:
        veterinario = get_object_or_404(CustomUser, pk=veterinario_id, rol='veterinario')
        horarios = HorarioFijoVeterinario.objects.filter(
            veterinario=veterinario,
            activo=True
        ).order_by('dia_semana', 'hora_inicio')
        
        # Agrupar por día de semana
        horarios_por_dia = {}
        for h in horarios:
            if h.dia_semana not in horarios_por_dia:
                horarios_por_dia[h.dia_semana] = {
                    'dia_semana': h.dia_semana,
                    'rangos': []
                }
            horarios_por_dia[h.dia_semana]['rangos'].append({
                'start': h.hora_inicio.strftime('%H:%M'),
                'end': h.hora_fin.strftime('%H:%M')
            })
        
        return JsonResponse({
            'success': True,
            'horarios': list(horarios_por_dia.values())
        })
    
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["POST"])
def guardar_horario_semanal(request):
    """Guardar el horario semanal completo de un veterinario y generar disponibilidades diarias"""
    try:
        data = json.loads(request.body)
        veterinario_id = data.get('veterinario_id')
        horarios = data.get('horarios', [])
        
        veterinario = get_object_or_404(CustomUser, pk=veterinario_id, rol='veterinario')
        
        # Eliminar horarios previos
        HorarioFijoVeterinario.objects.filter(veterinario=veterinario).delete()
        
        # Crear nuevos horarios
        for horario_data in horarios:
            dia_semana = horario_data.get('dia_semana')
            rangos = horario_data.get('rangos', [])
            
            for rango in rangos:
                inicio_str = rango.get('start')
                fin_str = rango.get('end')
                
                hora_inicio = datetime.strptime(inicio_str, '%H:%M').time()
                hora_fin = datetime.strptime(fin_str, '%H:%M').time()
                
                h = HorarioFijoVeterinario(
                    veterinario=veterinario,
                    dia_semana=dia_semana,
                    hora_inicio=hora_inicio,
                    hora_fin=hora_fin,
                    activo=True
                )
                h.full_clean()
                h.save()
        
        # Generar disponibilidades diarias para las próximas 8 semanas
        _generar_disponibilidades_desde_horario_semanal(veterinario, semanas=8)
        
        return JsonResponse({
            'success': True,
            'message': 'Horario semanal guardado correctamente'
        })
    
    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

