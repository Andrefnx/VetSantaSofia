from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
import json
from .models import Consulta, MedicamentoUtilizado
from pacientes.models import Paciente

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
@require_http_methods(["POST"])
def crear_consulta(request, paciente_id):
    """Crear una nueva consulta para un paciente"""
    try:
        paciente = get_object_or_404(Paciente, id=paciente_id)
        
        data = json.loads(request.body)
        
        consulta = Consulta.objects.create(
            paciente=paciente,
            veterinario=request.user,
            fecha=timezone.now(),
            temperatura=data.get('temperatura'),
            peso=data.get('peso'),
            frecuencia_cardiaca=data.get('frecuencia_cardiaca'),
            frecuencia_respiratoria=data.get('frecuencia_respiratoria'),
            otros=data.get('otros'),
            diagnostico=data.get('diagnostico'),
            tratamiento=data.get('tratamiento'),
            notas=data.get('notas')
        )
        
        medicamentos = data.get('medicamentos', [])
        for med in medicamentos:
            try:
                MedicamentoUtilizado.objects.create(
                    consulta=consulta,
                    inventario_id=med.get('inventario_id'),
                    nombre=med['nombre'],
                    dosis=med.get('dosis'),
                    peso_paciente=med.get('peso_paciente')
                )
            except Exception as e:
                print(f"⚠️ Error al guardar medicamento {med.get('nombre')}: {str(e)}")
                continue
        
        return JsonResponse({
            'success': True,
            'consulta_id': consulta.id,
            'message': 'Consulta guardada exitosamente'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Datos JSON inválidos'}, status=400)
    except Exception as e:
        print(f"❌ Error al crear consulta: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
def ficha_paciente(request, paciente_id):
    """Vista de la ficha del paciente"""
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    # Obtener consultas con medicamentos
    consultas = paciente.consultas.prefetch_related('medicamentos').all()
    
    context = {
        'paciente': paciente,
        'consultas': consultas,
    }
    
    # ⭐ Ruta corregida según tu estructura de carpetas
    return render(request, 'consulta/ficha_mascota.html', context)
