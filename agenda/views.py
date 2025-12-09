from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import date
from pacientes.models import Paciente
from .models import Cita

@login_required
def agenda(request):
    """Vista principal de la agenda"""
    citas = Cita.objects.select_related('paciente', 'veterinario').all()
    pacientes = Paciente.objects.filter(activo=True).select_related('propietario')
    
    context = {
        'citas': citas,
        'pacientes': pacientes,
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
        'veterinario': f"{cita.veterinario.first_name} {cita.veterinario.last_name}" if cita.veterinario else 'Sin asignar',
        'hora_inicio': cita.hora_inicio.strftime('%H:%M'),
        'hora_fin': cita.hora_fin.strftime('%H:%M') if cita.hora_fin else '',
        'tipo': cita.get_tipo_display(),
        'estado': cita.get_estado_display(),
        'motivo': cita.motivo,
    } for cita in citas]
    
    return JsonResponse({'success': True, 'citas': citas_data})

@csrf_exempt
@login_required
def crear_cita(request):
    """Vista para crear una nueva cita"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            cita = Cita.objects.create(
                paciente_id=data.get('paciente_id'),
                veterinario_id=data.get('veterinario_id'),
                fecha=data.get('fecha'),
                hora_inicio=data.get('hora_inicio'),
                hora_fin=data.get('hora_fin'),
                tipo=data.get('tipo', 'consulta'),
                motivo=data.get('motivo', ''),
                notas=data.get('notas', ''),
            )
            
            return JsonResponse({
                'success': True,
                'cita_id': cita.id,
                'message': 'Cita creada exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def editar_cita(request, cita_id):
    """Vista para editar una cita"""
    if request.method == 'POST':
        try:
            cita = Cita.objects.get(id=cita_id)
            data = json.loads(request.body)
            
            cita.paciente_id = data.get('paciente_id', cita.paciente_id)
            cita.veterinario_id = data.get('veterinario_id', cita.veterinario_id)
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
                'message': 'Cita actualizada exitosamente'
            })
            
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
