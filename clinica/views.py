from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from .models import Consulta
from pacientes.models import Paciente
from inventario.models import Insumo
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
        print('=' * 50)
        print('🔵 INICIANDO CREACIÓN DE CONSULTA')
        print('=' * 50)
        
        paciente = get_object_or_404(Paciente, id=paciente_id)
        print(f'✅ Paciente encontrado: {paciente.nombre} (ID: {paciente.id})')
        
        # Parsear el body
        try:
            data = json.loads(request.body)
            print(f'✅ JSON parseado correctamente')
            print(f'📥 Datos recibidos: {json.dumps(data, indent=2, ensure_ascii=False)}')
        except json.JSONDecodeError as e:
            print(f'❌ Error al parsear JSON: {str(e)}')
            return JsonResponse({
                'success': False,
                'error': f'JSON inválido: {str(e)}'
            }, status=400)
        
        # Extraer y validar campos
        tipo_consulta = data.get('tipo_consulta')
        temperatura = data.get('temperatura')
        peso = data.get('peso')
        fc = data.get('frecuencia_cardiaca')
        fr = data.get('frecuencia_respiratoria')
        
        print(f'📋 Tipo de consulta: {tipo_consulta}')
        print(f'🌡️  Temperatura: {temperatura}')
        print(f'⚖️  Peso: {peso}')
        print(f'❤️  FC: {fc}')
        print(f'🫁 FR: {fr}')
        
        # Crear la consulta
        print('📝 Creando consulta...')
        consulta = Consulta.objects.create(
            paciente=paciente,
            veterinario=request.user,
            tipo_consulta=tipo_consulta,  # ⭐ AGREGAR ESTE CAMPO
            temperatura=temperatura if temperatura else None,
            peso=peso if peso else None,
            frecuencia_cardiaca=fc if fc else None,
            frecuencia_respiratoria=fr if fr else None,
            otros=data.get('otros', ''),
            diagnostico=data.get('diagnostico', ''),
            tratamiento=data.get('tratamiento', ''),
            notas=data.get('notas', '')
        )
        print(f'✅ Consulta creada con ID: {consulta.id}')
        print(f'✅ Tipo guardado: {consulta.tipo_consulta}')
        
        # Procesar medicamentos
        medicamentos = data.get('medicamentos', [])
        print(f'💊 Medicamentos recibidos: {len(medicamentos)}')
        
        if medicamentos and hasattr(consulta, 'medicamentos'):
            for med in medicamentos:
                try:
                    insumo = Insumo.objects.get(idInventario=med['id'])
                    consulta.medicamentos.add(insumo)
                    print(f'  ✅ Medicamento asociado: {med["nombre"]} - Dosis: {med["dosis"]}')
                except Insumo.DoesNotExist:
                    print(f'  ⚠️  Insumo no encontrado: ID {med["id"]}')
                except Exception as e:
                    print(f'  ❌ Error al asociar medicamento: {str(e)}')
        elif medicamentos:
            print(f'⚠️  Modelo Consulta no tiene campo medicamentos')
            print(f'   {len(medicamentos)} medicamentos no fueron asociados')
        
        print('=' * 50)
        print(f'✅ CONSULTA CREADA EXITOSAMENTE')
        print(f'   ID: {consulta.id}')
        print(f'   Tipo: {consulta.tipo_consulta}')
        print(f'   Paciente: {paciente.nombre}')
        print(f'   Veterinario: {request.user.nombre} {request.user.apellido}')
        print('=' * 50)
        
        return JsonResponse({
            'success': True,
            'message': 'Consulta creada exitosamente',
            'consulta_id': consulta.id
        })
        
    except Exception as e:
        print('=' * 50)
        print('❌ ERROR AL CREAR CONSULTA')
        print('=' * 50)
        print(f'Tipo de error: {type(e).__name__}')
        print(f'Mensaje: {str(e)}')
        import traceback
        print('Traceback completo:')
        traceback.print_exc()
        print('=' * 50)
        
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

@login_required
@require_http_methods(["GET"])
def detalle_consulta(request, paciente_id, consulta_id):
    try:
        consulta = Consulta.objects.select_related('veterinario', 'paciente').prefetch_related('medicamentos').get(
            id=consulta_id,
            paciente_id=paciente_id
        )
        
        # Obtener medicamentos utilizados
        medicamentos = [
            {
                'nombre': med.nombre,
                'dosis': med.dosis if hasattr(med, 'dosis') else None
            }
            for med in consulta.medicamentos.all()
        ]
        
        veterinario_nombre = f"{consulta.veterinario.nombre} {consulta.veterinario.apellido}".strip()
        
        data = {
            'success': True,
            'consulta': {
                'id': consulta.id,
                'fecha': consulta.fecha.strftime('%d/%m/%Y %H:%M'),
                'tipo_consulta': consulta.get_tipo_consulta_display(),
                'veterinario': veterinario_nombre,
                'temperatura': str(consulta.temperatura) if consulta.temperatura else '-',
                'peso': str(consulta.peso) if consulta.peso else '-',
                'frecuencia_cardiaca': str(consulta.frecuencia_cardiaca) if consulta.frecuencia_cardiaca else '-',
                'frecuencia_respiratoria': str(consulta.frecuencia_respiratoria) if consulta.frecuencia_respiratoria else '-',
                'otros': consulta.otros or '-',
                'diagnostico': consulta.diagnostico,
                'tratamiento': consulta.tratamiento or '-',
                'medicamentos': medicamentos,
                'notas': consulta.notas or '-',
            }
        }
        return JsonResponse(data)
    except Consulta.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Consulta no encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
def guardar_consulta(request, paciente_id):
    if request.method == 'POST':
        try:
            import json
            data = json.loads(request.body)
            
            paciente = get_object_or_404(Paciente, id=paciente_id)
            
            # Crear la consulta
            consulta = Consulta.objects.create(
                paciente=paciente,
                veterinario=request.user,
                tipo_consulta=data.get('tipo_consulta', 'consulta_general'),  # ⭐ NUEVO CAMPO
                temperatura=data.get('temperatura'),
                peso=data.get('peso'),
                frecuencia_cardiaca=data.get('frecuencia_cardiaca'),
                frecuencia_respiratoria=data.get('frecuencia_respiratoria'),
                otros=data.get('otros', ''),
                diagnostico=data.get('diagnostico', ''),
                tratamiento=data.get('tratamiento', ''),
                notas=data.get('notas', '')
            )
            
            # Guardar medicamentos utilizados
            medicamentos = data.get('medicamentos', [])
            for med in medicamentos:
                MedicamentoUtilizado.objects.create(
                    consulta=consulta,
                    inventario_id=med.get('id'),
                    nombre=med.get('nombre'),
                    dosis=med.get('dosis'),
                    peso_paciente=data.get('peso')
                )
            
            return JsonResponse({
                'success': True,
                'message': 'Consulta guardada exitosamente',
                'consulta_id': consulta.id
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error al guardar la consulta: {str(e)}'
            }, status=400)
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)
