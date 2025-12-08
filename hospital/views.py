from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.db import models
from .models import Insumo, Servicio, Paciente, Propietario
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from datetime import date
from decimal import Decimal 
import pytz
# Importar solo si existen
try:
    from .models import Consulta, Hospitalizacion, Examen, Documento, Producto
    MODELOS_EXTENDIDOS = True
except ImportError:
    MODELOS_EXTENDIDOS = False

# --- CONSULTAS ---
def consulta_view(request):
    return render(request, 'consultas/consulta.html')

# --- HOSPITALIZACIÓN ---
def hospital_view(request):
    return render(request, 'hospitalizacion/hospital.html')

# --- PACIENTES ---
@login_required
def pacientes_view(request):
    """Vista para listar todos los pacientes"""
    pacientes = Paciente.objects.select_related('propietario').filter(activo=True).order_by('-fecha_registro')
    
    context = {
        'pacientes': pacientes,
    }
    
    return render(request, 'pacientes/pacientes.html', context)

@login_required
def ficha_mascota_view(request, paciente_id):
    """Vista para mostrar la ficha de un paciente específico"""
    paciente = get_object_or_404(Paciente, id=paciente_id, activo=True)
    
    # Obtener todos los propietarios para el selector
    propietarios = Propietario.objects.all().order_by('nombre', 'apellido')
    
    context = {
        'paciente': paciente,
        'propietarios': propietarios,
        'hoy': date.today(),  # Agregar fecha de hoy
    }
    
    # Agregar datos relacionados solo si los modelos existen
    if MODELOS_EXTENDIDOS:
        try:
            context['consultas'] = Consulta.objects.filter(paciente=paciente).order_by('-fecha')[:10]
        except:
            context['consultas'] = []
        
        try:
            context['hospitalizaciones'] = Hospitalizacion.objects.filter(idMascota=paciente).order_by('-fecha_ingreso')
        except:
            context['hospitalizaciones'] = []
        
        try:
            context['examenes'] = Examen.objects.filter(paciente=paciente).order_by('-fecha')
        except:
            context['examenes'] = []
        
        try:
            context['documentos'] = Documento.objects.filter(paciente=paciente).order_by('-fecha_subida')
        except:
            context['documentos'] = []
        
        if context['consultas']:
            ultima_consulta = context['consultas'][0]
            paciente.fecha_ultimo_control = ultima_consulta.fecha
            if hasattr(ultima_consulta, 'peso') and ultima_consulta.peso:
                paciente.ultimo_peso = ultima_consulta.peso
            paciente.save()
    else:
        context['consultas'] = []
        context['hospitalizaciones'] = []
        context['examenes'] = []
        context['documentos'] = []
    
    return render(request, 'pacientes/ficha_mascota.html', context)

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
            'edad': paciente.edad or '',
            'sexo': paciente.sexo,
            'color': paciente.color or '',
            'microchip': paciente.microchip or '',
            'ultimo_peso': float(paciente.ultimo_peso) if paciente.ultimo_peso else None,
            'observaciones': paciente.observaciones or '',
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
            
            # Obtener o crear propietario
            propietario_id = data.get('propietario_id')
            actualizar_propietario = data.get('actualizar_propietario', False)
            
            if propietario_id:
                # Usar propietario existente
                propietario = get_object_or_404(Propietario, id=propietario_id)
                
                # Si se marcó para actualizar, actualizar sus datos
                if actualizar_propietario:
                    propietario_data = data.get('propietario', {})
                    propietario.nombre = propietario_data.get('nombre', propietario.nombre)
                    propietario.apellido = propietario_data.get('apellido', propietario.apellido)
                    propietario.telefono = propietario_data.get('telefono', propietario.telefono)
                    propietario.email = propietario_data.get('email', propietario.email)
                    propietario.direccion = propietario_data.get('direccion', propietario.direccion)
                    propietario.save()
            else:
                # Crear nuevo propietario
                propietario_data = data.get('propietario', {})
                propietario = Propietario.objects.create(
                    nombre=propietario_data.get('nombre'),
                    apellido=propietario_data.get('apellido'),
                    telefono=propietario_data.get('telefono', ''),
                    email=propietario_data.get('email', ''),
                    direccion=propietario_data.get('direccion', '')
                )
            
            # Crear paciente
            paciente_data = data.get('paciente', {})
            paciente = Paciente.objects.create(
                nombre=paciente_data.get('nombre'),
                especie=paciente_data.get('especie'),  # <-- FALTABA CERRAR AQUÍ
                raza=paciente_data.get('raza', ''),
                edad=paciente_data.get('edad', ''),
                sexo=paciente_data.get('sexo'),
                color=paciente_data.get('color', ''),
                microchip=paciente_data.get('microchip', ''),
                ultimo_peso=paciente_data.get('ultimo_peso'),
                observaciones=paciente_data.get('observaciones', ''),
                propietario=propietario
            )
            
            return JsonResponse({
                'success': True,
                'paciente_id': paciente.id,
                'message': 'Paciente creado exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def editar_paciente(request, paciente_id):
    """Vista para editar un paciente"""
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Actualizar propietario si se proporcionaron datos
            propietario_id = data.get('propietario_id')
            actualizar_propietario = data.get('actualizar_propietario', False)
            
            if propietario_id and actualizar_propietario:
                propietario = get_object_or_404(Propietario, id=propietario_id)
                propietario_data = data.get('propietario', {})
                propietario.nombre = propietario_data.get('nombre', propietario.nombre)
                propietario.apellido = propietario_data.get('apellido', propietario.apellido)
                propietario.telefono = propietario_data.get('telefono', propietario.telefono)
                propietario.email = propietario_data.get('email', propietario.email)
                propietario.direccion = propietario_data.get('direccion', propietario.direccion)
                propietario.save()
            
            # Actualizar datos del paciente
            paciente_data = data.get('paciente', {})
            paciente.nombre = paciente_data.get('nombre', paciente.nombre)
            paciente.especie = paciente_data.get('especie', paciente.especie)
            paciente.raza = paciente_data.get('raza', paciente.raza)
            paciente.edad = paciente_data.get('edad', paciente.edad)
            paciente.sexo = paciente_data.get('sexo', paciente.sexo)
            paciente.color = paciente_data.get('color', paciente.color)
            paciente.microchip = paciente_data.get('microchip', paciente.microchip)
            paciente.observaciones = paciente_data.get('observaciones', paciente.observaciones)
            
            if paciente_data.get('ultimo_peso'):
                paciente.ultimo_peso = paciente_data.get('ultimo_peso')
            
            paciente.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Paciente actualizado exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
@login_required
def eliminar_paciente(request, paciente_id):
    """Vista para eliminar (marcar como inactivo) un paciente"""
    paciente = get_object_or_404(Paciente, id=paciente_id)
    
    if request.method == 'POST':
        try:
            paciente.activo = False
            paciente.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Paciente eliminado exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

# --- PROPIETARIOS ---
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

# --- VETERINARIOS ---
def vet_ficha_view(request):
    return render(request, 'veterinarios/vet_ficha.html')

def vet_disponibilidad_view(request):
    return render(request, 'veterinarios/vet_disponibilidad.html')

def vet_view(request):
    return render(request, 'veterinarios/veterinarios.html')

# --- INVENTARIO ---
def inventario(request):
    insumos = Insumo.objects.all()
    return render(request, 'inventario/inventario.html', {'insumos': insumos})

@csrf_exempt
@login_required
def crear_insumo(request):
    """Vista para crear un nuevo insumo"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Preparar datos para crear el insumo
            insumo_data = {
                'medicamento': data.get('nombre_comercial', ''),
                'sku': data.get('sku', ''),  # ⭐ AGREGAR
                'tipo': data.get('tipo', ''),
                'descripcion': data.get('descripcion', ''),
                'especie': data.get('especie', ''),
                'precio_venta': Decimal(str(data.get('precio_venta', 0))) if data.get('precio_venta') else Decimal('0'),
                'stock_actual': int(data.get('stock_actual', 0)) if data.get('stock_actual') else 0,
                'dosis_ml': Decimal(str(data.get('dosis_ml'))) if data.get('dosis_ml') else None,
                'peso_kg': Decimal(str(data.get('peso_kg'))) if data.get('peso_kg') else None,
                'ml_contenedor': Decimal(str(data.get('ml_contenedor'))) if data.get('ml_contenedor') else None,
                'precauciones': data.get('precauciones', ''),
                'contraindicaciones': data.get('contraindicaciones', ''),
                'efectos_adversos': data.get('efectos_adversos', ''),
                
                # Campos de trazabilidad
                'fecha_creacion': timezone.now(),
                'ultimo_ingreso': timezone.now(),
                'ultimo_movimiento': timezone.now(),
                'tipo_ultimo_movimiento': 'registro_inicial',
                'usuario_ultimo_movimiento': request.user,  # ✅ Asignar usuario
            }
            
            # Crear el insumo
            insumo = Insumo.objects.create(**insumo_data)
            
            # Formatear nombre de usuario para respuesta
            try:
                if hasattr(request.user, 'nombre') and hasattr(request.user, 'apellido'):
                    usuario_nombre = f"{request.user.nombre} {request.user.apellido}".strip()
                    if not usuario_nombre:
                        usuario_nombre = request.user.username
                else:
                    usuario_nombre = request.user.get_full_name() or request.user.username
            except:
                usuario_nombre = request.user.username
            
            return JsonResponse({
                'success': True,
                'message': 'Producto creado correctamente',
                'insumo_id': insumo.idInventario,
                'debug': {
                    'dosis_ml': float(insumo.dosis_ml) if insumo.dosis_ml else None,
                    'peso_kg': float(insumo.peso_kg) if insumo.peso_kg else None,
                    'ml_contenedor': float(insumo.ml_contenedor) if insumo.ml_contenedor else None,
                    'usuario': usuario_nombre,
                    'usuario_id': request.user.id,
                }
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'})

@csrf_exempt
@login_required
def editar_insumo(request, insumo_id):
    """Vista para editar un insumo existente"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            insumo = get_object_or_404(Insumo, idInventario=insumo_id)
            
            # Guardar stock anterior para calcular el tipo de movimiento
            stock_anterior = insumo.stock_actual
            
            # Actualizar campos básicos
            insumo.medicamento = data.get('nombre_comercial', insumo.medicamento)
            insumo.sku = data.get('sku', insumo.sku)
            insumo.tipo = data.get('tipo', insumo.tipo)
            insumo.descripcion = data.get('descripcion', '')
            insumo.especie = data.get('especie', insumo.especie)
            insumo.precio_venta = Decimal(str(data.get('precio_venta', 0))) if data.get('precio_venta') else Decimal('0')
            
            # Actualizar stock
            nuevo_stock = int(data.get('stock_actual', 0)) if data.get('stock_actual') else 0
            insumo.stock_actual = nuevo_stock
            
            # Actualizar dosis
            insumo.dosis_ml = Decimal(str(data.get('dosis_ml'))) if data.get('dosis_ml') else None
            insumo.peso_kg = Decimal(str(data.get('peso_kg'))) if data.get('peso_kg') else None
            insumo.ml_contenedor = Decimal(str(data.get('ml_contenedor'))) if data.get('ml_contenedor') else None
            
            # Actualizar precauciones
            insumo.precauciones = data.get('precauciones', '')
            insumo.contraindicaciones = data.get('contraindicaciones', '')
            insumo.efectos_adversos = data.get('efectos_adversos', '')
            
            # ✅ ACTUALIZAR INFORMACIÓN DE TRAZABILIDAD
            insumo.ultimo_movimiento = timezone.now()
            insumo.usuario_ultimo_movimiento = request.user
            
            # Determinar tipo de movimiento según cambio de stock
            if nuevo_stock > stock_anterior:
                insumo.tipo_ultimo_movimiento = 'entrada'
                insumo.ultimo_ingreso = timezone.now()
            elif nuevo_stock < stock_anterior:
                insumo.tipo_ultimo_movimiento = 'salida'
            else:
                insumo.tipo_ultimo_movimiento = 'ajuste_manual'
            
            # GUARDAR CAMBIOS
            insumo.save()
            
            # ✅ FORMATEAR NOMBRE DE USUARIO PARA RESPUESTA
            try:
                if hasattr(request.user, 'nombre') and hasattr(request.user, 'apellido'):
                    usuario_nombre = f"{request.user.nombre} {request.user.apellido}".strip()
                    if not usuario_nombre:
                        usuario_nombre = request.user.username
                else:
                    usuario_nombre = request.user.get_full_name() or request.user.username
            except:
                usuario_nombre = request.user.username
            
            # 🕒 CONVERTIR A HORA LOCAL
            from django.utils.timezone import localtime
            ultimo_movimiento_local = localtime(insumo.ultimo_movimiento)
            
            # ✅ OBTENER DISPLAY DEL TIPO DE MOVIMIENTO
            tipo_movimiento_display = dict(Insumo.TIPO_MOVIMIENTO_CHOICES).get(
                insumo.tipo_ultimo_movimiento, 
                insumo.tipo_ultimo_movimiento
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Producto actualizado correctamente',
                'debug': {
                    'dosis_ml': float(insumo.dosis_ml) if insumo.dosis_ml else None,
                    'peso_kg': float(insumo.peso_kg) if insumo.peso_kg else None,
                    'ml_contenedor': float(insumo.ml_contenedor) if insumo.ml_contenedor else None,
                    'usuario': usuario_nombre,
                    'usuario_id': request.user.id,
                    'stock_anterior': stock_anterior,
                    'stock_nuevo': nuevo_stock,
                    'tipo_movimiento': insumo.tipo_ultimo_movimiento,
                    'tipo_movimiento_display': tipo_movimiento_display,  # ⭐ AGREGAR
                    'ultimo_movimiento': ultimo_movimiento_local.strftime('%d/%m/%Y %H:%M'),
                }
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'})

@csrf_exempt
@login_required
def modificar_stock_insumo(request, insumo_id):
    """Vista para modificar solo el stock de un insumo"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            insumo = get_object_or_404(Insumo, idInventario=insumo_id)
            
            stock_anterior = insumo.stock_actual
            nuevo_stock = int(data.get('stock_actual', 0))
            
            insumo.stock_actual = nuevo_stock
            
            # Actualizar trazabilidad
            insumo.ultimo_movimiento = timezone.now()
            insumo.usuario_ultimo_movimiento = request.user
            
            # Determinar tipo de movimiento
            if nuevo_stock > stock_anterior:
                insumo.tipo_ultimo_movimiento = 'entrada'
                insumo.ultimo_ingreso = timezone.now()
            elif nuevo_stock < stock_anterior:
                insumo.tipo_ultimo_movimiento = 'salida'
            else:
                insumo.tipo_ultimo_movimiento = 'ajuste_manual'
            
            insumo.save()
            
            # Formatear nombre de usuario
            try:
                if hasattr(request.user, 'nombre') and hasattr(request.user, 'apellido'):
                    usuario_nombre = f"{request.user.nombre} {request.user.apellido}".strip()
                    if not usuario_nombre:
                        usuario_nombre = request.user.username
                else:
                    usuario_nombre = request.user.get_full_name() or request.user.username
            except:
                usuario_nombre = request.user.username
            
            # 🕒 CONVERTIR A HORA LOCAL
            from django.utils.timezone import localtime
            ultimo_movimiento_local = localtime(insumo.ultimo_movimiento)
            
            # ✅ OBTENER DISPLAY DEL TIPO DE MOVIMIENTO
            tipo_movimiento_display = dict(Insumo.TIPO_MOVIMIENTO_CHOICES).get(
                insumo.tipo_ultimo_movimiento, 
                insumo.tipo_ultimo_movimiento
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Stock actualizado correctamente',
                'debug': {
                    'stock_anterior': stock_anterior,
                    'stock_nuevo': nuevo_stock,
                    'usuario': usuario_nombre,
                    'usuario_id': request.user.id,
                    'tipo_movimiento': insumo.tipo_ultimo_movimiento,
                    'tipo_movimiento_display': tipo_movimiento_display,  # ⭐ AGREGAR
                    'ultimo_movimiento': ultimo_movimiento_local.strftime('%d/%m/%Y %H:%M'),
                }
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'})

# --- SERVICIOS ---
def servicios(request):
    servicios = Servicio.objects.all()
    return render(request, 'servicios/servicios.html', {'servicios': servicios})

@csrf_exempt
def crear_servicio(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            servicio = Servicio.objects.create(
                nombre=data.get('nombre'),
                categoria=data.get('categoria'),
                precio=data.get('precio', 0),
                duracion=data.get('duracion', 0)
            )
            return JsonResponse({'success': True, 'message': 'Servicio creado'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
def editar_servicio(request, servicio_id):
    servicio = get_object_or_404(Servicio, id=servicio_id)
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            servicio.nombre = data.get('nombre', servicio.nombre)
            servicio.categoria = data.get('categoria', servicio.categoria)
            servicio.precio = data.get('precio', servicio.precio)
            servicio.duracion = data.get('duracion', servicio.duracion)
            servicio.save()
            return JsonResponse({'success': True, 'message': 'Servicio actualizado'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
def eliminar_servicio(request, servicio_id):
    servicio = get_object_or_404(Servicio, id=servicio_id)
    if request.method == 'POST':
        try:
            servicio.delete()
            return JsonResponse({'success': True, 'message': 'Servicio eliminado'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

# --- DASHBOARD ---
def test_view(request):
    return render(request, 'test.html')

def dashboard_pacientes(request):
    return render(request, 'dashboard_pacientes.html')

@require_http_methods(["POST"])
def editar_paciente_ajax(request, paciente_id):
    try:
        paciente = get_object_or_404(Paciente, id=paciente_id)
        
        # Parsear datos del FormData
        data = {}
        for key in request.POST:
            data[key] = request.POST[key]
        
        print(f"DEBUG AJAX - Datos recibidos: {data}")
        
        # Actualizar campos básicos del paciente
        campos_basicos = ['nombre', 'especie', 'raza', 'sexo', 'color', 'microchip', 'observaciones']
        for campo in campos_basicos:
            if campo in data:
                setattr(paciente, campo, data[campo] or '')
        
        # Manejar edad
        tipo_edad = data.get('tipo_edad')
        print(f"DEBUG AJAX - Tipo de edad recibido: {tipo_edad}")
        
        if tipo_edad == 'fecha':
            fecha_nac = data.get('fecha_nacimiento')
            print(f"DEBUG AJAX - Fecha de nacimiento recibida: {fecha_nac}")
            if fecha_nac:
                from datetime import datetime, date
                fecha_obj = datetime.strptime(fecha_nac, '%Y-%m-%d').date()
                
                # Validar que la fecha no sea futura
                if fecha_obj > date.today():
                    return JsonResponse({
                        'success': False,
                        'error': 'La fecha de nacimiento no puede ser futura'
                    }, status=400)
                
                paciente.fecha_nacimiento = fecha_obj
                paciente.edad_anos = None
                paciente.edad_meses = None
                print(f"DEBUG AJAX - Fecha nacimiento guardada: {paciente.fecha_nacimiento}")
        elif tipo_edad == 'estimada':
            paciente.fecha_nacimiento = None
            edad_anos = data.get('edad_anos')
            edad_meses = data.get('edad_meses')
            print(f"DEBUG AJAX - Edad estimada recibida - Años: {edad_anos}, Meses: {edad_meses}")
            paciente.edad_anos = int(edad_anos) if edad_anos and edad_anos.strip() else None
            paciente.edad_meses = int(edad_meses) if edad_meses and edad_meses.strip() else None
            print(f"DEBUG AJAX - Edad estimada guardada - Años: {paciente.edad_anos}, Meses: {paciente.edad_meses}")
        
        # Manejar propietario
        if 'propietario_id' in data and data['propietario_id']:
            propietario = get_object_or_404(Propietario, id=data['propietario_id'])
            paciente.propietario = propietario
            
            # Actualizar datos del propietario
            if 'propietario_nombre_edit' in data:
                propietario.nombre = data['propietario_nombre_edit']
            if 'propietario_apellido_edit' in data:
                propietario.apellido = data['propietario_apellido_edit']
            if 'propietario_telefono' in data:
                propietario.telefono = data['propietario_telefono']
            if 'propietario_email' in data:
                propietario.email = data['propietario_email']
            if 'propietario_direccion' in data:
                propietario.direccion = data['propietario_direccion']
            
            propietario.save()
        elif 'propietario_nombre_edit' in data and data['propietario_nombre_edit']:
            nuevo_propietario = Propietario.objects.create(
                nombre=data.get('propietario_nombre_edit', ''),
                apellido=data.get('propietario_apellido_edit', ''),
                telefono=data.get('propietario_telefono', ''),
                email=data.get('propietario_email', ''),
                direccion=data.get('propietario_direccion', '')
            )
            paciente.propietario = nuevo_propietario
        
        paciente.save()
        
        # Debug final
        print(f"DEBUG AJAX - Paciente guardado:")
        print(f"  - Fecha nacimiento: {paciente.fecha_nacimiento}")
        print(f"  - Edad años: {paciente.edad_anos}")
        print(f"  - Edad meses: {paciente.edad_meses}")
        print(f"  - Edad formateada: {paciente.edad_formateada}")
        
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
        print(f"ERROR AJAX al guardar: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

@login_required
def guardar_edicion_ficha(request, paciente_id):
    if request.method == 'POST':
        try:
            paciente = get_object_or_404(Paciente, id=paciente_id)
            
            # Actualizar datos básicos del paciente
            paciente.nombre = request.POST.get('nombre', paciente.nombre)
            paciente.especie = request.POST.get('especie', paciente.especie)
            paciente.raza = request.POST.get('raza', paciente.raza)
            paciente.sexo = request.POST.get('sexo', paciente.sexo)
            paciente.color = request.POST.get('color', paciente.color)
            paciente.microchip = request.POST.get('microchip', paciente.microchip)
            paciente.observaciones = request.POST.get('observaciones', paciente.observaciones)
            
            # Manejar edad
            tipo_edad = request.POST.get('tipo_edad')
            print(f"DEBUG - Tipo de edad recibido: {tipo_edad}")
            
            if tipo_edad == 'fecha':
                fecha_nac = request.POST.get('fecha_nacimiento')
                print(f"DEBUG - Fecha de nacimiento recibida: {fecha_nac}")
                if fecha_nac:
                    from datetime import datetime, date
                    # Convertir string a objeto date
                    fecha_obj = datetime.strptime(fecha_nac, '%Y-%m-%d').date()
                    
                    # Validar que la fecha no sea futura
                    if fecha_obj > date.today():
                        return JsonResponse({
                            'success': False,
                            'error': 'La fecha de nacimiento no puede ser futura'
                        })
                    
                    paciente.fecha_nacimiento = fecha_obj
                    paciente.edad_anos = None
                    paciente.edad_meses = None
                    print(f"DEBUG - Fecha nacimiento guardada: {paciente.fecha_nacimiento}")
            elif tipo_edad == 'estimada':
                paciente.fecha_nacimiento = None
                edad_anos = request.POST.get('edad_anos')
                edad_meses = request.POST.get('edad_meses')
                print(f"DEBUG - Edad estimada recibida - Años: {edad_anos}, Meses: {edad_meses}")
                paciente.edad_anos = int(edad_anos) if edad_anos and edad_anos.strip() else None
                paciente.edad_meses = int(edad_meses) if edad_meses and edad_meses.strip() else None
                print(f"DEBUG - Edad estimada guardada - Años: {paciente.edad_anos}, Meses: {paciente.edad_meses}")
            
            # Manejar propietario
            propietario_id = request.POST.get('propietario_id')
            propietario_nombre = request.POST.get('propietario_nombre_edit')
            propietario_apellido = request.POST.get('propietario_apellido_edit')
            
            if propietario_id:
                # Actualizar propietario existente
                propietario = get_object_or_404(Propietario, id=propietario_id)
                propietario.nombre = propietario_nombre
                propietario.apellido = propietario_apellido
                propietario.telefono = request.POST.get('propietario_telefono', propietario.telefono)
                propietario.email = request.POST.get('propietario_email', propietario.email)
                propietario.direccion = request.POST.get('propietario_direccion', propietario.direccion)
                propietario.save()
                paciente.propietario = propietario
            elif propietario_nombre and propietario_apellido:
                # Crear nuevo propietario
                nuevo_propietario = Propietario.objects.create(
                    nombre=propietario_nombre,
                    apellido=propietario_apellido,
                    telefono=request.POST.get('propietario_telefono', ''),
                    email=request.POST.get('propietario_email', ''),
                    direccion=request.POST.get('propietario_direccion', '')
                )
                paciente.propietario = nuevo_propietario
            
            paciente.save()
            
            # Debug final
            print(f"DEBUG - Paciente guardado:")
            print(f"  - Fecha nacimiento: {paciente.fecha_nacimiento}")
            print(f"  - Edad años: {paciente.edad_anos}")
            print(f"  - Edad meses: {paciente.edad_meses}")
            print(f"  - Edad formateada: {paciente.edad_formateada}")
            
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
            print(f"ERROR al guardar: {str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@require_http_methods(["GET"])
def api_productos(request):
    """API para obtener lista de productos del inventario"""
    try:
        insumos = Insumo.objects.all()
        
        productos = []
        for insumo in insumos:
            productos.append({
                'id': insumo.idInventario,
                'nombre': insumo.medicamento,
                'stock': insumo.stock_actual,
                'tipo': insumo.tipo or '',
                'precio': float(insumo.precio_venta),
                # AGREGAR ESTOS CAMPOS:
                'dosis_ml': float(insumo.dosis_ml) if insumo.dosis_ml else 0,
                'peso_kg': float(insumo.peso_kg) if insumo.peso_kg else 0
            })
        
        return JsonResponse(productos, safe=False)
    except Exception as e:
        import traceback
        print(f"Error en api_productos: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def detalle_insumo(request, insumo_id):
    """Vista para obtener detalles completos de un insumo (JSON)"""
    try:
        insumo = get_object_or_404(Insumo, idInventario=insumo_id)
        
        # ✅ FORMATEAR USUARIO CORRECTAMENTE
        usuario_nombre = "(sin registro)"
        if insumo.usuario_ultimo_movimiento:
            try:
                if hasattr(insumo.usuario_ultimo_movimiento, 'nombre') and hasattr(insumo.usuario_ultimo_movimiento, 'apellido'):
                    nombre_completo = f"{insumo.usuario_ultimo_movimiento.nombre} {insumo.usuario_ultimo_movimiento.apellido}".strip()
                    usuario_nombre = nombre_completo if nombre_completo else insumo.usuario_ultimo_movimiento.username
                elif hasattr(insumo.usuario_ultimo_movimiento, 'get_full_name'):
                    nombre_completo = insumo.usuario_ultimo_movimiento.get_full_name()
                    usuario_nombre = nombre_completo if nombre_completo.strip() else insumo.usuario_ultimo_movimiento.username
                else:
                    usuario_nombre = insumo.usuario_ultimo_movimiento.username
            except Exception as e:
                print(f"⚠️ Error al formatear usuario: {e}")
                usuario_nombre = str(insumo.usuario_ultimo_movimiento)
        
        # Obtener zona horaria local
        import pytz
        local_tz = pytz.timezone('America/Santiago')
        
        # Convertir fechas a zona horaria local si existen
        fecha_creacion = insumo.fecha_creacion.astimezone(local_tz) if insumo.fecha_creacion else None
        ultimo_ingreso = insumo.ultimo_ingreso.astimezone(local_tz) if insumo.ultimo_ingreso else None
        ultimo_movimiento = insumo.ultimo_movimiento.astimezone(local_tz) if insumo.ultimo_movimiento else None
        
        print(f"🔍 DEBUG detalle_insumo - ID: {insumo_id}")
        print(f"  - Último movimiento BD (UTC): {insumo.ultimo_movimiento}")
        print(f"  - Último movimiento local: {ultimo_movimiento}")
        
        return JsonResponse({
            'success': True,
            'insumo': {
                'idInventario': insumo.idInventario,
                'nombre_comercial': insumo.medicamento,
                'medicamento': insumo.medicamento,
                'sku': insumo.sku or '',
                'tipo': insumo.tipo or '',
                'descripcion': insumo.descripcion or '',
                'especie': insumo.especie or '',
                'precio_venta': float(insumo.precio_venta) if insumo.precio_venta else 0,
                'stock_actual': insumo.stock_actual,
                'dosis_ml': float(insumo.dosis_ml) if insumo.dosis_ml else None,
                'peso_kg': float(insumo.peso_kg) if insumo.peso_kg else None,
                'ml_contenedor': float(insumo.ml_contenedor) if insumo.ml_contenedor else None,
                'precauciones': insumo.precauciones or '',
                'contraindicaciones': insumo.contraindicaciones or '',
                'efectos_adversos': insumo.efectos_adversos or '',
                
                # Campos de trazabilidad formateados
                'fecha_creacion_formatted': fecha_creacion.strftime('%d/%m/%Y %H:%M') if fecha_creacion else '-',
                'ultimo_ingreso_formatted': ultimo_ingreso.strftime('%d/%m/%Y %H:%M') if ultimo_ingreso else '-',
                'ultimo_movimiento_formatted': ultimo_movimiento.strftime('%d/%m/%Y %H:%M') if ultimo_movimiento else '-',
                'tipo_ultimo_movimiento_display': dict(Insumo.TIPO_MOVIMIENTO_CHOICES).get(insumo.tipo_ultimo_movimiento, '-') if insumo.tipo_ultimo_movimiento else '-',
                'usuario_ultimo_movimiento': usuario_nombre,
            }
        })
    except Exception as e:
        import traceback
        print(f"❌ ERROR en detalle_insumo:")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
@login_required
def eliminar_insumo(request, insumo_id):
    """Vista para eliminar un insumo"""
    if request.method == 'POST':
        try:
            insumo = get_object_or_404(Insumo, idInventario=insumo_id)
            nombre_insumo = insumo.medicamento
            insumo.delete()
            
            return JsonResponse({
                'success': True,
                'message': f'Producto "{nombre_insumo}" eliminado correctamente'
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)











