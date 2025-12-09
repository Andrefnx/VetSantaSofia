# caja/views.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal

# Importar desde las apps correctas
from inventario.models import Insumo
from servicios.models import Servicio
from .models import Caja, MovimientoCaja
from .forms import AperturaCajaForm, CierreCajaForm

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
def cashregister(request):
    """Vista principal de la caja registradora"""
    # Verificar si hay una caja abierta
    caja_abierta = Caja.objects.filter(usuario=request.user, fecha_cierre__isnull=True).first()
    
    context = {
        'caja_abierta': caja_abierta,
    }
    
    if caja_abierta:
        # Obtener movimientos de la caja actual
        movimientos = MovimientoCaja.objects.filter(caja=caja_abierta).order_by('-fecha')
        
        # Calcular totales
        total_ingresos = movimientos.filter(tipo='ingreso').aggregate(Sum('monto'))['monto__sum'] or 0
        total_egresos = movimientos.filter(tipo='egreso').aggregate(Sum('monto'))['monto__sum'] or 0
        
        context.update({
            'movimientos': movimientos,
            'total_ingresos': total_ingresos,
            'total_egresos': total_egresos,
            'saldo_actual': caja_abierta.monto_inicial + total_ingresos - total_egresos,
        })
    
    return render(request, 'caja/cash_register.html', context)

@login_required
def apertura_cierre(request):
    """Vista para apertura y cierre de caja"""
    caja_abierta = Caja.objects.filter(usuario=request.user, fecha_cierre__isnull=True).first()
    
    if request.method == 'POST':
        if not caja_abierta:
            # Apertura de caja
            form = AperturaCajaForm(request.POST)
            if form.is_valid():
                caja = form.save(commit=False)
                caja.usuario = request.user
                caja.save()
                return redirect('caja:cashregister')
        else:
            # Cierre de caja
            form = CierreCajaForm(request.POST, instance=caja_abierta)
            if form.is_valid():
                caja = form.save(commit=False)
                caja.fecha_cierre = timezone.now()
                
                # Calcular totales
                movimientos = MovimientoCaja.objects.filter(caja=caja)
                total_ingresos = movimientos.filter(tipo='ingreso').aggregate(Sum('monto'))['monto__sum'] or 0
                total_egresos = movimientos.filter(tipo='egreso').aggregate(Sum('monto'))['monto__sum'] or 0
                caja.monto_final = caja.monto_inicial + total_ingresos - total_egresos
                
                caja.save()
                return redirect('caja:reporte', caja_id=caja.id)
    else:
        if caja_abierta:
            form = CierreCajaForm(instance=caja_abierta)
        else:
            form = AperturaCajaForm()
    
    context = {
        'form': form,
        'caja_abierta': caja_abierta,
    }
    
    return render(request, 'caja/apertura_cierre.html', context)

@csrf_exempt
@login_required
def registrar_movimiento(request):
    """Vista para registrar un movimiento en la caja"""
    if request.method == 'POST':
        try:
            caja_abierta = Caja.objects.filter(usuario=request.user, fecha_cierre__isnull=True).first()
            
            if not caja_abierta:
                return JsonResponse({
                    'success': False,
                    'error': 'No hay una caja abierta'
                }, status=400)
            
            data = json.loads(request.body)
            
            movimiento = MovimientoCaja.objects.create(
                caja=caja_abierta,
                tipo=data.get('tipo'),
                monto=Decimal(data.get('monto')),
                concepto=data.get('concepto', ''),
                metodo_pago=data.get('metodo_pago', 'efectivo'),
                descripcion=data.get('descripcion', '')
            )
            
            return JsonResponse({
                'success': True,
                'movimiento_id': movimiento.id,
                'message': 'Movimiento registrado exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@login_required
def reporte(request, caja_id):
    """Vista para mostrar el reporte de una caja cerrada"""
    caja = get_object_or_404(Caja, id=caja_id, usuario=request.user)
    movimientos = MovimientoCaja.objects.filter(caja=caja).order_by('fecha')
    
    # Calcular totales
    total_ingresos = movimientos.filter(tipo='ingreso').aggregate(Sum('monto'))['monto__sum'] or 0
    total_egresos = movimientos.filter(tipo='egreso').aggregate(Sum('monto'))['monto__sum'] or 0
    
    context = {
        'caja': caja,
        'movimientos': movimientos,
        'total_ingresos': total_ingresos,
        'total_egresos': total_egresos,
        'saldo_final': caja.monto_inicial + total_ingresos - total_egresos,
    }
    
    return render(request, 'caja/reporte.html', context)