from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from .models import Consulta
from pacientes.models import Paciente
from cuentas.models import CustomUser
import json
import sys

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
    
    # ✅ CAMBIAR 'role' POR 'rol'
    veterinarios = CustomUser.objects.filter(rol='veterinario').order_by('nombre', 'apellido')
    
    context = {
        'paciente': paciente,
        'consultas': consultas,
        'nombre_veterinario': nombre_veterinario,
        'veterinarios': veterinarios,
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
            tipo_consulta=tipo_consulta,
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
        
        # Procesar medicamentos - CREAR MedicamentoUtilizado
        from .models import MedicamentoUtilizado
        medicamentos = data.get('medicamentos', [])
        print(f'💊 Medicamentos recibidos: {len(medicamentos)}')
        
        for med in medicamentos:
            try:
                MedicamentoUtilizado.objects.create(
                    consulta=consulta,
                    inventario_id=med.get('id'),
                    nombre=med.get('nombre'),
                    dosis=med.get('dosis', ''),
                    peso_paciente=peso if peso else None
                )
                print(f'  ✅ Medicamento guardado: {med["nombre"]} - Dosis: {med.get("dosis", "Sin dosis")}')
            except Exception as e:
                print(f'  ❌ Error al guardar medicamento {med.get("nombre")}: {str(e)}')
        
        print('=' * 50)
        print(f'✅ CONSULTA CREADA EXITOSAMENTE')
        print(f'   ID: {consulta.id}')
        print(f'   Tipo: {consulta.tipo_consulta}')
        print(f'   Paciente: {paciente.nombre}')
        print(f'   Veterinario: {request.user.nombre} {request.user.apellido}')
        print(f'   Medicamentos guardados: {consulta.medicamentos_detalle.count()}')
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
        consulta = Consulta.objects.select_related('veterinario', 'paciente').prefetch_related('medicamentos_detalle').get(
            id=consulta_id,
            paciente_id=paciente_id
        )
        
        # Obtener medicamentos utilizados desde MedicamentoUtilizado
        medicamentos = []
        for med_detalle in consulta.medicamentos_detalle.all():
            med_info = {
                'nombre': med_detalle.nombre,
            }
            if med_detalle.dosis:
                med_info['dosis'] = med_detalle.dosis
            medicamentos.append(med_info)
        
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
        print(f"Error en detalle_consulta: {str(e)}")
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
import sys

@login_required
def ficha_mascota(request, pk):
    import sys
    sys.stderr.write("\n" + "="*60 + "\n")
    sys.stderr.write(f"🔴 FICHA MASCOTA LLAMADA - PK: {pk}\n")
    sys.stderr.write("="*60 + "\n\n")
    
    paciente = get_object_or_404(Paciente, pk=pk)
    consultas = Consulta.objects.filter(paciente=paciente).select_related('veterinario').order_by('-fecha')
    
    sys.stderr.write(f"📦 Paciente: {paciente.nombre}\n")
    sys.stderr.write(f"📋 Consultas encontradas: {consultas.count()}\n")
    
    # ⭐ DEBUG COMPLETO DE VETERINARIOS
    todos_usuarios = CustomUser.objects.all()
    sys.stderr.write(f"\n👥 TOTAL DE USUARIOS EN LA BD: {todos_usuarios.count()}\n")
    for user in todos_usuarios:
        sys.stderr.write(f"  - {user.nombre} {user.apellido} | rol='{user.rol}' | is_staff={user.is_staff}\n")
    
    # ⭐ BUSCAR VETERINARIOS (ESTRATEGIA DE FALLBACK ROBUSTA)
    sys.stderr.write(f"\n🔍 BUSCANDO veterinarios...\n")
    
    # Opción 1: Usuarios con rol='veterinario'
    veterinarios = CustomUser.objects.filter(rol='veterinario').order_by('nombre', 'apellido')
    sys.stderr.write(f"  Opción 1 (rol='veterinario'): {veterinarios.count()}\n")
    
    # Opción 2: Si no hay con ese rol, excluir administración y recepción
    if veterinarios.count() == 0:
        veterinarios = CustomUser.objects.exclude(
            rol__in=['administracion', 'recepcion']
        ).order_by('nombre', 'apellido')
        sys.stderr.write(f"  Opción 2 (exclusión admin/recepción): {veterinarios.count()}\n")
    
    # Opción 3: Si aún no hay, usar todos los usuarios
    if veterinarios.count() == 0:
        veterinarios = CustomUser.objects.all().order_by('nombre', 'apellido')
        sys.stderr.write(f"  Opción 3 (todos los usuarios): {veterinarios.count()}\n")
    
    sys.stderr.write(f"👨‍⚕️ Veterinarios totales a mostrar: {veterinarios.count()}\n")
    for vet in veterinarios:
        sys.stderr.write(f"  ✅ {vet.id} - {vet.nombre} {vet.apellido} (rol='{vet.rol}')\n")
    
    # ⭐ GENERAR NOMBRE COMPLETO DEL VETERINARIO LOGUEADO
    nombre_veterinario = f"{request.user.nombre} {request.user.apellido}".strip()
    sys.stderr.write(f"\n👤 Veterinario logueado: {nombre_veterinario} (rol='{request.user.rol}')\n")
    sys.stderr.write(f"📝 Total de veterinarios a mostrar: {veterinarios.count()}\n")
    sys.stderr.write("="*60 + "\n\n")
    
    context = {
        'paciente': paciente,
        'consultas': consultas,
        'nombre_veterinario': nombre_veterinario,
        'veterinarios': veterinarios,
        'hospitalizaciones': paciente.hospitalizaciones.all(),
        'examenes': paciente.examenes.all(),
        'documentos': paciente.documentos.all(),
    }
    return render(request, 'consulta/ficha_mascota.html', context)