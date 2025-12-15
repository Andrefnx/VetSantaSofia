from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db import models
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
import json
from datetime import date, datetime
from .models import Paciente, Propietario
from agenda.models import Cita
from django.utils import timezone
import re
import unicodedata

# Importar desde las apps correctas
from inventario.models import Insumo
from servicios.models import Servicio

# Importar solo si existen
try:
    from clinica.models import Consulta, Examen, Documento, Hospitalizacion
    MODELOS_EXTENDIDOS = True
except ImportError:
    MODELOS_EXTENDIDOS = False

# Función auxiliar para normalizar teléfonos chilenos
def normalize_chile_phone(phone):
    """Normaliza números de teléfono chilenos al formato +569XXXXXXXX"""
    if not phone:
        return phone
    # Eliminar caracteres no numéricos excepto +
    normalized = re.sub(r'[^\d+]', '', phone)
    # Si empieza con +56, mantener
    if normalized.startswith('+56'):
        normalized = '+56' + re.sub(r'\D', '', normalized[3:])
    elif normalized.startswith('56'):
        normalized = '+56' + re.sub(r'\D', '', normalized[2:])
    else:
        # Sin prefijo de país, agregar +56
        normalized = '+56' + re.sub(r'\D', '', normalized)
    return normalized

def normalizar_texto(texto):
    """Normaliza un texto eliminando tildes, ñ->n y convirtiendo a minúsculas"""
    if not texto:
        return ''
    # Convertir a minúsculas
    texto = texto.lower().strip()
    # Eliminar tildes y diacríticos
    texto = ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )
    return texto

def validar_propietario_duplicado(nombre, apellido, telefono, email, propietario_id=None, ignore_name_warning=False):
    """
    Valida si un propietario ya existe en la base de datos.
    Retorna un diccionario con el resultado de la validación.
    """
    # Convertir propietario_id a int si es necesario
    if propietario_id:
        try:
            propietario_id = int(propietario_id)
        except (ValueError, TypeError):
            propietario_id = None
    
    # Normalizar teléfono y email
    telefono_normalizado = normalize_chile_phone(telefono) if telefono else ''
    email_normalizado = email.lower().strip() if email else ''
    
    # 1. Verificar nombre y apellido similares PRIMERO (advertencia)
    if not ignore_name_warning:
        nombre_norm = normalizar_texto(nombre)
        apellido_norm = normalizar_texto(apellido)
        
        # Buscar propietarios con nombre y apellido similares
        todos_propietarios = Propietario.objects.all()
        if propietario_id:
            todos_propietarios = todos_propietarios.exclude(id=propietario_id)
        
        for prop in todos_propietarios:
            prop_nombre_norm = normalizar_texto(prop.nombre)
            prop_apellido_norm = normalizar_texto(prop.apellido)
            
            if prop_nombre_norm == nombre_norm and prop_apellido_norm == apellido_norm:
                return {
                    'valid': False,
                    'type': 'nombre_duplicado',
                    'message': f'⚠️ Ya existe un propietario con ese nombre: {prop.nombre_completo}. '
                              f'Teléfono: {prop.telefono or "No registrado"}, Email: {prop.email or "No registrado"}. '
                              f'Puede que ya se haya atendido antes con otro número o correo. '
                              f'Se sugiere buscar el registro existente y actualizar su información.',
                    'propietario': prop,
                    'warning': True  # Es una advertencia, no un error estricto
                }
    
    # 2. Verificar teléfono duplicado (estricto - no permitir)
    if telefono_normalizado:
        query = Propietario.objects.filter(telefono=telefono_normalizado)
        print(f"[VALIDACION] Propietarios con telefono {telefono_normalizado}: {query.count()}")
        if propietario_id:
            print(f"[VALIDACION] Excluyendo propietario_id={propietario_id} (tipo: {type(propietario_id)})")
            query = query.exclude(id=propietario_id)
            print(f"[VALIDACION] Despues de exclude: {query.count()}")
        if query.exists():
            prop_existente = query.first()
            print(f"[VALIDACION] Encontrado duplicado: ID={prop_existente.id}, nombre={prop_existente.nombre_completo}")
            return {
                'valid': False,
                'type': 'telefono_duplicado',
                'message': f'Ya existe un propietario con ese teléfono: {prop_existente.nombre_completo}',
                'propietario': prop_existente
            }
    
    # 3. Verificar email duplicado (estricto - no permitir)
    if email_normalizado:
        query = Propietario.objects.filter(email__iexact=email_normalizado)
        if propietario_id:
            query = query.exclude(id=propietario_id)
        if query.exists():
            prop_existente = query.first()
            return {
                'valid': False,
                'type': 'email_duplicado',
                'message': f'Ya existe un propietario con ese email: {prop_existente.nombre_completo}',
                'propietario': prop_existente
            }
    
    return {'valid': True}

