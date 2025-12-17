from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, FileResponse, Http404
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from datetime import datetime, time
from django.core.exceptions import ValidationError
from .models import Consulta, Hospitalizacion, Cirugia, RegistroDiario, Alta, Documento
from pacientes.models import Paciente
from cuentas.models import CustomUser
from servicios.models import Servicio
from agenda.models import Cita
import json
import sys
import os

# ============================================================
# FUNCIÓN CENTRALIZADA: DESCUENTO DE INSUMOS
# ============================================================
def descontar_insumos_consulta(consulta, user):
    """
    Descuenta los insumos de una consulta del inventario.
    
    Esta función:
    - Valida que no se haya descontado previamente (insumos_descontados)
    - Descuenta insumos desde Servicio → ServicioInsumo → Insumo
    - Descuenta insumos manuales asociados mediante MedicamentoUtilizado
    - Guarda movimientos de stock en el historial
    - Marca consulta.insumos_descontados = True
    
    Args:
        consulta: Instancia de Consulta
        user: Usuario que realiza la operación
    
    Returns:
        dict con resultado: {'success': bool, 'message': str, 'detalles': dict}
    
    Raises:
        ValidationError: Si el stock es insuficiente
        Exception: Otros errores
    """
    from .services.inventario_service import validate_stock_for_services, discount_stock_for_services
    from inventario.models import Insumo
    
    print('=' * 60)
    print('🔵 DESCUENTO DE INSUMOS - INICIO')
    print('=' * 60)
    print(f'📋 Consulta ID: {consulta.id}')
    print(f'🐾 Paciente: {consulta.paciente.nombre}')
    print(f'📍 Estado actual insumos_descontados: {consulta.insumos_descontados}')
    
    # ⭐ VALIDACIÓN: Evitar doble descuento
    if consulta.insumos_descontados:
        print('⚠️ Los insumos ya fueron descontados previamente')
        return {
            'success': False,
            'error': 'ya_descontado',
            'message': '🔒 Los insumos de esta consulta ya fueron descontados del inventario.'
        }
    
    insumos_procesados = []
    
    # ============================================================
    # PASO 1: DESCONTAR INSUMOS DE SERVICIOS
    # ============================================================
    servicios = consulta.servicios.all()
    if servicios.exists():
        print(f'\n📦 PROCESANDO SERVICIOS ({servicios.count()})')
        print('-' * 60)
        
        try:
            # Validar stock disponible
            print('🔍 Validando disponibilidad de stock...')
            validate_stock_for_services(servicios)
            print('✅ Stock suficiente para todos los servicios')
            
            # Descontar inventario
            print('📉 Descontando insumos de servicios...')
            resultado = discount_stock_for_services(
                services=servicios,
                user=user,
                origen_obj=consulta
            )
            
            print(f'✅ {resultado["total_items"]} insumos descontados desde servicios')
            for item in resultado['insumos_descontados']:
                print(f'  - {item["medicamento"]}: {item["cantidad_descontada"]} unidades')
                insumos_procesados.append(item)
                
        except ValidationError as ve:
            print(f'❌ ERROR: Stock insuficiente')
            print(f'   Detalle: {str(ve)}')
            raise ve  # Re-lanzar para manejo en vista
    else:
        print('\nℹ️ No hay servicios asociados a esta consulta')
    
    # ============================================================
    # PASO 2: DESCONTAR INSUMOS MANUALES (MedicamentoUtilizado)
    # ============================================================
    medicamentos = consulta.medicamentos_detalle.filter(inventario_id__isnull=False)
    if medicamentos.exists():
        print(f'\n💊 PROCESANDO MEDICAMENTOS MANUALES ({medicamentos.count()})')
        print('-' * 60)
        
        for med in medicamentos:
            try:
                insumo = Insumo.objects.get(idInventario=med.inventario_id)
                
                # Validar stock
                if insumo.stock_actual <= 0:
                    raise ValidationError(
                        f"Stock insuficiente para {insumo.medicamento}. "
                        f"Stock actual: {insumo.stock_actual}"
                    )
                
                # Descontar 1 unidad
                insumo.stock_actual -= 1
                insumo.save(update_fields=['stock_actual'])
                
                print(f'✅ {insumo.medicamento}: descontada 1 unidad (stock: {insumo.stock_actual + 1} → {insumo.stock_actual})')
                
                insumos_procesados.append({
                    'medicamento': insumo.medicamento,
                    'cantidad_descontada': 1,
                    'stock_anterior': insumo.stock_actual + 1,
                    'stock_actual': insumo.stock_actual
                })
                
            except Insumo.DoesNotExist:
                print(f'⚠️ Insumo con ID {med.inventario_id} no encontrado en inventario')
            except Exception as e:
                print(f'❌ Error al descontar {med.nombre}: {str(e)}')
                raise e
    else:
        print('\nℹ️ No hay medicamentos manuales con inventario_id')
    
    # ============================================================
    # PASO 3: MARCAR CONSULTA COMO PROCESADA
    # ============================================================
    consulta.insumos_descontados = True
    consulta.save(update_fields=['insumos_descontados'])
    print(f'\n✅ Flag insumos_descontados actualizado a True')
    
    print('=' * 60)
    print('✅ DESCUENTO DE INSUMOS - COMPLETADO')
    print(f'📊 Total de insumos procesados: {len(insumos_procesados)}')
    print('=' * 60)
    
    return {
        'success': True,
        'message': '✅ Insumos descontados correctamente del inventario',
        'detalles': {
            'total_items': len(insumos_procesados),
            'insumos_descontados': insumos_procesados
        }
    }

