from django.shortcuts import render
from django.http import HttpResponse
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from inventario.models import Insumo
from caja.models import Venta, DetalleVenta
from clinica.models import Consulta, Hospitalizacion
from openpyxl import Workbook
from openpyxl.utils import get_column_letter
from datetime import datetime


def validar_fecha(fecha_str):
    """Valida que una cadena sea una fecha válida en formato YYYY-MM-DD"""
    if not fecha_str or not fecha_str.strip():
        return ''
    try:
        datetime.strptime(fecha_str.strip(), '%Y-%m-%d')
        return fecha_str.strip()
    except ValueError:
        return ''


@login_required
def index(request):
    return render(request, 'reportes/index.html')


@login_required
def reporte_inventario(request):
    from django.db.models import Count, Q
    
    # Query base
    insumos = Insumo.objects.all()
    
    # Filtro de marca
    marca = request.GET.get('marca', '').strip()
    if marca:
        insumos = insumos.filter(marca=marca)
    
    # Filtro de estado
    estado = request.GET.get('estado', '').strip()
    if estado == 'activo':
        insumos = insumos.filter(archivado=False)
    elif estado == 'archivado':
        insumos = insumos.filter(archivado=True)
    
    # Filtros de stock
    stock_min = request.GET.get('stock_min', '').strip()
    if stock_min:
        try:
            insumos = insumos.filter(stock_actual__gte=int(stock_min))
        except (ValueError, TypeError):
            pass
    
    stock_max = request.GET.get('stock_max', '').strip()
    if stock_max:
        try:
            insumos = insumos.filter(stock_actual__lte=int(stock_max))
        except (ValueError, TypeError):
            pass
    
    # Filtros de precio
    precio_min = request.GET.get('precio_min', '').strip()
    if precio_min:
        try:
            insumos = insumos.filter(precio_venta__gte=float(precio_min))
        except (ValueError, TypeError):
            pass
    
    precio_max = request.GET.get('precio_max', '').strip()
    if precio_max:
        try:
            insumos = insumos.filter(precio_venta__lte=float(precio_max))
        except (ValueError, TypeError):
            pass
    
    # Filtros avanzados basados en ventas
    vendidos = request.GET.get('vendidos', '').strip()
    en_consultas = request.GET.get('en_consultas', '').strip()
    en_hospitalizaciones = request.GET.get('en_hospitalizaciones', '').strip()
    fecha_desde = validar_fecha(request.GET.get('fecha_desde', ''))
    fecha_hasta = validar_fecha(request.GET.get('fecha_hasta', ''))
    
    # Filtros de uso en consultas - LÓGICA SIMPLE
    if en_consultas == 'si':
        # Mostrar SOLO los que fueron usados en consultas
        ids_usados = list(DetalleVenta.objects.filter(
            tipo='insumo',
            venta__tipo_origen='consulta',
            insumo_id__isnull=False
        ).values_list('insumo_id', flat=True).distinct())
        insumos = insumos.filter(id__in=ids_usados) if ids_usados else insumos.none()
    elif en_consultas == 'no':
        # Excluir los que fueron usados en consultas
        ids_usados = list(DetalleVenta.objects.filter(
            tipo='insumo',
            venta__tipo_origen='consulta',
            insumo_id__isnull=False
        ).values_list('insumo_id', flat=True).distinct())
        if ids_usados:
            insumos = insumos.exclude(id__in=ids_usados)
    
    # Filtros de uso en hospitalizaciones - LÓGICA SIMPLE
    if en_hospitalizaciones == 'si':
        # Mostrar SOLO los que fueron usados en hospitalizaciones
        ids_usados = list(DetalleVenta.objects.filter(
            tipo='insumo',
            venta__tipo_origen='hospitalizacion',
            insumo_id__isnull=False
        ).values_list('insumo_id', flat=True).distinct())
        insumos = insumos.filter(id__in=ids_usados) if ids_usados else insumos.none()
    elif en_hospitalizaciones == 'no':
        # Excluir los que fueron usados en hospitalizaciones
        ids_usados = list(DetalleVenta.objects.filter(
            tipo='insumo',
            venta__tipo_origen='hospitalizacion',
            insumo_id__isnull=False
        ).values_list('insumo_id', flat=True).distinct())
        if ids_usados:
            insumos = insumos.exclude(id__in=ids_usados)
    
    # Construir filtro para anotación de veces vendido
    filtro_count = Q()
    if fecha_desde:
        filtro_count &= Q(detalleventa__venta__fecha_creacion__date__gte=fecha_desde)
    if fecha_hasta:
        filtro_count &= Q(detalleventa__venta__fecha_creacion__date__lte=fecha_hasta)
    
    # Anotar veces vendido
    insumos = insumos.annotate(veces_vendido=Count('detalleventa', filter=filtro_count)).order_by('medicamento')
    
    # Aplicar filtro vendidos DESPUÉS de la anotación
    if vendidos == 'si':
        insumos = insumos.filter(veces_vendido__gt=0)
    elif vendidos == 'no':
        insumos = insumos.filter(veces_vendido=0)
    
    # Obtener marcas únicas para el filtro
    marcas = Insumo.objects.exclude(marca__isnull=True).exclude(marca='').values_list('marca', flat=True).distinct().order_by('marca')
    
    context = {
        'insumos': insumos,
        'marcas': marcas,
        'url_exportar': reverse('reportes:exportar_inventario_excel')
    }
    return render(request, 'reportes/inventario.html', context)