@login_required
def pacientes_view(request):
    """Vista para listar todos los pacientes (activos o archivados)"""
    # Obtener el estado desde el parámetro GET (por defecto: activos)
    estado = request.GET.get('estado', 'activos')
    
    if estado == 'archivados':
        pacientes = Paciente.objects.select_related('propietario').filter(activo=False).order_by('-fecha_registro')
    else:
        pacientes = Paciente.objects.select_related('propietario').filter(activo=True).order_by('-fecha_registro')
    
    context = {
        'pacientes': pacientes,
        'estado_actual': estado
    }
    return render(request, 'pacientes/pacientes.html', context)

@login_required
def ficha_mascota_view(request, paciente_id):
    """Vista de la ficha de la mascota"""
    print("\n" + "="*80)
    print(f"🔍 FICHA_MASCOTA_VIEW EJECUTANDOSE - Paciente ID: {paciente_id}")
    print("="*80 + "\n", flush=True)
    
    from cuentas.models import CustomUser
    
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    # Obtener consultas con medicamentos (ahora funcionará)
    consultas = paciente.consultas.select_related('veterinario').prefetch_related('medicamentos').all()
    
    # ⭐ OBTENER CITAS AGENDADAS (futuras o hoy)
    hoy = timezone.localdate()
    citas_agendadas = (
        Cita.objects.filter(paciente=paciente, fecha__gte=hoy)
        .exclude(estado__in=['completada', 'realizada'])
        .select_related('veterinario', 'servicio')
        .order_by('fecha', 'hora_inicio')
    )
    
    print(f"📅 Fecha hoy: {hoy}")
    print(f"📋 Total citas agendadas encontradas: {citas_agendadas.count()}")
    for cita in citas_agendadas:
        print(f"   └─ Cita ID {cita.id}: {cita.fecha} {cita.hora_inicio}-{cita.hora_fin} | Vet: {cita.veterinario.nombre} | Servicio: {cita.servicio.nombre if cita.servicio else 'Sin servicio'}")
    print("", flush=True)
    
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
    
    # ⭐ ORDEN DEL TIMELINE (ascendente por defecto)
    orden_timeline = request.GET.get('orden_timeline', 'asc').lower()
    if orden_timeline not in ['asc', 'desc']:
        orden_timeline = 'asc'

    # ⭐ Normalizador de fecha/hora para ordenar eventos (citas + consultas)
    from datetime import time as _time
    def _normalize_event_dt_local(obj):
        try:
            # Detectar Cita por atributo `hora_inicio`
            if hasattr(obj, 'hora_inicio'):
                base_date = obj.fecha
                base_time = getattr(obj, 'hora_inicio', None) or _time.min
                dt = datetime.combine(base_date, base_time)
            else:
                # Consulta: `fecha` puede ser datetime o date
                dt_value = getattr(obj, 'fecha', None)
                if isinstance(dt_value, datetime):
                    dt = dt_value
                else:
                    dt = datetime.combine(dt_value, _time.min)

            # Asegurar que sea timezone-aware
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_current_timezone())
            return dt
        except Exception:
            today = timezone.localdate()
            fallback = datetime.combine(today, _time.min)
            return timezone.make_aware(fallback, timezone.get_current_timezone())

    # ⭐ Construir lista unificada y ordenada
    timeline_items = []
    for cita in citas_agendadas:
        event_dt = _normalize_event_dt_local(cita)
        timeline_items.append({
            'tipo': 'cita',
            'obj': cita,
            'fecha': event_dt.date(),
            'sort_key': (event_dt.date(), event_dt.time()),
        })

    for consulta in consultas:
        event_dt = _normalize_event_dt_local(consulta)
        timeline_items.append({
            'tipo': 'consulta',
            'obj': consulta,
            'fecha': event_dt.date(),
            'sort_key': (event_dt.date(), event_dt.time()),
        })

    timeline_items = sorted(
        timeline_items,
        key=lambda item: item['sort_key'],
        reverse=(orden_timeline == 'desc')
    )

    # Contexto
    context = {
        'paciente': paciente,
        'paciente_data_json': paciente_data,
        'consultas': consultas,
        'citas_agendadas': citas_agendadas,
        'hospitalizaciones': hospitalizaciones,
        'examenes': examenes,
        'documentos': documentos,
        'veterinarios': veterinarios,  # ⭐ AGREGAR VETERINARIOS
        'propietarios': propietarios,  # ⭐ AGREGAR PROPIETARIOS
        'timeline_items': timeline_items,
        'orden_timeline': orden_timeline,
    }
    
    return render(request, 'consulta/ficha_mascota.html', context)