# Helper: normalize event datetime for sorting
def _normalize_event_dt(obj):
    """Return a timezone-aware datetime for either Consulta or Cita.

    - Consulta: uses its `fecha` (DateTimeField or Date) directly
    - Cita: combines `fecha` (date) + `hora_inicio` (time)
    """
    try:
        # Detect Cita by presence of `hora_inicio`
        if hasattr(obj, 'hora_inicio'):
            base_date = obj.fecha
            base_time = obj.hora_inicio or time.min
            dt = datetime.combine(base_date, base_time)
        else:
            # Consulta can have datetime or date in `fecha`
            dt_value = getattr(obj, 'fecha', None)
            if isinstance(dt_value, datetime):
                dt = dt_value
            else:
                dt = datetime.combine(dt_value, time.min)

        # Ensure timezone-aware
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        return dt
    except Exception as e:
        # Fallback to today at 00:00 if something goes wrong
        today = timezone.localdate()
        fallback = datetime.combine(today, time.min)
        return timezone.make_aware(fallback, timezone.get_current_timezone())

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
    import sys
    print(f"\n{'#'*80}\n>>> INICIO FICHA_PACIENTE - ID: {paciente_id}\n{'#'*80}", file=sys.stderr)
    
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    # Obtener consultas del paciente ordenadas por fecha
    consultas = Consulta.objects.filter(paciente=paciente).select_related('veterinario').order_by('-fecha')
    
    # Obtener documentos del paciente
    documentos = Documento.objects.filter(paciente=paciente).order_by('-fecha_subida')
    
    # Obtener nombre completo del veterinario logueado
    nombre_veterinario = f"{request.user.nombre} {request.user.apellido}".strip()
    
    # ✅ CAMBIAR 'role' POR 'rol'
    veterinarios = CustomUser.objects.filter(rol='veterinario').order_by('nombre', 'apellido')
    
    # Citas agendadas próximas y del día
    hoy = timezone.localdate()
    
    # DEBUG: Probar sin filtro primero
    todas_citas = Cita.objects.filter(paciente=paciente).select_related('veterinario', 'servicio')
    print(f"\n{'='*80}", file=sys.stderr)
    print(f"🔍 DEBUG QUERY", file=sys.stderr)
    print(f"📅 timezone.localdate(): {hoy} (tipo: {type(hoy)})", file=sys.stderr)
    print(f"👤 Paciente: {paciente.nombre} (ID: {paciente.id})", file=sys.stderr)
    print(f"📊 TODAS las citas del paciente: {todas_citas.count()}", file=sys.stderr)
    for c in todas_citas:
        print(f"   - Cita {c.id}: fecha={c.fecha} (tipo:{type(c.fecha)}) >= {hoy}? {c.fecha >= hoy}", file=sys.stderr)
    
    citas_agendadas = (
        Cita.objects.filter(paciente=paciente, fecha__gte=hoy)
        .exclude(estado__in=['completada', 'realizada'])
        .select_related('veterinario', 'servicio')
        .order_by('-fecha', '-hora_inicio')  # Orden descendente para mostrar más recientes primero
    )
    print(f"\n📊 Citas filtradas (fecha__gte={hoy}): {citas_agendadas.count()}", file=sys.stderr)
    
    if citas_agendadas.exists():
        print(f"\n🔍 CITAS ENCONTRADAS:", file=sys.stderr)
        for idx, cita in enumerate(citas_agendadas, 1):
            print(f"\n  📌 CITA #{idx}:", file=sys.stderr)
            print(f"     ID: {cita.id}", file=sys.stderr)
            print(f"     Fecha: {cita.fecha}", file=sys.stderr)
            print(f"     Hora: {cita.hora_inicio} - {cita.hora_fin}", file=sys.stderr)
            print(f"     Veterinario: {cita.veterinario.nombre} {cita.veterinario.apellido}", file=sys.stderr)
            print(f"     Servicio: {cita.servicio.nombre if cita.servicio else 'Sin servicio'}", file=sys.stderr)
            print(f"     Estado: {cita.estado}", file=sys.stderr)
    else:
        print(f"\n⚠️  NO HAY CITAS para este paciente desde hoy", file=sys.stderr)
    
    print(f"{'='*80}\n", file=sys.stderr)

    # FORZAR ORDEN DESCENDENTE SIEMPRE (más recientes primero)
    orden_timeline = 'desc'
    
    print(f"\n🔍 DEBUG ORDEN: FORZADO A DESC - orden_timeline = '{orden_timeline}'", file=sys.stderr)
    print(f"🔍 DEBUG ORDEN: reverse={orden_timeline == 'desc'}\n", file=sys.stderr)

    timeline_items = []
    for cita in citas_agendadas:
        event_dt = _normalize_event_dt(cita)
        timeline_items.append({
            'tipo': 'cita',
            'obj': cita,
            'fecha': event_dt.date(),
            'sort_key': event_dt,
        })

    for consulta in consultas:
        event_dt = _normalize_event_dt(consulta)
        timeline_items.append({
            'tipo': 'consulta',
            'obj': consulta,
            'fecha': event_dt.date(),
            'sort_key': event_dt,
        })

    # ORDENAR DESCENDENTE (más recientes primero) con reverse=True  
    timeline_items = sorted(timeline_items, key=lambda x: x['sort_key'], reverse=True)
    
    print(f"\n✅ ORDEN FINAL ficha_paciente (después de sorted reverse=True):", file=sys.stderr)
    for i, it in enumerate(timeline_items):
        obj = it['obj']
        if it['tipo'] == 'cita':
            print(f"   [{i+1}] CITA: {obj.fecha} {obj.hora_inicio}", file=sys.stderr)
        else:
            print(f"   [{i+1}] CONSULTA: {obj.fecha}", file=sys.stderr)

    context = {
        'paciente': paciente,
        'consultas': consultas,
        'documentos': documentos,
        'nombre_veterinario': nombre_veterinario,
        'veterinarios': veterinarios,
        'citas_agendadas': citas_agendadas,
        'timeline_items': timeline_items,
        'orden_timeline': orden_timeline,
    }
    
    return render(request, 'consulta/ficha_mascota.html', context)

@login_required
def get_paciente_data(request, paciente_id):
    """Retorna los datos del paciente en JSON"""
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    return JsonResponse({
        'success': True,
        'paciente': {
            'id': paciente.id,
            'nombre': paciente.nombre,
            'especie': paciente.especie,
            'peso': paciente.ultimo_peso or None,
            'edad': paciente.edad_formateada,
            'propietario': paciente.propietario.nombre_completo if paciente.propietario else '',
        }
    })

