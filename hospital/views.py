from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from .models import Insumo
from django.views.decorators.csrf import csrf_exempt
import json

def pacientes(request):
    return render(request, 'pacientes/pacientes.html')



# --- CONSULTAS ---
def consulta_view(request):
    return render(request, 'consultas/consulta.html')

# --- HOSPITALIZACIÓN ---
def hospital_view(request):
    return render(request, 'hospitalizacion/hospital.html')

# --- PACIENTES ---
def ficha_mascota_view(request):
    return render(request, 'pacientes/ficha_mascota.html')

# --- VETERINARIOS ---
def vet_ficha_view(request):
    return render(request, 'veterinarios/vet_ficha.html')

def vet_disponibilidad_view(request):
    return render(request, 'veterinarios/vet_disponibilidad.html')

def vet_view(request):
    return render(request, 'veterinarios/veterinarios.html')

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

def eliminar_insumo(request, insumo_id):
    if request.method == 'POST':
        Insumo.objects.filter(idIns=insumo_id).delete()
    return redirect('ver_insumos')

def editar_insumo(request, insumo_id):
    insumo_obj = get_object_or_404(Insumo, idIns=insumo_id)
    if request.method == 'POST':
        insumo_obj.medicamento = request.POST.get('medicamento')
        insumo_obj.dosis = request.POST.get('dosis')
        insumo_obj.valor_unitario = request.POST.get('valor_unitario')
        insumo_obj.cantidad = request.POST.get('cantidad')
        insumo_obj.save()
        return redirect('ver_insumos')
    return render(request, 'editar_insumo.html', {'insumo': insumo_obj})

def inventario(request):
    insumos = Insumo.objects.all()
    return render(request, 'inventario/inventario.html', {
        'insumos': insumos,
    })
@csrf_exempt
def crear_insumo(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        numeric_fields = [
            'precio_venta', 'margen', 'stock_actual',
            'stock_minimo', 'stock_maximo'
        ]

        insumo_kwargs = {}
        for field in [
            'medicamento', 'categoria', 'sku', 'codigo_barra', 'presentacion',
            'especie', 'descripcion', 'unidad_medida', 'precio_venta',
            'margen', 'stock_actual', 'stock_minimo', 'stock_maximo',
            'almacenamiento', 'precauciones', 'contraindicaciones',
            'efectos_adversos'
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
    insumo = get_object_or_404(Insumo, idInventario=insumo_id)
    if request.method == 'POST':
        data = json.loads(request.body)

        numeric_fields = [
            'precio_venta', 'margen', 'stock_actual',
            'stock_minimo', 'stock_maximo'
        ]

        for field in [
            'medicamento', 'categoria', 'sku', 'codigo_barra', 'presentacion',
            'especie', 'descripcion', 'unidad_medida', 'precio_venta',
            'margen', 'stock_actual', 'stock_minimo', 'stock_maximo',
            'almacenamiento', 'precauciones', 'contraindicaciones',
            'efectos_adversos'
        ]:
            value = data.get(field)
            if field in numeric_fields:
                try:
                    if value in ("", None):
                        value = 0
                    else:
                        value = float(value)
                        if field.startswith('stock'):
                            value = int(value)
                except:
                    value = 0

            if value is not None:
                setattr(insumo, field, value)

        insumo.save()
        return JsonResponse({'success': True})

@csrf_exempt
def eliminar_insumo(request, insumo_id):
    insumo = get_object_or_404(Insumo, idInventario=insumo_id)
    if request.method == 'POST':
        insumo.delete()
        return JsonResponse({'success': True})

@csrf_exempt
def modificar_stock(request, insumo_id):
    insumo = get_object_or_404(Insumo, idInventario=insumo_id)
    if request.method == 'POST':
        data = json.loads(request.body)
        insumo.stock_actual = data.get('stock_actual', insumo.stock_actual)
        insumo.save()
        return JsonResponse({'success': True})

def servicios(request):
    return render(request, 'inventario/servicios.html')

def test_view(request):
    return render(request, 'test.html')

def dashboard_pacientes(request):
    return render(request, 'dashboard_pacientes.html')