@login_required
def exportar_inventario_excel(request):
    from django.db.models import Count, Q
    
    # Aplicar los mismos filtros que en la vista
    insumos = Insumo.objects.all()
    
    # Filtro de marca
    marca = request.GET.get('marca', '').strip()
    if marca:
        insumos = insumos.filter(marca=marca)
    
    # Filtro de estado
    estado = request.GET.get('estado', '').strip()
    if estado == 'activo':
        insumos = insumos.filter(archivado=False)
    elif estado == 'archivado':
        insumos = insumos.filter(archivado=True)
    
    # Filtros de stock
    stock_min = request.GET.get('stock_min', '').strip()
    if stock_min:
        try:
            insumos = insumos.filter(stock_actual__gte=int(stock_min))
        except (ValueError, TypeError):
            pass
    
    stock_max = request.GET.get('stock_max', '').strip()
    if stock_max:
        try:
            insumos = insumos.filter(stock_actual__lte=int(stock_max))
        except (ValueError, TypeError):
            pass
    
    # Filtros de precio
    precio_min = request.GET.get('precio_min', '').strip()
    if precio_min:
        try:
            insumos = insumos.filter(precio_venta__gte=float(precio_min))
        except (ValueError, TypeError):
            pass
    
    precio_max = request.GET.get('precio_max', '').strip()
    if precio_max:
        try:
            insumos = insumos.filter(precio_venta__lte=float(precio_max))
        except (ValueError, TypeError):
            pass
    
    # Filtros avanzados basados en ventas
    vendidos = request.GET.get('vendidos', '').strip()
    en_consultas = request.GET.get('en_consultas', '').strip()
    en_hospitalizaciones = request.GET.get('en_hospitalizaciones', '').strip()
    fecha_desde = validar_fecha(request.GET.get('fecha_desde', ''))
    fecha_hasta = validar_fecha(request.GET.get('fecha_hasta', ''))
    
    # Filtros de uso en consultas - LÓGICA SIMPLE
    if en_consultas == 'si':
        # Mostrar SOLO los que fueron usados en consultas
        ids_usados = list(DetalleVenta.objects.filter(
            tipo='insumo',
            venta__tipo_origen='consulta',
            insumo_id__isnull=False
        ).values_list('insumo_id', flat=True).distinct())
        insumos = insumos.filter(id__in=ids_usados) if ids_usados else insumos.none()
    elif en_consultas == 'no':
        # Excluir los que fueron usados en consultas
        ids_usados = list(DetalleVenta.objects.filter(
            tipo='insumo',
            venta__tipo_origen='consulta',
            insumo_id__isnull=False
        ).values_list('insumo_id', flat=True).distinct())
        if ids_usados:
            insumos = insumos.exclude(id__in=ids_usados)
    
    # Filtros de uso en hospitalizaciones - LÓGICA SIMPLE
    if en_hospitalizaciones == 'si':
        # Mostrar SOLO los que fueron usados en hospitalizaciones
        ids_usados = list(DetalleVenta.objects.filter(
            tipo='insumo',
            venta__tipo_origen='hospitalizacion',
            insumo_id__isnull=False
        ).values_list('insumo_id', flat=True).distinct())
        insumos = insumos.filter(id__in=ids_usados) if ids_usados else insumos.none()
    elif en_hospitalizaciones == 'no':
        # Excluir los que fueron usados en hospitalizaciones
        ids_usados = list(DetalleVenta.objects.filter(
            tipo='insumo',
            venta__tipo_origen='hospitalizacion',
            insumo_id__isnull=False
        ).values_list('insumo_id', flat=True).distinct())
        if ids_usados:
            insumos = insumos.exclude(id__in=ids_usados)
    
    # Construir filtro para anotación de veces vendido
    filtro_count = Q()
    if fecha_desde:
        filtro_count &= Q(detalleventa__venta__fecha_creacion__date__gte=fecha_desde)
    if fecha_hasta:
        filtro_count &= Q(detalleventa__venta__fecha_creacion__date__lte=fecha_hasta)
    
    # Anotar veces vendido
    insumos = insumos.annotate(veces_vendido=Count('detalleventa', filter=filtro_count)).order_by('medicamento')
    
    # Aplicar filtro vendidos DESPUÉS de la anotación
    if vendidos == 'si':
        insumos = insumos.filter(veces_vendido__gt=0)
    elif vendidos == 'no':
        insumos = insumos.filter(veces_vendido=0)
    
    # Crear workbook y hoja
    wb = Workbook()
    ws = wb.active
    ws.title = "Inventario"
    
    # Encabezados
    headers = ['Medicamento', 'Marca', 'Stock Actual', 'Precio Venta', 'Veces Vendido', 'Estado']
    ws.append(headers)
    
    # Agregar datos
    for insumo in insumos:
        estado = 'Archivado' if insumo.archivado else 'Activo'
        marca = insumo.marca if insumo.marca else '-'
        precio = float(insumo.precio_venta) if insumo.precio_venta else 0.0
        
        ws.append([
            insumo.medicamento,
            marca,
            float(insumo.stock_actual),
            precio,
            insumo.veces_vendido,
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
    ventas = Venta.objects.select_related(
        'usuario_cobro', 'usuario_creacion', 'paciente'
    ).order_by('-fecha_creacion')
    context = {
        'ventas': ventas,
        'url_exportar': reverse('reportes:exportar_caja_excel')
    }
    return render(request, 'reportes/caja.html', context)


@login_required
def exportar_caja_excel(request):
    # Crear workbook y hoja
    wb = Workbook()
    ws = wb.active
    ws.title = "Caja"
    
    # Encabezados
    headers = ['Fecha', 'Número Venta', 'Total', 'Estado', 'Usuario']
    ws.append(headers)
    
    # Obtener datos
    ventas = Venta.objects.select_related(
        'usuario_cobro', 'usuario_creacion', 'paciente'
    ).order_by('-fecha_creacion')
    
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
    consultas = Consulta.objects.select_related(
        'paciente', 'veterinario'
    ).prefetch_related('servicios').order_by('-fecha')
    context = {
        'consultas': consultas,
        'url_exportar': reverse('reportes:exportar_clinica_excel')
    }
    return render(request, 'reportes/clinica.html', context)


@login_required
def exportar_clinica_excel(request):
    # Crear workbook y hoja
    wb = Workbook()
    ws = wb.active
    ws.title = "Clínica"
    
    # Encabezados
    headers = ['Fecha', 'Paciente', 'Tipo de Atención', 'Servicios', 'Veterinario']
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
        'hospitalizaciones': hospitalizaciones,
        'url_exportar': reverse('reportes:exportar_hospitalizacion_excel')
    }
    return render(request, 'reportes/hospitalizacion.html', context)


@login_required
def exportar_hospitalizacion_excel(request):
    # Crear workbook y hoja
    wb = Workbook()
    ws = wb.active
    ws.title = "Hospitalización"
    
    # Encabezados
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
    servicios_vendidos = DetalleVenta.objects.filter(
        tipo='servicio'
    ).select_related(
        'venta', 'venta__usuario_cobro', 'venta__usuario_creacion', 'servicio'
    ).order_by('-venta__fecha_creacion')
    
    context = {
        'servicios_vendidos': servicios_vendidos,
        'url_exportar': reverse('reportes:exportar_servicios_excel')
    }
    return render(request, 'reportes/servicios.html', context)


@login_required
def exportar_servicios_excel(request):
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
    ).select_related(
        'venta', 'venta__usuario_cobro', 'venta__usuario_creacion'
    ).order_by('-venta__fecha_creacion')
    
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
