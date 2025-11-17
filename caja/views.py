# caja/views.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

# IMPORTA LOS MODELOS
from hospital.models import Insumo, Servicio


@login_required
def caja(request):
    # Traer todos los productos del inventario
    productos = Insumo.objects.all()

    # Traer todos los servicios veterinarios
    servicios = Servicio.objects.all()

    return render(request, 'cash_register.html', {
        'productos': productos,
        'servicios': servicios,
    })

def procesar_venta(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        items = data.get('items', [])
        try:
            for item in items:
                nombre = item['name']
                cantidad = int(item['quantity'])
                # Busca el producto por nombre
                producto = Insumo.objects.get(medicamento=nombre)
                if producto.stock_actual >= cantidad:
                    producto.stock_actual -= cantidad
                    producto.save()
                else:
                    return JsonResponse({'success': False, 'error': f'Stock insuficiente para {nombre}'})
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Método no permitido'})

@csrf_exempt
def procesar_venta(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        items = data.get('items', [])
        try:
            for item in items:
                nombre = item['name']
                cantidad = int(item['quantity'])
                # Busca el producto por nombre
                producto = Insumo.objects.get(medicamento=nombre)
                if producto.stock_actual >= cantidad:
                    producto.stock_actual -= cantidad
                    producto.save()
                else:
                    return JsonResponse({'success': False, 'error': f'Stock insuficiente para {nombre}'})
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Método no permitido'})

@login_required
def reporte(request):
    return render(request, 'reporte.html')