@csrf_exempt
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
            'fecha_nacimiento': str(paciente.fecha_nacimiento) if paciente.fecha_nacimiento else None,
            'edad_anos': paciente.edad_anos,
            'edad_meses': paciente.edad_meses,
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
                    propietario.telefono = normalize_chile_phone(propietario_data.get('telefono', propietario.telefono))
                    propietario.email = propietario_data.get('email', propietario.email)
                    propietario.direccion = propietario_data.get('direccion', propietario.direccion)
                    propietario.save()
            else:
                propietario_data = data.get('propietario', {})
                ignore_name_warning = data.get('ignore_name_warning', False)
                
                # Validar propietario duplicado antes de crear
                validacion = validar_propietario_duplicado(
                    nombre=propietario_data.get('nombre'),
                    apellido=propietario_data.get('apellido'),
                    telefono=propietario_data.get('telefono', ''),
                    email=propietario_data.get('email', ''),
                    ignore_name_warning=ignore_name_warning
                )
                
                if not validacion['valid']:
                    return JsonResponse({
                        'success': False,
                        'error': validacion['message'],
                        'error_type': validacion['type'],
                        'warning': validacion.get('warning', False)
                    }, status=400)
                
                propietario = Propietario.objects.create(
                    nombre=propietario_data.get('nombre'),
                    apellido=propietario_data.get('apellido'),
                    telefono=normalize_chile_phone(propietario_data.get('telefono', '')),
                    email=propietario_data.get('email', ''),
                    direccion=propietario_data.get('direccion', '')
                )
            
            paciente_data = data.get('paciente', {})
            tipo_edad = data.get('tipo_edad', 'fecha')
            
            # Inicializar campos de edad
            fecha_nacimiento = None
            edad_anos = None
            edad_meses = None
            
            if tipo_edad == 'fecha':
                fecha_nac = data.get('fecha_nacimiento')
                if fecha_nac:
                    fecha_nacimiento = datetime.strptime(fecha_nac, '%Y-%m-%d').date()
                    if fecha_nacimiento > date.today():
                        return JsonResponse({
                            'success': False,
                            'error': 'La fecha de nacimiento no puede ser futura'
                        }, status=400)
            elif tipo_edad == 'estimada':
                edad_anos = data.get('edad_anos')
                edad_meses = data.get('edad_meses')
                edad_anos = int(edad_anos) if edad_anos else 0
                edad_meses = int(edad_meses) if edad_meses else 0
                
                # Calcular fecha de nacimiento aproximada
                hoy = date.today()
                # Restar años y meses
                mes = hoy.month - edad_meses
                ano = hoy.year - edad_anos
                
                # Ajustar si el mes es negativo
                if mes <= 0:
                    mes += 12
                    ano -= 1
                
                # Manejar el día (usar el día actual o el último día del mes si no existe)
                try:
                    fecha_nacimiento = date(ano, mes, hoy.day)
                except ValueError:
                    # Si el día no existe en ese mes (ej: 31 de febrero), usar el último día del mes
                    if mes == 2:
                        fecha_nacimiento = date(ano, mes, 28)
                    else:
                        fecha_nacimiento = date(ano, mes, 30)
            
            # Manejar microchip: convertir cadena vacía a None
            microchip = paciente_data.get('microchip', '').strip()
            microchip = microchip if microchip else None
            
            paciente = Paciente.objects.create(
                nombre=paciente_data.get('nombre'),
                especie=paciente_data.get('especie'),
                raza=paciente_data.get('raza', ''),
                fecha_nacimiento=fecha_nacimiento,
                edad_anos=edad_anos,
                edad_meses=edad_meses,
                sexo=paciente_data.get('sexo'),
                color=paciente_data.get('color', ''),
                microchip=microchip,
                ultimo_peso=paciente_data.get('ultimo_peso'),
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
        
        # Permitir cuerpo JSON o formulario clásico
        if request.content_type and 'application/json' in request.content_type:
            payload = json.loads(request.body.decode('utf-8') or '{}')
        else:
            payload = request.POST.dict()
        
        paciente_data = payload.get('paciente', payload)
        propietario_data = payload.get('propietario', payload)
        propietario_id = payload.get('propietario_id')
        # Convertir propietario_id a int si viene como string
        if propietario_id:
            try:
                propietario_id = int(propietario_id)
            except (ValueError, TypeError):
                propietario_id = None
        actualizar_propietario = payload.get('actualizar_propietario', False)
        ignore_name_warning = payload.get('ignore_name_warning', False)
        if isinstance(ignore_name_warning, str):
            ignore_name_warning = ignore_name_warning.lower() in ['true', '1', 'on']
        if isinstance(actualizar_propietario, str):
            actualizar_propietario = actualizar_propietario.lower() in ['true', '1', 'on']
        crear_nuevo_propietario = payload.get('crear_nuevo_propietario', False)
        if isinstance(crear_nuevo_propietario, str):
            crear_nuevo_propietario = crear_nuevo_propietario.lower() in ['true', '1', 'on']
        
        # LOG DEBUG
        print(f"\n=== EDITAR PACIENTE DEBUG ===")
        print(f"propietario_id recibido: {propietario_id}")
        print(f"actualizar_propietario: {actualizar_propietario}")
        print(f"crear_nuevo_propietario: {crear_nuevo_propietario}")
        print(f"paciente.propietario_id actual: {paciente.propietario_id}")

        campos_basicos = ['nombre', 'especie', 'raza', 'sexo', 'color', 'microchip']
        for campo in campos_basicos:
            if paciente_data.get(campo) is not None:
                setattr(paciente, campo, paciente_data.get(campo) or '')        
        # Manejar microchip especialmente: convertir cadena vacía a None
        microchip_value = paciente_data.get('microchip', '').strip() if isinstance(paciente_data.get('microchip'), str) else ''
        paciente.microchip = microchip_value if microchip_value else None        
        tipo_edad = payload.get('tipo_edad')
        
        if tipo_edad == 'fecha':
            fecha_nac = payload.get('fecha_nacimiento')
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
            edad_anos = payload.get('edad_anos')
            edad_meses = payload.get('edad_meses')
            edad_anos = int(edad_anos) if edad_anos and str(edad_anos).strip() else 0
            edad_meses = int(edad_meses) if edad_meses and str(edad_meses).strip() else 0
            
            paciente.edad_anos = edad_anos
            paciente.edad_meses = edad_meses
            
            # Calcular fecha de nacimiento aproximada
            hoy = date.today()
            # Restar años y meses
            mes = hoy.month - edad_meses
            ano = hoy.year - edad_anos
            
            # Ajustar si el mes es negativo
            if mes <= 0:
                mes += 12
                ano -= 1
            
            # Manejar el día (usar el día actual o el último día del mes si no existe)
            try:
                paciente.fecha_nacimiento = date(ano, mes, hoy.day)
            except ValueError:
                # Si el día no existe en ese mes (ej: 31 de febrero), usar el último día del mes
                if mes == 2:
                    paciente.fecha_nacimiento = date(ano, mes, 28)
                else:
                    paciente.fecha_nacimiento = date(ano, mes, 30)
        
        if crear_nuevo_propietario:
            nombre_nuevo = propietario_data.get('nombre') or propietario_data.get('propietario_nombre_edit', '')
            apellido_nuevo = propietario_data.get('apellido') or propietario_data.get('propietario_apellido_edit', '')
            telefono_nuevo = propietario_data.get('telefono') or propietario_data.get('propietario_telefono', '')
            email_nuevo = propietario_data.get('email') or propietario_data.get('propietario_email', '')
            
            # Validar propietario duplicado antes de crear
            validacion = validar_propietario_duplicado(
                nombre=nombre_nuevo,
                apellido=apellido_nuevo,
                telefono=telefono_nuevo,
                email=email_nuevo,
                ignore_name_warning=ignore_name_warning
            )
            
            if not validacion['valid']:
                return JsonResponse({
                    'success': False,
                    'error': validacion['message'],
                    'error_type': validacion['type'],
                    'warning': validacion.get('warning', False)
                }, status=400)
            
            nuevo_propietario = Propietario.objects.create(
                nombre=nombre_nuevo,
                apellido=apellido_nuevo,
                telefono=normalize_chile_phone(telefono_nuevo),
                email=email_nuevo,
                direccion=propietario_data.get('direccion') or propietario_data.get('propietario_direccion', '')
            )
            paciente.propietario = nuevo_propietario
        else:
            propietario_id_efectivo = propietario_id or paciente.propietario_id
            print(f"propietario_id_efectivo calculado: {propietario_id_efectivo}")
            
            if propietario_id_efectivo:
                propietario = get_object_or_404(Propietario, id=propietario_id_efectivo)
                paciente.propietario = propietario
                
                if actualizar_propietario:
                    nuevo_nombre = propietario_data.get('nombre') or propietario_data.get('propietario_nombre_edit', propietario.nombre)
                    nuevo_apellido = propietario_data.get('apellido') or propietario_data.get('propietario_apellido_edit', propietario.apellido)
                    nuevo_telefono = propietario_data.get('telefono') or propietario_data.get('propietario_telefono', propietario.telefono)
                    nuevo_email = propietario_data.get('email') or propietario_data.get('propietario_email', propietario.email)
                    
                    print(f"Actualizando propietario ID: {propietario.id}")
                    print(f"nuevo_telefono: {nuevo_telefono}")
                    print(f"nuevo_email: {nuevo_email}")
                    
                    # Solo validar si cambió el teléfono o email
                    telefono_cambio = normalize_chile_phone(nuevo_telefono) != propietario.telefono
                    email_cambio = nuevo_email.lower().strip() != (propietario.email or '').lower().strip()
                    
                    print(f"telefono_cambio: {telefono_cambio}, email_cambio: {email_cambio}")
                    
                    if telefono_cambio or email_cambio:
                        # Validar si los cambios crean duplicados
                        validacion = validar_propietario_duplicado(
                            nombre=nuevo_nombre,
                            apellido=nuevo_apellido,
                            telefono=nuevo_telefono,
                            email=nuevo_email,
                            propietario_id=propietario.id,  # Excluir el propietario actual
                            ignore_name_warning=ignore_name_warning
                        )
                        
                        print(f"Resultado validación: {validacion}")
                        
                        if not validacion['valid']:
                            return JsonResponse({
                                'success': False,
                                'error': validacion['message'],
                                'error_type': validacion['type'],
                                'warning': validacion.get('warning', False)
                            }, status=400)
                    
                    propietario.nombre = nuevo_nombre
                    propietario.apellido = nuevo_apellido
                    propietario.telefono = normalize_chile_phone(nuevo_telefono)
                    propietario.email = nuevo_email
                    propietario.direccion = propietario_data.get('direccion') or propietario_data.get('propietario_direccion', propietario.direccion)
                    propietario.save()
            elif propietario_data.get('nombre') or propietario_data.get('propietario_nombre_edit'):
                nombre_nuevo = propietario_data.get('nombre') or propietario_data.get('propietario_nombre_edit', '')
                apellido_nuevo = propietario_data.get('apellido') or propietario_data.get('propietario_apellido_edit', '')
                telefono_nuevo = propietario_data.get('telefono') or propietario_data.get('propietario_telefono', '')
                email_nuevo = propietario_data.get('email') or propietario_data.get('propietario_email', '')
                
                # Validar propietario duplicado antes de crear
                validacion = validar_propietario_duplicado(
                    nombre=nombre_nuevo,
                    apellido=apellido_nuevo,
                    telefono=telefono_nuevo,
                    email=email_nuevo,
                    ignore_name_warning=ignore_name_warning
                )
                
                if not validacion['valid']:
                    return JsonResponse({
                        'success': False,
                        'error': validacion['message'],
                        'error_type': validacion['type'],
                        'warning': validacion.get('warning', False)
                    }, status=400)
                
                nuevo_propietario = Propietario.objects.create(
                    nombre=nombre_nuevo,
                    apellido=apellido_nuevo,
                    telefono=normalize_chile_phone(telefono_nuevo),
                    email=email_nuevo,
                    direccion=propietario_data.get('direccion') or propietario_data.get('propietario_direccion', '')
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
def archivar_paciente(request, paciente_id):
    """Vista para archivar/desarchivar un paciente"""
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    if request.method == 'POST':
        try:
            # Alternar el estado activo
            paciente.activo = not paciente.activo
            paciente.save()
            
            mensaje = 'Paciente archivado exitosamente' if not paciente.activo else 'Paciente restaurado exitosamente'
            return JsonResponse({'success': True, 'message': mensaje})
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
