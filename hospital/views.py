from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from .models import Insumo, Servicio, Paciente
from django.views.decorators.csrf import csrf_exempt
import json
from django.contrib.auth.decorators import login_required

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
    pacientes = Paciente.objects.select_related('propietario').all().order_by('-fecha_registro')
    
    context = {
        'pacientes': pacientes,
    }
    
    return render(request, 'pacientes/pacientes.html', context)

def ficha_mascota_view(request):
    return render(request, 'pacientes/ficha_mascota.html')

# --- VETERINARIOS ---
def vet_ficha_view(request):
    return render(request, 'veterinarios/vet_ficha.html')

def vet_disponibilidad_view(request):
    return render(request, 'veterinarios/vet_disponibilidad.html')

def vet_view(request):
    return render(request, 'veterinarios/veterinarios.html')

# --- INVENTARIO ---





def test_view(request):
    return render(request, 'test.html')

def dashboard_pacientes(request):
    return render(request, 'dashboard_pacientes.html')



# ---------------------------
#   SERVICIOS VETERINARIOS
# ---------------------------

def servicios(request):
    servicios = Servicio.objects.all()
    return render(request, 'inventario/servicios.html', {
        'servicios': servicios,
    })


# ---------------------------
#   CREAR SERVICIO
# ---------------------------
@csrf_exempt
def crear_servicio(request):
    if request.method == "POST":
        data = json.loads(request.body)

        servicio = Servicio.objects.create(
            nombre=data.get("nombre", ""),
            descripcion=data.get("descripcion", ""),
            categoria=data.get("categoria", ""),
            precio=int(float(data.get("precio", 0) or 0)),
            duracion=int(float(data.get("duracion", 0) or 0)),
        )

        return JsonResponse({"success": True, "id": servicio.idServicio})


# ---------------------------
#   EDITAR SERVICIO
# ---------------------------
@csrf_exempt
def editar_servicio(request, servicio_id):
    servicio = get_object_or_404(Servicio, idServicio=servicio_id)

    if request.method == "POST":
        data = json.loads(request.body)

        servicio.nombre = data.get("nombre", servicio.nombre)
        servicio.descripcion = data.get("descripcion", servicio.descripcion)
        servicio.categoria = data.get("categoria", servicio.categoria)

        precio = data.get("precio")
        duracion = data.get("duracion")

        try:
            servicio.precio = int(float(precio)) if precio not in ["", None] else 0
        except:
            servicio.precio = 0

        try:
            servicio.duracion = int(float(duracion)) if duracion not in ["", None] else 0
        except:
            servicio.duracion = 0

        servicio.save()

        return JsonResponse({"success": True})


# ---------------------------
#   ELIMINAR SERVICIO
# ---------------------------
@csrf_exempt
def eliminar_servicio(request, servicio_id):
    servicio = get_object_or_404(Servicio, idServicio=servicio_id)

    if request.method == "POST":
        servicio.delete()
        return JsonResponse({"success": True})




# ---------------------------
#   INVENTARIO VETERINARIO
# ---------------------------

def ver_insumos(request):
    insumos = Insumo.objects.all()
    return render(request, 'ver_insumos.html', {'insumos': insumos})

def agregar_insumo(request):
    if request.method == 'POST':
        medicamento = request.POST.get('medicamento')
        dosis = request.POST.get('dosis')
        valor_unitario = request.POST.get('valor_unitario')
        cantidad = request.POST.get('cantidad')
        Insumo.objects.create(
            medicamento=medicamento,
            dosis=dosis,
            valor_unitario=valor_unitario,
            cantidad=cantidad
        )
        return redirect('ver_insumos')
    return render(request, 'agregar_insumo.html')

def inventario(request):
    insumos = Insumo.objects.all()
    return render(request, 'inventario/inventario.html', {'insumos': insumos})

@csrf_exempt
def crear_insumo(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        # Mapeo para que medicamento = nombre_comercial
        data['medicamento'] = data.get('nombre_comercial', '')
        numeric_fields = [
            'precio_venta', 'margen', 'stock_actual',
            'stock_minimo', 'stock_maximo', 'dosis_ml', 'peso_kg'
        ]
        insumo_kwargs = {}
        for field in [
            'medicamento', 'categoria', 'sku', 'codigo_barra', 'presentacion',
            'especie', 'descripcion', 'unidad_medida', 'precio_venta',
            'margen', 'stock_actual', 'stock_minimo', 'stock_maximo',
            'almacenamiento', 'precauciones', 'contraindicaciones',
            'efectos_adversos', 'dosis_ml', 'peso_kg'
        ]:
            value = data.get(field)
            if field in numeric_fields:
                if value in ("", None):
                    value = 0
                else:
                    try:
                        value = float(value)
                        if field.startswith('stock'):
                            value = int(value)
                    except Exception:
                        value = 0
            insumo_kwargs[field] = value
        insumo = Insumo.objects.create(**insumo_kwargs)
        return JsonResponse({'success': True, 'id': insumo.idInventario})

@csrf_exempt
def editar_insumo(request, insumo_id):
    if request.method == "POST":
        insumo = get_object_or_404(Insumo, idInventario=insumo_id)
        data = json.loads(request.body)
        # Mapeo para que medicamento = nombre_comercial
        if 'nombre_comercial' in data:
            data['medicamento'] = data['nombre_comercial']

        numeric_fields = [
            'precio_venta', 'margen', 'stock_actual',
            'stock_minimo', 'stock_maximo', 'dosis_ml', 'peso_kg'
        ]

        for field, value in data.items():
            if hasattr(insumo, field):
                if field in numeric_fields:
                    if value in ("", None):
                        value = 0
                    else:
                        try:
                            value = float(value)
                            if field.startswith('stock'):
                                value = int(value)
                        except Exception:
                            value = 0
                setattr(insumo, field, value)
        insumo.save()
        return JsonResponse({"success": True})

@csrf_exempt
def eliminar_insumo(request, insumo_id):
    insumo = get_object_or_404(Insumo, idInventario=insumo_id)
    if request.method == 'POST':
        insumo.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
def modificar_stock(request, insumo_id):
    if request.method == "POST":
        insumo = get_object_or_404(Insumo, idInventario=insumo_id)
        data = json.loads(request.body)
        nuevo_stock = data.get("stock_actual")
        if nuevo_stock is not None:
            insumo.stock_actual = int(nuevo_stock)
            insumo.save()
            return JsonResponse({"success": True})
        return JsonResponse({"success": False, "error": "No se envió stock_actual"}, status=400)
    return JsonResponse({"success": False, "error": "Método no permitido"}, status=405)











