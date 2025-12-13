""" Vista para horario semanal del veterinario - APPEND a agenda/views.py """

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
    """Guardar el horario semanal completo de un veterinario"""
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
        
        return JsonResponse({
            'success': True,
            'message': 'Horario semanal guardado correctamente'
        })
    
    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
