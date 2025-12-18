from django.shortcuts import render


def index(request):
    return render(request, 'reportes/index.html')


def reporte_inventario(request):
    return render(request, 'reportes/inventario.html')


def reporte_caja(request):
    return render(request, 'reportes/caja.html')


def reporte_clinica(request):
    return render(request, 'reportes/clinica.html')


def reporte_hospitalizacion(request):
    return render(request, 'reportes/hospitalizacion.html')


def reporte_servicios(request):
    return render(request, 'reportes/servicios.html')
