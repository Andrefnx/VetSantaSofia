from django.shortcuts import render
from django.http import HttpResponse
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from inventario.models import Insumo
from caja.models import Venta, DetalleVenta
from clinica.models import Consulta, Hospitalizacion
from openpyxl import Workbook
from openpyxl.utils import get_column_letter


@login_required
def index(request):
    return render(request, 'reportes/index.html')


@login_required
def reporte_inventario(request):
    insumos = Insumo.objects.all().order_by('medicamento')
    context = {
        'insumos': insumos,
        'url_exportar': reverse('reportes:exportar_inventario_excel')
    }
    return render(request, 'reportes/inventario.html', context)


@login_required
def exportar_inventario_excel(request):
    # Crear workbook y hoja
    wb = Workbook()
    ws = wb.active
    ws.title = "Inventario"
    
    # Encabezados
    headers = ['Medicamento', 'Marca', 'Stock Actual', 'Precio Venta', 'Estado']
    ws.append(headers)
    
    # Obtener datos
    insumos = Insumo.objects.all().order_by('medicamento')
    
    # Agregar datos
    for insumo in insumos:
        estado = 'Archivado' if insumo.archivado else 'Activo'
        marca = insumo.marca if insumo.marca else '-'
        precio = float(insumo.precio_venta) if insumo.precio_venta else 0.0
        
        ws.append([
            insumo.medicamento,
            marca,
            insumo.stock_actual,
            precio,
            estado
        ])
    
    # Ajustar ancho de columnas
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 20
    
    # Preparar respuesta HTTP
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=reporte_inventario.xlsx'
    
    # Guardar workbook en response
    wb.save(response)
    
    return response

@login_required

def reporte_caja(request):
    from django.urls import reverse
    context = {
        'ventas': ventas,
        'url_exportar': reverse('reportes:exportar_caja_excel')
    }
    return render(request, 'reportes/caja.html', context)

@login_required

def exportar_caja_excel(request):
    from caja.models import Venta
    
    ws = wb.active
    ws.title = "Caja"
    
    # Encabezados
    headers = ['Fecha', 'N\u00famero Venta', 'Total', 'Estado', 'Usuario']
    ws.append(headers)
    
    # Obtener datos
    ventas = Venta.objects.select_related('usuario_cobro').order_by('-fecha_creacion')
    
    # Agregar datos
    for venta in ventas:
        fecha = venta.fecha_creacion.strftime('%d/%m/%Y %H:%M') if venta.fecha_creacion else '-'
        usuario = venta.usuario_cobro.get_full_name() if venta.usuario_cobro else venta.usuario_creacion.get_full_name()
        total = float(venta.total) if venta.total else 0.0
        estado = venta.get_estado_display()
        
        ws.append([
            fecha,
            venta.numero_venta,
            total,
            estado,
            usuario
        ])
    
    # Ajustar ancho de columnas
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 20
    
    # Preparar respuesta HTTP
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=reporte_caja.xlsx'
    
    # Guardar workbook en response
    wb.save(response)
    
    return response
@login_required


def reporte_clinica(request):
    from clinica.models import Consulta
    consultas = Consulta.objects.select_related(
        'paciente', 'veterinario'
    ).prefetch_related('servicios').order_by('-fecha')
    context = {
        'consultas': consultas
    }
    return render(request, 'reportes/clinica.html', context)
@login_required


def exportar_clinica_excel(request):
    from clinica.models import Consulta
    
    # Crear workbook y hoja
    wb = Workbook()
    ws = wb.active
    # Encabezados
    headers = ['Fecha', 'Paciente', 'Tipo de Atenci\u00f3n', 'Servicios', 'Veterinario']
    ws.append(headers)
    
    # Obtener datos
    consultas = Consulta.objects.select_related(
        'paciente', 'veterinario'
    ).prefetch_related('servicios').order_by('-fecha')
    
    # Agregar datos
    for consulta in consultas:
        fecha = consulta.fecha.strftime('%d/%m/%Y %H:%M') if consulta.fecha else '-'
        paciente = consulta.paciente.nombre if consulta.paciente else '-'
        tipo_atencion = consulta.get_tipo_consulta_display()
        servicios = consulta.servicios_nombres()
        veterinario = consulta.veterinario.get_full_name() if consulta.veterinario else '-'
        
        ws.append([
            fecha,
            paciente,
            tipo_atencion,
            servicios,
            veterinario
        ])
    
    # Ajustar ancho de columnas
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 25
    
    # Preparar respuesta HTTP
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=reporte_clinica.xlsx'
    
    # Guardar workbook en response
    wb.save(response)
    
    return response