@login_required
@require_http_methods(["POST"])
def actualizar_antecedentes(request, paciente_id):
    """Actualiza los antecedentes médicos críticos del paciente"""
    try:
        paciente = get_object_or_404(Paciente, id=paciente_id)
        data = json.loads(request.body)
        
        # Actualizar campos de antecedentes
        paciente.alergias = data.get('alergias', paciente.alergias)
        paciente.enfermedades_cronicas = data.get('enfermedades_cronicas', paciente.enfermedades_cronicas)
        paciente.medicamentos_actuales = data.get('medicamentos_actuales', paciente.medicamentos_actuales)
        paciente.cirugia_previa = data.get('cirugia_previa', paciente.cirugia_previa)
        
        paciente.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Antecedentes actualizados correctamente',
            'paciente': {
                'alergias': paciente.alergias,
                'enfermedades_cronicas': paciente.enfermedades_cronicas,
                'medicamentos_actuales': paciente.medicamentos_actuales,
                'cirugia_previa': paciente.cirugia_previa,
            }
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

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
        servicios_ids = data.get('servicios_ids', '')
        temperatura = data.get('temperatura')
        peso = data.get('peso')
        fc = data.get('frecuencia_cardiaca')
        fr = data.get('frecuencia_respiratoria')
        finalizar = data.get('finalizar', False)  # ⭐ Nuevo parámetro
        
        print(f'🔄 Modo: {"FINALIZACIÓN (descontar insumos)" if finalizar else "BORRADOR (sin descuento)"}')
        
        # Determinar tipo de consulta basado en servicios seleccionados
        tipo_consulta = 'otros'  # Por defecto para múltiples servicios
        if servicios_ids:
            ids_list = servicios_ids.split(',')
            if len(ids_list) == 1:
                # Si es un solo servicio, intentar mapear su categoría
                try:
                    servicio = Servicio.objects.get(idServicio=ids_list[0])
                    categoria = servicio.categoria.lower() if servicio.categoria else ''
                    
                    # Mapear categoría a tipo de consulta válido
                    mapeo_categorias = {
                        'vacunacion': 'vacuna',
                        'desparasitacion': 'desparacitacion',
                        'cirugia': 'cirugia',
                        'urgencia': 'urgencia',
                        'control': 'control'
                    }
                    tipo_consulta = mapeo_categorias.get(categoria, 'otros')
                except Servicio.DoesNotExist:
                    tipo_consulta = 'otros'
            else:
                # Múltiples servicios = otros
                tipo_consulta = 'otros'
        
        print(f'📋 Servicios IDs: {servicios_ids}')
        print(f'📋 Tipo de consulta derivado: {tipo_consulta}')
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
        
        # ⭐ AGREGAR SERVICIOS A LA CONSULTA
        if servicios_ids:
            ids_list = servicios_ids.split(',')
            for servicio_id in ids_list:
                try:
                    servicio = Servicio.objects.get(idServicio=servicio_id.strip())
                    consulta.servicios.add(servicio)
                    print(f'✅ Servicio agregado: {servicio.nombre}')
                except Servicio.DoesNotExist:
                    print(f'⚠️  Servicio no encontrado: {servicio_id}')
        
        # ⭐ ACTUALIZAR EL PESO DEL PACIENTE SI SE PROPORCIONÓ
        if peso:
            try:
                peso_float = float(peso)
                paciente.ultimo_peso = peso_float
                paciente.save()
                print(f'✅ Peso del paciente actualizado: {peso_float} kg')
            except (ValueError, TypeError) as e:
                print(f'⚠️  Error al actualizar peso: {str(e)}')
        
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

        # ⭐ DESCUENTO DE INVENTARIO POR SERVICIOS (solo si finalizar=True)
        # Descontar insumos del inventario según los servicios ejecutados
        if finalizar and consulta.servicios.exists():
            try:
                from .services.inventario_service import validate_stock_for_services, discount_stock_for_services
                
                # ⭐ PASO 1: VALIDAR STOCK ANTES DE DESCONTAR
                print(f'🔍 Validando disponibilidad de stock...')
                servicios = consulta.servicios.all()
                
                try:
                    validate_stock_for_services(servicios)
                    print(f'  ✅ Stock suficiente para todos los insumos')
                except ValidationError as stock_error:
                    # Stock insuficiente detectado ANTES de descontar
                    print(f'  ⚠️ Stock insuficiente detectado:')
                    print(f'     {str(stock_error)}')
                    
                    consulta.delete()  # Revertir creación de consulta
                    
                    mensaje_error = (
                        "⚠️ STOCK INSUFICIENTE\n\n"
                        "No es posible finalizar esta consulta porque algunos insumos "
                        "no tienen stock disponible:\n\n"
                        f"{str(stock_error)}\n\n"
                        "Opciones:\n"
                        "• Guarde como BORRADOR y confirme más tarde\n"
                        "• Registre nuevos ingresos de inventario\n"
                        "• Modifique los servicios seleccionados"
                    )
                    
                    return JsonResponse({
                        'success': False,
                        'error': 'stock_insuficiente',
                        'message': mensaje_error,
                        'detalles': str(stock_error)
                    }, status=400)
                
                # ⭐ PASO 2: DESCONTAR INVENTARIO (solo si validación pasó)
                print(f'📦 Iniciando descuento de inventario para servicios...')
                
                resultado = discount_stock_for_services(
                    services=servicios,
                    user=request.user,
                    origen_obj=consulta
                )
                
                print(f'  ✅ Inventario descontado exitosamente')
                print(f'  📊 Items descontados: {resultado["total_items"]}')
                for item in resultado['insumos_descontados']:
                    print(f'    - {item["medicamento"]}: {item["cantidad_descontada"]} unidades (quedan {item["stock_restante"]})')
                
            except ValidationError as ve:
                # Si hay error de validación (backup por si acaso)
                print(f'  ⚠️ Error de validación en inventario: {str(ve)}')
                consulta.delete()  # Revertir creación de consulta
                return JsonResponse({
                    'success': False,
                    'error': 'stock_insuficiente',
                    'message': f'⚠️ Stock insuficiente\n\n{str(ve)}\n\nPor favor, verifique el inventario.',
                    'detalles': str(ve)
                }, status=400)
            except Exception as e:
                # Cualquier otro error en el descuento
                print(f'  ❌ Error inesperado al descontar inventario: {str(e)}')
                consulta.delete()  # Revertir creación de consulta
                return JsonResponse({
                    'success': False,
                    'error': f'Error al procesar inventario: {str(e)}'
                }, status=500)
        elif not finalizar and consulta.servicios.exists():
            print(f'  ℹ️ MODO BORRADOR: Servicios asociados pero NO se descuenta inventario')
        else:
            print(f'  ℹ️ No hay servicios asociados')
        
        # Si la consulta proviene de una cita, marcarla como completada (solo si finalizar=True)
        cita_id = data.get('cita_id')
        if cita_id and finalizar:
            try:
                cita_relacionada = Cita.objects.get(id=cita_id, paciente=paciente)
                cita_relacionada.estado = 'completada'
                cita_relacionada.save(update_fields=['estado', 'fecha_modificacion'])
                print(f'  ✅ Cita {cita_id} marcada como completada')
            except Cita.DoesNotExist:
                print(f'  ⚠️ Cita {cita_id} no encontrada para este paciente; no se actualiza estado')
        elif cita_id and not finalizar:
            print(f'  ℹ️ MODO BORRADOR: Cita {cita_id} NO se marca como completada')
        
        print('=' * 50)
        print(f'✅ CONSULTA CREADA EXITOSAMENTE')
        print(f'   ID: {consulta.id}')
        print(f'   Modo: {"FINALIZADA" if finalizar else "BORRADOR"}')
        print(f'   Tipo: {consulta.tipo_consulta}')
        print(f'   Paciente: {paciente.nombre}')
        print(f'   Veterinario: {request.user.nombre} {request.user.apellido}')
        print(f'   Medicamentos guardados: {consulta.medicamentos_detalle.count()}')
        print(f'   Insumos descontados: {consulta.insumos_descontados}')
        print('=' * 50)
        
        mensaje = 'Consulta finalizada exitosamente' if finalizar else 'Borrador de consulta guardado'
        
        return JsonResponse({
            'success': True,
            'message': mensaje,
            'consulta_id': consulta.id,
            'finalizada': finalizar,
            'insumos_descontados': consulta.insumos_descontados
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
@require_http_methods(["PUT"])
def actualizar_consulta(request, consulta_id):
    """
    Actualiza una consulta existente (solo si es un borrador sin finalizar).
    """
    try:
        print('=' * 50)
        print('🔄 ACTUALIZANDO CONSULTA')
        print('=' * 50)
        
        # Obtener la consulta
        consulta = get_object_or_404(Consulta, id=consulta_id)
        print(f'✅ Consulta encontrada: ID {consulta.id}')
        print(f'   Paciente: {consulta.paciente.nombre}')
        print(f'   Estado actual insumos_descontados: {consulta.insumos_descontados}')
        
        # ⭐ VALIDACIÓN CRÍTICA: No permitir edición de consultas finalizadas
        if consulta.insumos_descontados:
            print('🔒 Consulta ya finalizada - No se puede editar')
            return JsonResponse({
                'success': False,
                'error': 'consulta_finalizada',
                'message': '🔒 Esta consulta ya fue finalizada y no se puede modificar.\n\nLos insumos ya fueron descontados del inventario.'
            }, status=403)
        
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
        
        # Extraer parámetros
        finalizar = data.get('finalizar', False)
        print(f'🔄 Modo actualización: {"FINALIZACIÓN (descontar insumos)" if finalizar else "BORRADOR (sin descuento)"}')
        
        # Actualizar campos básicos
        consulta.temperatura = data.get('temperatura') if data.get('temperatura') else None
        consulta.peso = data.get('peso') if data.get('peso') else None
        consulta.frecuencia_cardiaca = data.get('frecuencia_cardiaca') if data.get('frecuencia_cardiaca') else None
        consulta.frecuencia_respiratoria = data.get('frecuencia_respiratoria') if data.get('frecuencia_respiratoria') else None
        consulta.otros = data.get('otros', '')
        consulta.diagnostico = data.get('diagnostico', '')
        consulta.tratamiento = data.get('tratamiento', '')
        consulta.notas = data.get('notas', '')
        
        print('✅ Campos básicos actualizados')
        
        # Actualizar peso del paciente si se proporcionó
        peso = data.get('peso')
        if peso:
            try:
                peso_float = float(peso)
                consulta.paciente.ultimo_peso = peso_float
                consulta.paciente.save()
                print(f'✅ Peso del paciente actualizado: {peso_float} kg')
            except (ValueError, TypeError) as e:
                print(f'⚠️  Error al actualizar peso: {str(e)}')
        
        # Actualizar servicios
        servicios_ids = data.get('servicios_ids', '')
        if servicios_ids:
            # Limpiar servicios existentes
            consulta.servicios.clear()
            print('🗑️ Servicios anteriores eliminados')
            
            # Agregar nuevos servicios
            ids_list = servicios_ids.split(',')
            for servicio_id in ids_list:
                try:
                    servicio = Servicio.objects.get(idServicio=servicio_id.strip())
                    consulta.servicios.add(servicio)
                    print(f'✅ Servicio agregado: {servicio.nombre}')
                except Servicio.DoesNotExist:
                    print(f'⚠️  Servicio no encontrado: {servicio_id}')
        
        # Actualizar medicamentos - Eliminar anteriores y crear nuevos
        from .models import MedicamentoUtilizado
        consulta.medicamentos_detalle.all().delete()
        print('🗑️ Medicamentos anteriores eliminados')
        
        medicamentos = data.get('medicamentos', [])
        print(f'💊 Medicamentos a guardar: {len(medicamentos)}')
        
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
        
        # ⭐ GUARDAR CAMBIOS BÁSICOS ANTES DEL DESCUENTO
        consulta.save()
        print('✅ Campos básicos guardados en BD')
        
        # ⭐ SI SE FINALIZA, DESCONTAR INSUMOS usando función centralizada
        if finalizar:
            print('🔄 Finalizando consulta - Llamando a descontar_insumos_consulta()')
            resultado = descontar_insumos_consulta(consulta, request.user)
            
            if not resultado['success']:
                # Error al descontar (stock insuficiente u otro)
                error_code = resultado.get('error', 'error_desconocido')
                
                if error_code == 'stock_insuficiente':
                    mensaje = (
                        "⚠️ STOCK INSUFICIENTE\n\n"
                        "No es posible finalizar esta consulta porque algunos insumos "
                        "no tienen stock disponible:\n\n"
                        f"{resultado['message']}\n\n"
                        "Opciones:\n"
                        "• Guarde como BORRADOR y confirme más tarde\n"
                        "• Registre nuevos ingresos de inventario\n"
                        "• Modifique los servicios seleccionados"
                    )
                else:
                    mensaje = resultado['message']
                
                return JsonResponse({
                    'success': False,
                    'error': error_code,
                    'message': mensaje
                }, status=400)
            
            print('✅ Insumos descontados correctamente')
        
        # Verificar estado final
        print(f'📊 Estado final - insumos_descontados: {consulta.insumos_descontados}')
        
        print('=' * 50)
        print(f'✅ CONSULTA ACTUALIZADA EXITOSAMENTE')
        print(f'   ID: {consulta.id}')
        print(f'   Modo: {"FINALIZADA" if finalizar else "BORRADOR"}')
        print(f'   Insumos descontados: {consulta.insumos_descontados}')
        print('=' * 50)
        
        mensaje = 'Consulta actualizada y finalizada exitosamente' if finalizar else 'Borrador de consulta actualizado'
        
        return JsonResponse({
            'success': True,
            'message': mensaje,
            'consulta_id': consulta.id,
            'finalizada': finalizar,
            'insumos_descontados': consulta.insumos_descontados
        })
        
    except Exception as e:
        print('=' * 50)
        print('❌ ERROR AL ACTUALIZAR CONSULTA')
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
                'inventario_id': med_detalle.inventario_id,  # ⭐ ID para reconstruir selección
            }
            if med_detalle.dosis:
                med_info['dosis'] = med_detalle.dosis
            if med_detalle.peso_paciente:
                med_info['peso_paciente'] = str(med_detalle.peso_paciente)  # ⭐ Peso para recalcular dosis
            medicamentos.append(med_info)
        
        veterinario_nombre = f"{consulta.veterinario.nombre} {consulta.veterinario.apellido}".strip()
        
        # ⭐ Obtener servicios con sus IDs
        servicios_lista = []
        for servicio in consulta.servicios.all():
            servicios_lista.append({
                'id': servicio.idServicio,
                'nombre': servicio.nombre
            })
        
        data = {
            'success': True,
            'consulta': {
                'id': consulta.id,
                'fecha': consulta.fecha.strftime('%d/%m/%Y %H:%M'),
                'tipo_consulta': consulta.servicios_nombres(),
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
                'insumos_descontados': consulta.insumos_descontados,
                'servicios': servicios_lista,  # ⭐ Lista de servicios con IDs
            }
        }
        return JsonResponse(data)
    except Consulta.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Consulta no encontrada'}, status=404)
    except Exception as e:
        print(f"Error en detalle_consulta: {str(e)}")
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
@require_http_methods(["POST"])
def confirmar_consulta(request, consulta_id):
    """
    Confirma una consulta previamente guardada como borrador,
    descontando los insumos del inventario usando la función centralizada.
    """
    try:
        # Obtener la consulta
        consulta = get_object_or_404(Consulta, id=consulta_id)
        
        # ⭐ Usar función centralizada para descontar insumos
        resultado = descontar_insumos_consulta(consulta, request.user)
        
        if not resultado['success']:
            # Error: ya descontado o validación falló
            return JsonResponse({
                'success': False,
                'error': resultado.get('error', 'error_desconocido'),
                'message': resultado['message']
            }, status=400)
        
        # Éxito: insumos descontados correctamente
        return JsonResponse({
            'success': True,
            'message': resultado['message'],
            'consulta': {
                'id': consulta.id,
                'insumos_descontados': consulta.insumos_descontados
            },
            'detalles': resultado.get('detalles', {})
        })
        
    except Consulta.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'not_found',
            'message': 'Consulta no encontrada'
        }, status=404)
    except Exception as e:
        print('=' * 50)
        print('❌ ERROR AL CONFIRMAR CONSULTA')
        print('=' * 50)
        print(f'Tipo: {type(e).__name__}')
        print(f'Mensaje: {str(e)}')
        import traceback
        traceback.print_exc()
        print('=' * 50)
        
        return JsonResponse({
            'success': False,
            'error': 'error',
            'message': f'Error al confirmar consulta: {str(e)}'
        }, status=500)

