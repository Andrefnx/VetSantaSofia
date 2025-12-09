from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from .models import Consulta
from pacientes.models import Paciente
import json

@login_required
def consulta_view(request):
    """Vista para el módulo de consultas"""
    return render(request, 'clinica/consultas.html')

@login_required
def vet_view(request):
    """Vista para listar veterinarios"""
    return render(request, 'veterinarios/veterinarios.html')

@login_required
def vet_ficha_view(request):
    """Vista para la ficha del veterinario"""
    return render(request, 'veterinarios/vet_ficha.html')

@login_required
def vet_disponibilidad_view(request):
    """Vista para gestionar disponibilidad de veterinarios"""
    return render(request, 'veterinarios/vet_disponibilidad.html')

@login_required
def ficha_paciente(request, paciente_id):
    """Vista de la ficha del paciente"""
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    # Obtener consultas del paciente ordenadas por fecha
    consultas = Consulta.objects.filter(paciente=paciente).select_related('veterinario').order_by('-fecha')
    
    # Obtener nombre completo del veterinario logueado
    nombre_veterinario = f"{request.user.nombre} {request.user.apellido}".strip()
    
    context = {
        'paciente': paciente,
        'consultas': consultas,
        'nombre_veterinario': nombre_veterinario
    }
    
    return render(request, 'consulta/ficha_mascota.html', context)

@login_required
@require_http_methods(["POST"])
def crear_consulta(request, paciente_id):
    try:
        paciente = get_object_or_404(Paciente, id=paciente_id)
        data = json.loads(request.body)
        
        print('📥 Datos recibidos:', data)
        
        # Crear la consulta con los datos reales del formulario
        consulta = Consulta.objects.create(
            paciente=paciente,
            veterinario=request.user,
            temperatura=data.get('temperatura') or None,
            peso=data.get('peso') or None,
            frecuencia_cardiaca=data.get('frecuencia_cardiaca') or None,
            frecuencia_respiratoria=data.get('frecuencia_respiratoria') or None,
            otros=data.get('otros', ''),
            diagnostico=data.get('diagnostico', ''),
            tratamiento=data.get('tratamiento', ''),
            notas=data.get('notas', '')
        )
        
        # Procesar medicamentos si existen
        medicamentos = data.get('medicamentos', [])
        if medicamentos:
            for med in medicamentos:
                print(f'💊 Medicamento: {med}')
                # Aquí puedes agregar lógica para guardar los medicamentos
        
        print(f'✅ Consulta creada: ID {consulta.id}')
        
        return JsonResponse({
            'success': True,
            'message': 'Consulta creada exitosamente',
            'consulta_id': consulta.id
        })
        
    except Exception as e:
        print(f'❌ Error al crear consulta: {str(e)}')
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

@login_required
@require_http_methods(["GET"])
def detalle_consulta(request, paciente_id, consulta_id):
    try:
        consulta = Consulta.objects.select_related('veterinario').get(
            id=consulta_id, 
            paciente_id=paciente_id
        )
        
        # Obtener nombre del veterinario de forma segura
        veterinario_nombre = f"{consulta.veterinario.first_name} {consulta.veterinario.last_name}".strip()
        if not veterinario_nombre:
            veterinario_nombre = consulta.veterinario.username
        
        # Obtener fecha de creación
        fecha_str = consulta.created_at.strftime('%d/%m/%Y %H:%M') if hasattr(consulta, 'created_at') else timezone.now().strftime('%d/%m/%Y %H:%M')
        
        return JsonResponse({
            'success': True,
            'consulta': {
                'id': consulta.id,
                'fecha': fecha_str,
                'veterinario': veterinario_nombre,
                'temperatura': str(consulta.temperatura) if consulta.temperatura else '',
                'peso': str(consulta.peso) if consulta.peso else '',
                'frecuencia_cardiaca': str(consulta.frecuencia_cardiaca) if consulta.frecuencia_cardiaca else '',
                'frecuencia_respiratoria': str(consulta.frecuencia_respiratoria) if consulta.frecuencia_respiratoria else '',
                'otros': consulta.otros or '',
                'diagnostico': consulta.diagnostico or '',
                'tratamiento': consulta.tratamiento or '',
                'notas': consulta.notas or ''
            }
        })
    except Consulta.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Consulta no encontrada'}, status=404)
    except Exception as e:
        print(f'❌ Error en detalle_consulta: {str(e)}')
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