@login_required
def reporte_hospitalizacion(request):
    hospitalizaciones = Hospitalizacion.objects.select_related(
        'paciente', 'veterinario'
    ).order_by('-fecha_ingreso')
    
    context = {
        'hospitalizaciones': hospitalizaciones
    }
    return render(request, 'reportes/hospitalizacion.html', context)


@login_required
def exportar_hospitalizacion_excel(request):
    
    # Crear workbook y hoja
    wb = Workbook()
    ws = wb.active
    ws.title = "Hospitalizaci\u00f3n"
    headers = ['Fecha Ingreso', 'Fecha Alta', 'Paciente', 'Motivo', 'Estado', 'Veterinario']
    ws.append(headers)
    
    # Obtener datos
    hospitalizaciones = Hospitalizacion.objects.select_related(
        'paciente', 'veterinario'
    ).order_by('-fecha_ingreso')
    
    # Agregar datos
    for hosp in hospitalizaciones:
        fecha_ingreso = hosp.fecha_ingreso.strftime('%d/%m/%Y %H:%M') if hosp.fecha_ingreso else '-'
        fecha_alta = hosp.fecha_alta.strftime('%d/%m/%Y %H:%M') if hosp.fecha_alta else 'En curso'
        paciente = hosp.paciente.nombre if hosp.paciente else '-'
        motivo = hosp.motivo if hosp.motivo else '-'
        estado = hosp.get_estado_display()
        veterinario = hosp.veterinario.get_full_name() if hosp.veterinario else '-'
        
        ws.append([
            fecha_ingreso,
            fecha_alta,
            paciente,
            motivo,
            estado,
            veterinario
        ])
    
    # Ajustar ancho de columnas
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 25
    
    # Preparar respuesta HTTP
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=reporte_hospitalizacion.xlsx'
    
    # Guardar workbook en response
    wb.save(response)
    
    return response


@login_required
def reporte_servicios(request):
    from caja.models import DetalleVenta
    servicios_vendidos = DetalleVenta.objects.filter(
        tipo='servicio'
    ).select_related('venta', 'venta__usuario_cobro', 'servicio').order_by('-venta__fecha_creacion')
    
    context = {
        'servicios_vendidos': servicios_vendidos
    }
    return render(request, 'reportes/servicios.html', context)


@login_required
def exportar_servicios_excel(request):
    from caja.models import DetalleVenta
    
    # Crear workbook y hoja
    wb = Workbook()
    ws = wb.active
    ws.title = "Servicios"
    
    # Encabezados
    headers = ['Fecha', 'Servicio', 'Precio', 'Estado', 'Usuario', 'Número Venta']
    ws.append(headers)
    
    # Obtener datos
    servicios_vendidos = DetalleVenta.objects.filter(
        tipo='servicio'
    ).select_related('venta', 'venta__usuario_cobro').order_by('-venta__fecha_creacion')
    
    # Agregar datos
    for detalle in servicios_vendidos:
        fecha = detalle.venta.fecha_creacion.strftime('%d/%m/%Y %H:%M') if detalle.venta.fecha_creacion else '-'
        usuario = detalle.venta.usuario_cobro.get_full_name() if detalle.venta.usuario_cobro else detalle.venta.usuario_creacion.get_full_name()
        precio = float(detalle.precio_unitario) if detalle.precio_unitario else 0.0
        estado = detalle.venta.get_estado_display()
        
        ws.append([
            fecha,
            detalle.descripcion,
            precio,
            estado,
            usuario,
            detalle.venta.numero_venta
        ])
    
    # Ajustar ancho de columnas
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 20
    
    # Preparar respuesta HTTP
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=reporte_servicios.xlsx'
    
    # Guardar workbook en response
    wb.save(response)
    
    return response