@login_required
def guardar_consulta(request, paciente_id):
    if request.method == 'POST':
        try:
            import json
            from decimal import Decimal
            from .models import ConsultaInsumo
            
            data = json.loads(request.body)
            
            paciente = get_object_or_404(Paciente, id=paciente_id)
            peso_paciente = data.get('peso')
            
            # Crear la consulta
            consulta = Consulta.objects.create(
                paciente=paciente,
                veterinario=request.user,
                tipo_consulta=data.get('tipo_consulta', 'consulta_general'),
                temperatura=data.get('temperatura'),
                peso=peso_paciente,
                frecuencia_cardiaca=data.get('frecuencia_cardiaca'),
                frecuencia_respiratoria=data.get('frecuencia_respiratoria'),
                otros=data.get('otros', ''),
                diagnostico=data.get('diagnostico', ''),
                tratamiento=data.get('tratamiento', ''),
                notas=data.get('notas', '')
            )
            
            # ⭐ GUARDAR SERVICIOS (ManyToMany)
            servicios_ids = data.get('servicios_ids') or data.get('servicios', [])
            if servicios_ids:
                # Si es string separado por comas, convertir a lista
                if isinstance(servicios_ids, str):
                    servicios_ids = [int(sid.strip()) for sid in servicios_ids.split(',') if sid.strip()]
                consulta.servicios.set(servicios_ids)
            
            # ⭐ GUARDAR INSUMOS con cálculo automático (NUEVO MODELO)
            medicamentos = data.get('medicamentos', [])
            import re
            
            for med in medicamentos:
                insumo_id = med.get('id')
                dosis_raw = med.get('dosis')  # Puede ser "13.6 gr (1 envase)" o número
                
                if insumo_id and peso_paciente:
                    try:
                        insumo = Insumo.objects.get(id=insumo_id)
                        peso_decimal = Decimal(str(peso_paciente))
                        
                        # Extraer número de la dosis (puede venir como "13.6 gr (1 envase)")
                        dosis_numerica = None
                        cantidad_envases = None
                        
                        if dosis_raw:
                            # Intentar extraer el número de la dosis
                            match_dosis = re.search(r'([\d.]+)\s*(ml|gr|mg|unidades)?', str(dosis_raw))
                            if match_dosis:
                                dosis_numerica = Decimal(match_dosis.group(1))
                            
                            # Intentar extraer cantidad de envases
                            match_envases = re.search(r'\((\d+(?:\.\d+)?)\s*envases?\)', str(dosis_raw))
                            if match_envases:
                                cantidad_envases = Decimal(match_envases.group(1))
                        
                        # Si no hay cantidad de envases, calcularla a partir de la dosis
                        if not cantidad_envases and dosis_numerica:
                            if hasattr(insumo, 'ml_por_contenedor') and insumo.ml_por_contenedor:
                                from decimal import ROUND_UP
                                cantidad_envases = (dosis_numerica / insumo.ml_por_contenedor).quantize(Decimal('1'), rounding=ROUND_UP)
                            else:
                                cantidad_envases = Decimal('1')
                        
                        # Crear ConsultaInsumo
                        consulta_insumo = ConsultaInsumo.objects.create(
                            consulta=consulta,
                            insumo=insumo,
                            peso_paciente=peso_decimal,
                            dosis_total_ml=dosis_numerica,
                            ml_por_contenedor=insumo.ml_por_contenedor if hasattr(insumo, 'ml_por_contenedor') else None,
                            cantidad_calculada=cantidad_envases or Decimal('1'),
                            cantidad_final=cantidad_envases or Decimal('1'),
                            calculo_automatico=True
                        )
                        
                        print(f"✅ ConsultaInsumo creado: {insumo.medicamento} - Dosis: {dosis_numerica}, Cantidad: {cantidad_envases}")
                        
                    except (Insumo.DoesNotExist, ValueError, TypeError, AttributeError) as e:
                        print(f"❌ Error al guardar insumo {insumo_id}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        continue
            
            # ⭐ MANTENER COMPATIBILIDAD: Guardar también en MedicamentoUtilizado (modelo antiguo)
            for med in medicamentos:
                MedicamentoUtilizado.objects.create(
                    consulta=consulta,
                    inventario_id=med.get('id'),
                    nombre=med.get('nombre'),
                    dosis=med.get('dosis'),
                    peso_paciente=peso_paciente
                )
            
            # ⭐ ACTUALIZAR EL PESO DEL PACIENTE SI SE PROPORCIONÓ
            peso = data.get('peso')
            if peso:
                try:
                    peso_float = float(peso)
                    paciente.ultimo_peso = peso_float
                    paciente.save()
                except (ValueError, TypeError):
                    pass  # Si no se puede convertir, simplemente ignorar

            # Marcar la cita como completada si la consulta proviene de una cita
            cita_id = data.get('cita_id')
            if cita_id:
                try:
                    cita_relacionada = Cita.objects.get(id=cita_id, paciente=paciente)
                    cita_relacionada.estado = 'completada'
                    cita_relacionada.save(update_fields=['estado', 'fecha_modificacion'])
                except Cita.DoesNotExist:
                    pass
            
            # ⭐ CREAR COBRO PENDIENTE AUTOMÁTICAMENTE (después de guardar servicios e insumos)
            # La señal post_save no funciona porque se dispara antes de guardar los ManyToMany
            from caja.services import crear_cobro_pendiente_desde_consulta
            try:
                if consulta.servicios.exists() or consulta.insumos_detalle.exists():
                    crear_cobro_pendiente_desde_consulta(consulta, request.user)
            except Exception as e:
                print(f"⚠️ Error al crear cobro pendiente: {str(e)}")
                # No interrumpir el flujo, solo loguear el error
            
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
    FORCE_RELOAD_12345 = True  # Force Python bytecode reload
    print("\n" + "#"*80)
    print(f"### FICHA_MASCOTA VIEW EJECUTANDOSE - PK: {pk}")
    print("#"*80 + "\n", flush=True)
    
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
    
    # ⭐ AGREGAR CITAS AGENDADAS
    hoy = timezone.localdate()
    citas_agendadas = (
        Cita.objects.filter(paciente=paciente, fecha__gte=hoy)
        .exclude(estado__in=['completada', 'realizada'])
        .select_related('veterinario', 'servicio')
        .order_by('-fecha', '-hora_inicio')  # Orden descendente para mostrar más recientes primero
    )

    # Si el usuario es veterinario (y no administrador), solo mostrar sus citas agendadas
    if request.user.rol == 'veterinario' and not request.user.is_superuser and not request.user.is_staff:
        citas_agendadas = citas_agendadas.filter(veterinario=request.user)
    
    print(f"\n### CITAS AGENDADAS - Fecha hoy: {hoy}")
    print(f"### Total citas encontradas: {citas_agendadas.count()}")
    for cita in citas_agendadas:
        print(f"###   Cita ID {cita.id}: {cita.fecha} {cita.hora_inicio} - Vet: {cita.veterinario.nombre}")
    print("###" + "="*77 + "\n", flush=True)
    
    # FORZAR ORDEN DESCENDENTE SIEMPRE (más recientes primero)
    orden_timeline = 'desc'
    
    print(f"\n🔍 DEBUG ORDEN: FORZADO A DESC - orden_timeline = '{orden_timeline}'", file=sys.stderr)
    print(f"🔍 DEBUG ORDEN: reverse={orden_timeline == 'desc'}\n", file=sys.stderr)

    timeline_items = []
    for cita in citas_agendadas:
        event_dt = _normalize_event_dt(cita)
        timeline_items.append({
            'tipo': 'cita',
            'obj': cita,
            'fecha': event_dt.date(),
            'sort_key': event_dt,
        })

    for consulta in consultas:
        event_dt = _normalize_event_dt(consulta)
        timeline_items.append({
            'tipo': 'consulta',
            'obj': consulta,
            'fecha': event_dt.date(),
            'sort_key': event_dt,
        })

    # ORDENAR DESCENDENTE (más recientes primero) con reverse=True
    timeline_items = sorted(timeline_items, key=lambda x: x['sort_key'], reverse=True)
    
    print(f"\n✅ ORDEN FINAL ficha_mascota (después de sorted reverse=True):", file=sys.stderr)
    for i, it in enumerate(timeline_items):
        obj = it['obj']
        if it['tipo'] == 'cita':
            print(f"   [{i+1}] CITA: {obj.fecha} {obj.hora_inicio}", file=sys.stderr)
        else:
            print(f"   [{i+1}] CONSULTA: {obj.fecha}", file=sys.stderr)

    context = {
        'paciente': paciente,
        'consultas': consultas,
        'nombre_veterinario': nombre_veterinario,
        'veterinarios': veterinarios,
        'hospitalizaciones': paciente.hospitalizaciones.all(),
        'examenes': paciente.examenes.all(),
        'documentos': paciente.documentos.all(),
        'citas_agendadas': citas_agendadas,
        'timeline_items': timeline_items,
        'orden_timeline': orden_timeline,
    }
    return render(request, 'consulta/ficha_mascota.html', context)

@login_required
@require_http_methods(["GET"])
def obtener_servicios(request):
    """Retorna lista de servicios en formato JSON para cargar dinámicamente en consultas"""
    try:
        from servicios.models import ServicioInsumo
        
        categoria = request.GET.get('categoria')
        qs = Servicio.objects.all()
        if categoria:
            qs = qs.filter(categoria__iexact=categoria)

        servicios = []
        for servicio in qs.order_by('nombre'):
            # Obtener insumos asociados al servicio
            insumos_servicio = ServicioInsumo.objects.filter(servicio=servicio).select_related('insumo')
            insumos_data = []
            for si in insumos_servicio:
                insumo = si.insumo
                insumos_data.append({
                    'id': insumo.idInventario,
                    'nombre': insumo.medicamento,
                    'cantidad': si.cantidad,
                    'stock_actual': insumo.stock_actual,
                    'unidad': getattr(insumo, 'unidad', 'unidad'),
                    'origen': 'catalogo_servicio'  # Marca que viene del catálogo
                })
            
            servicios.append({
                'idServicio': servicio.idServicio,
                'nombre': servicio.nombre,
                'categoria': servicio.categoria,
                'duracion': servicio.duracion,
                'descripcion': servicio.descripcion,
                'descripcion_servicio': servicio.descripcion,
                'insumos': insumos_data  # ⭐ NUEVO: Insumos del servicio
            })

        return JsonResponse({
            'success': True,
            'servicios': servicios
        })
    except Exception as e:
        print('❌ Error en obtener_servicios:')
        print(f'   Tipo: {type(e).__name__}')
        print(f'   Mensaje: {str(e)}')
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["GET"])
def obtener_veterinarios(request):
    """Retorna lista de veterinarios para selección en cirugías"""
    try:
        veterinarios = CustomUser.objects.filter(rol='veterinario').order_by('nombre', 'apellido')
        data = []
        for vet in veterinarios:
            data.append({
                'id': vet.id,
                'nombre': f"{vet.nombre} {vet.apellido}".strip(),
                'especialidad': getattr(vet, 'especialidad', None),
            })
        return JsonResponse({
            'success': True,
            'veterinarios': data
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["GET"])
def obtener_insumos(request):
    """Retorna insumos de inventario para selección en cirugía/registro"""
    try:
        from inventario.models import Insumo
        insumos = Insumo.objects.all().order_by('medicamento')
        data = []
        for ins in insumos:
            data.append({
            'id': getattr(ins, 'idInventario', ins.pk),
                'nombre': ins.medicamento,
                'tipo': getattr(ins, 'tipo', None),
                'formato': getattr(ins, 'formato', None),
                'dosis_ml': getattr(ins, 'dosis_ml', None),
                'peso_kg': getattr(ins, 'peso_kg', None),
                'tiene_rango_peso': getattr(ins, 'tiene_rango_peso', False),
                'peso_min_kg': getattr(ins, 'peso_min_kg', None),
                'peso_max_kg': getattr(ins, 'peso_max_kg', None),
                'cantidad_pastillas': getattr(ins, 'cantidad_pastillas', None),
                'unidades_pipeta': getattr(ins, 'unidades_pipeta', None),
                'sku': getattr(ins, 'sku', None),
                'especie': getattr(ins, 'especie', None),
            })
        return JsonResponse({
            'success': True,
            'insumos': data
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


# ============================================
# VISTAS PARA HOSPITALIZACIONES
# ============================================

@login_required
@require_http_methods(["POST"])
def crear_hospitalizacion(request, paciente_id):
    """Crea una nueva hospitalización"""
    try:
        paciente = get_object_or_404(Paciente, id=paciente_id)
        data = json.loads(request.body)
        
        hospitalizacion = Hospitalizacion.objects.create(
            paciente=paciente,
            veterinario=request.user,
            fecha_ingreso=timezone.now(),
            motivo=data.get('motivo', ''),
            diagnostico_hosp=data.get('diagnostico', ''),
            estado='activa',
            observaciones=data.get('observaciones', '')
        )

        # Asignar insumos/implementos usados al ingreso
        insumos_ids = data.get('insumos', [])
        if insumos_ids:
            from inventario.models import Insumo
            # Insumo usa pk = idInventario
            insumos_qs = Insumo.objects.filter(idInventario__in=insumos_ids)
            hospitalizacion.insumos.set(insumos_qs)
        
        return JsonResponse({
            'success': True,
            'message': 'Hospitalización iniciada',
            'hospitalizacion_id': hospitalizacion.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["POST"])
def crear_cirugia(request, hospitalizacion_id):
    """Crea una cirugía para una hospitalización"""
    try:
        hospitalizacion = get_object_or_404(Hospitalizacion, id=hospitalizacion_id)
        data = json.loads(request.body)

        # Resolver servicio de cirugía (categoría cirugia)
        servicio = None
        servicio_id = data.get('servicio_id')
        if servicio_id:
            try:
                servicio = Servicio.objects.get(idServicio=servicio_id, categoria__iexact='cirugia')
            except Servicio.DoesNotExist:
                servicio = None
        servicio_nombre = servicio.nombre if servicio else data.get('tipo_cirugia', '')
        duracion = servicio.duracion if servicio else data.get('duracion_minutos')
        
        cirugia = Cirugia.objects.create(
            hospitalizacion=hospitalizacion,
            servicio=servicio,
            fecha_cirugia=timezone.now(),
            veterinario_cirujano=request.user,
            tipo_cirugia=servicio_nombre,
            descripcion=data.get('descripcion') or '',
            duracion_minutos=duracion,
            anestesiologo=data.get('anestesiologo') or '',
            tipo_anestesia=data.get('tipo_anestesia') or '',
            complicaciones=data.get('complicaciones') or '',
            resultado=data.get('resultado') or 'exitosa'
        )
        
        # Procesar medicamentos si existen
        medicamentos = data.get('medicamentos', [])
        if medicamentos:
            from inventario.models import Insumo
            for med_id in medicamentos:
                try:
                    insumo = Insumo.objects.get(idInventario=med_id)
                    cirugia.medicamentos.add(insumo)
                except Insumo.DoesNotExist:
                    pass
        
        return JsonResponse({
            'success': True,
            'message': 'Cirugía registrada',
            'cirugia_id': cirugia.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["POST"])
def crear_registro_diario(request, hospitalizacion_id):
    """Crea un registro diario de una hospitalización"""
    try:
        hospitalizacion = get_object_or_404(Hospitalizacion, id=hospitalizacion_id)
        data = json.loads(request.body)
        
        # Validar que temperatura sea obligatoria
        temperatura = data.get('temperatura')
        if not temperatura:
            return JsonResponse({
                'success': False,
                'error': 'La temperatura es obligatoria'
            }, status=400)
        
        # Convertir campos numéricos opcionales: cadenas vacías a None
        peso = data.get('peso')
        if peso == '' or peso is None:
            peso = None
        
        frecuencia_cardiaca = data.get('frecuencia_cardiaca')
        if frecuencia_cardiaca == '' or frecuencia_cardiaca is None:
            frecuencia_cardiaca = None
        
        frecuencia_respiratoria = data.get('frecuencia_respiratoria')
        if frecuencia_respiratoria == '' or frecuencia_respiratoria is None:
            frecuencia_respiratoria = None
        
        registro = RegistroDiario.objects.create(
            hospitalizacion=hospitalizacion,
            fecha_registro=timezone.now(),
            temperatura=temperatura,
            peso=peso,
            frecuencia_cardiaca=frecuencia_cardiaca,
            frecuencia_respiratoria=frecuencia_respiratoria,
            observaciones=data.get('observaciones', '')
        )
        
        # Actualizar el peso de la mascota si se proporcionó
        if peso:
            paciente = hospitalizacion.paciente
            paciente.ultimo_peso = peso
            paciente.save()
        
        # Procesar medicamentos si existen
        medicamentos = data.get('medicamentos', [])
        if medicamentos:
            from inventario.models import Insumo
            for med_id in medicamentos:
                try:
                    insumo = Insumo.objects.get(idInventario=med_id)
                    registro.medicamentos.add(insumo)
                except Insumo.DoesNotExist:
                    pass
        
        return JsonResponse({
            'success': True,
            'message': 'Registro diario creado',
            'registro_id': registro.id
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["POST"])
def crear_alta_medica(request, hospitalizacion_id):
    """Crea un alta médica para una hospitalización"""
    try:
        hospitalizacion = get_object_or_404(Hospitalizacion, id=hospitalizacion_id)
        data = json.loads(request.body)
        
        print('=' * 80)
        print(f'🏥 INICIANDO PROCESO DE ALTA MÉDICA')
        print(f'   Hospitalización ID: {hospitalizacion_id}')
        print(f'   Paciente: {hospitalizacion.paciente.nombre}')
        print(f'   Estado actual: {hospitalizacion.estado}')
        print('=' * 80)
        
        # ⭐ PASO 1: RECOPILAR SERVICIOS DE CIRUGÍAS
        # Obtener todos los servicios asociados a las cirugías de esta hospitalización
        servicios_cirugias = []
        cirugias = hospitalizacion.cirugias.all()
        
        print(f'\n📋 Cirugías registradas: {cirugias.count()}')
        for cirugia in cirugias:
            if cirugia.servicio:
                servicios_cirugias.append(cirugia.servicio)
                print(f'  ✅ Cirugía: {cirugia.tipo_cirugia} - Servicio: {cirugia.servicio.nombre}')
            else:
                print(f'  ⚠️  Cirugía: {cirugia.tipo_cirugia} - Sin servicio asociado')
        
        print(f'\n📦 Total de servicios a descontar: {len(servicios_cirugias)}')
        
        # ⭐ PASO 2: DESCONTAR INVENTARIO POR SERVICIOS (si hay servicios)
        if servicios_cirugias:
            try:
                from .services.inventario_service import discount_stock_for_services
                
                print(f'\n💰 Iniciando descuento de inventario...')
                
                # Llamar al servicio de descuento
                resultado = discount_stock_for_services(
                    services=servicios_cirugias,
                    user=request.user,
                    origen_obj=hospitalizacion
                )
                
                print(f'  ✅ Inventario descontado exitosamente')
                print(f'  📊 Items descontados: {resultado["total_items"]}')
                for item in resultado['insumos_descontados']:
                    print(f'    - {item["medicamento"]}: {item["cantidad_descontada"]} unidades (quedan {item["stock_restante"]})')
                
            except ValidationError as ve:
                # Error de validación (stock insuficiente o ya descontado)
                print(f'\n❌ Error de validación en inventario: {str(ve)}')
                return JsonResponse({
                    'success': False,
                    'error': f'Error de inventario: {str(ve)}'
                }, status=400)
            except Exception as e:
                # Cualquier otro error en el descuento
                print(f'\n❌ Error inesperado al descontar inventario: {str(e)}')
                import traceback
                traceback.print_exc()
                return JsonResponse({
                    'success': False,
                    'error': f'Error al procesar inventario: {str(e)}'
                }, status=500)
        else:
            print(f'\n  ℹ️  No hay servicios de cirugías para descontar inventario')
        
        # ⭐ PASO 3: CREAR ALTA MÉDICA (solo si inventario fue exitoso o no aplica)
        print(f'\n📄 Creando registro de alta médica...')
        alta = Alta.objects.create(
            hospitalizacion=hospitalizacion,
            fecha_alta=timezone.now(),
            diagnostico_final=data.get('diagnostico_final', ''),
            tratamiento_post_alta=data.get('tratamiento_post_alta', ''),
            recomendaciones=data.get('recomendaciones', ''),
            proxima_revision=data.get('proxima_revision') or None
        )
        print(f'  ✅ Alta médica creada con ID: {alta.id}')
        
        # ⭐ PASO 4: ACTUALIZAR ESTADO DE HOSPITALIZACIÓN
        print(f'\n🏥 Actualizando estado de hospitalización...')
        hospitalizacion.estado = 'alta'
        hospitalizacion.fecha_alta = timezone.now()
        hospitalizacion.save()
        print(f'  ✅ Estado actualizado a "alta"')
        
        print('=' * 80)
        print(f'✅ ALTA MÉDICA COMPLETADA EXITOSAMENTE')
        print(f'   Alta ID: {alta.id}')
        print(f'   Servicios procesados: {len(servicios_cirugias)}')
        print(f'   Inventario descontado: {"Sí" if servicios_cirugias else "No aplica"}')
        print('=' * 80)
        
        return JsonResponse({
            'success': True,
            'message': 'Alta médica registrada exitosamente',
            'alta_id': alta.id,
            'servicios_procesados': len(servicios_cirugias)
        })
    except Exception as e:
        print('=' * 80)
        print('❌ ERROR AL CREAR ALTA MÉDICA')
        print('=' * 80)
        print(f'Tipo de error: {type(e).__name__}')
        print(f'Mensaje: {str(e)}')
        import traceback
        print('Traceback completo:')
        traceback.print_exc()
        print('=' * 80)
        
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["GET"])
def obtener_hospitalizaciones(request, paciente_id):
    """Retorna lista de hospitalizaciones del paciente"""
    try:
        paciente = get_object_or_404(Paciente, id=paciente_id)
        hospitalizaciones = paciente.hospitalizaciones.all().order_by('-fecha_ingreso')
        
        data = []
        for hosp in hospitalizaciones:
            hosp_data = {
                'id': hosp.id,
                'fecha_ingreso': timezone.localtime(hosp.fecha_ingreso).strftime('%d/%m/%Y %H:%M'),
                'motivo': hosp.motivo,
                'estado': hosp.get_estado_display(),
                'tiene_cirugia': hosp.cirugias.exists(),
                'cirugias_count': hosp.cirugias.count(),
                'registros_diarios': hosp.registros_diarios.count(),
            }
            
            if hosp.fecha_alta:
                hosp_data['fecha_alta'] = hosp.fecha_alta.strftime('%d/%m/%Y %H:%M')
            
            if hasattr(hosp, 'alta_medica'):
                hosp_data['tiene_alta'] = True
            
            data.append(hosp_data)
        
        return JsonResponse({
            'success': True,
            'hospitalizaciones': data
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["GET"])
def detalle_hospitalizacion(request, paciente_id, hospitalizacion_id):
    """Retorna detalles completos de una hospitalización"""
    try:
        print(f"🔍 Buscando hospitalización: paciente_id={paciente_id}, hospitalizacion_id={hospitalizacion_id}")
        hospitalizacion = Hospitalizacion.objects.get(
            id=hospitalizacion_id,
            paciente_id=paciente_id
        )
        print(f"✅ Hospitalización encontrada: {hospitalizacion.id}")
        
        # Datos básicos
        data = {
            'id': hospitalizacion.id,
            'fecha_ingreso': timezone.localtime(hospitalizacion.fecha_ingreso).strftime('%d/%m/%Y %H:%M'),
            'motivo': hospitalizacion.motivo,
            'diagnostico': hospitalizacion.diagnostico_hosp,
            'estado': hospitalizacion.get_estado_display(),
            'observaciones': hospitalizacion.observaciones,
            'insumos_descontados': hospitalizacion.insumos_descontados,  # ⭐ NUEVO: Estado de descuento
            'insumos': [
                {
                    'id': getattr(ins, 'idInventario', getattr(ins, 'pk', None)),
                    'nombre': getattr(ins, 'medicamento', getattr(ins, 'nombre', '')),
                    'codigo': getattr(ins, 'codigo', None),
                    'formato': getattr(ins, 'formato', None),
                    'dosis_ml': getattr(ins, 'dosis_ml', None),
                    'peso_kg': getattr(ins, 'peso_kg', None),
                    'cantidad_pastillas': getattr(ins, 'cantidad_pastillas', None),
                    'unidades_pipeta': getattr(ins, 'unidades_pipeta', None),
                } for ins in hospitalizacion.insumos.all()
            ],
            # Veterinario puede ser nulo; manejarlo con gracia
            'veterinario': (
                f"{hospitalizacion.veterinario.nombre} {hospitalizacion.veterinario.apellido}"
                if hospitalizacion.veterinario else 'Sin asignar'
            ),
        }
        
        if hospitalizacion.fecha_alta:
            data['fecha_alta'] = timezone.localtime(hospitalizacion.fecha_alta).strftime('%d/%m/%Y %H:%M')
        
        # Cirugías (pueden ser múltiples)
        data['cirugias'] = []
        for cirugia in hospitalizacion.cirugias.all().order_by('-fecha_cirugia'):
            data['cirugias'].append({
                'id': cirugia.id,
                'tipo': cirugia.tipo_cirugia,
                'fecha': timezone.localtime(cirugia.fecha_cirugia).strftime('%d/%m/%Y %H:%M'),
                'veterinario': (
                    f"{cirugia.veterinario_cirujano.nombre} {cirugia.veterinario_cirujano.apellido}"
                    if cirugia.veterinario_cirujano else 'Sin asignar'
                ),
                'descripcion': cirugia.descripcion,
                'duracion': cirugia.duracion_minutos,
                'anestesia': cirugia.tipo_anestesia,
                'resultado': cirugia.get_resultado_display() if cirugia.resultado else 'Sin resultado',
                'complicaciones': cirugia.complicaciones,
                'servicio': ({
                    'id': cirugia.servicio.idServicio,
                    'nombre': cirugia.servicio.nombre,
                    'duracion': cirugia.servicio.duracion,
                } if cirugia.servicio else None),
                'insumos': [
                    {
                        'id': getattr(ins, 'idInventario', getattr(ins, 'pk', None)),
                        'nombre': getattr(ins, 'medicamento', getattr(ins, 'nombre', '')),
                        'codigo': getattr(ins, 'codigo', None),
                        'formato': getattr(ins, 'formato', None),
                        'dosis_ml': getattr(ins, 'dosis_ml', None),
                        'peso_kg': getattr(ins, 'peso_kg', None),
                        'cantidad_pastillas': getattr(ins, 'cantidad_pastillas', None),
                        'unidades_pipeta': getattr(ins, 'unidades_pipeta', None),
                    } for ins in cirugia.medicamentos.all()
                ]
            })
        
        # Registros diarios
        data['registros_diarios'] = []
        for registro in hospitalizacion.registros_diarios.all():
            data['registros_diarios'].append({
            'fecha': timezone.localtime(registro.fecha_registro).strftime('%d/%m/%Y %H:%M'),
                'temperatura': str(registro.temperatura) if registro.temperatura else '-',
                'peso': str(registro.peso) if registro.peso else '-',
                'frecuencia_cardiaca': registro.frecuencia_cardiaca,
                'frecuencia_respiratoria': registro.frecuencia_respiratoria,
                'observaciones': registro.observaciones,
                # RegistroDiario no tiene veterinario; usar el de la hospitalización o indicar sin asignar
                'veterinario': (
                    f"{hospitalizacion.veterinario.nombre} {hospitalizacion.veterinario.apellido}"
                    if hospitalizacion.veterinario else 'Sin asignar'
                ),
                'insumos': [
                    {
                        'id': getattr(ins, 'idInventario', getattr(ins, 'pk', None)),
                        'nombre': getattr(ins, 'medicamento', getattr(ins, 'nombre', '')),
                        'codigo': getattr(ins, 'codigo', None),
                        'formato': getattr(ins, 'formato', None),
                        'dosis_ml': getattr(ins, 'dosis_ml', None),
                        'peso_kg': getattr(ins, 'peso_kg', None),
                        'cantidad_pastillas': getattr(ins, 'cantidad_pastillas', None),
                        'unidades_pipeta': getattr(ins, 'unidades_pipeta', None),
                    } for ins in registro.medicamentos.all()
                ],
            })
        
        # Alta médica si existe
        if hasattr(hospitalizacion, 'alta_medica'):
            alta = hospitalizacion.alta_medica
            data['alta'] = {
                'fecha': alta.fecha_alta.strftime('%d/%m/%Y'),
                'diagnostico_final': alta.diagnostico_final,
                'tratamiento_post': alta.tratamiento_post_alta,
                'recomendaciones': alta.recomendaciones,
                'proxima_revision': alta.proxima_revision.strftime('%d/%m/%Y') if alta.proxima_revision else None,
            }
        
        return JsonResponse({
            'success': True,
            'hospitalizacion': data
        })
    except Hospitalizacion.DoesNotExist:
        print(f"❌ Hospitalización no encontrada: paciente_id={paciente_id}, hospitalizacion_id={hospitalizacion_id}")
        return JsonResponse({
            'success': False,
            'message': 'Hospitalización no encontrada'
        }, status=404)
    except Exception as e:
        import traceback
        print(f"❌ Error en detalle_hospitalizacion: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["POST"])
def subir_documento(request, paciente_id):
    """Sube un documento para un paciente"""
    try:
        paciente = get_object_or_404(Paciente, id=paciente_id)
        
        if 'archivo' not in request.FILES:
            return JsonResponse({
                'success': False,
                'message': 'No se ha seleccionado ningún archivo'
            }, status=400)
        
        archivo = request.FILES['archivo']
        nombre = request.POST.get('nombre', archivo.name)
        descripcion = request.POST.get('descripcion', '')
        
        # Crear el documento
        documento = Documento.objects.create(
            paciente=paciente,
            nombre=nombre,
            descripcion=descripcion,
            archivo=archivo
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Documento subido correctamente',
            'documento': {
                'id': documento.id,
                'nombre': documento.nombre,
                'descripcion': documento.descripcion,
                'fecha_subida': documento.fecha_subida.strftime('%d/%m/%Y %H:%M'),
                'url': documento.archivo.url
            }
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error al subir documento: {str(e)}'
        }, status=500)


@login_required
def descargar_documento(request, documento_id):
    """Descarga un documento"""
    try:
        documento = get_object_or_404(Documento, id=documento_id)
        
        # Verificar que el archivo existe
        if not os.path.exists(documento.archivo.path):
            raise Http404("El archivo no existe")
        
        # Retornar el archivo
        response = FileResponse(
            open(documento.archivo.path, 'rb'),
            content_type='application/octet-stream'
        )
        response['Content-Disposition'] = f'attachment; filename="{documento.nombre}"'
        return response
    except Documento.DoesNotExist:
        raise Http404("Documento no encontrado")
    except Exception as e:
        raise Http404(f"Error al descargar documento: {str(e)}")


@login_required
@require_http_methods(["DELETE"])
def eliminar_documento(request, documento_id):
    """Elimina un documento"""
    try:
        documento = get_object_or_404(Documento, id=documento_id)
        
        # Eliminar el archivo físico
        if os.path.exists(documento.archivo.path):
            os.remove(documento.archivo.path)
        
        # Eliminar el registro de la base de datos
        documento.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Documento eliminado correctamente'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error al eliminar documento: {str(e)}'
        }, status=500)