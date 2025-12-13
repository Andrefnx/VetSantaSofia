from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import Hospitalizacion

@login_required
def dashboard_pacientes(request):
    """Vista del dashboard de pacientes"""
    from pacientes.models import Paciente
    # Obtener estadísticas
    total_pacientes = Paciente.objects.filter(activo=True).count()
    pacientes_hospitalizados = Hospitalizacion.objects.filter(estado_hosp='ingresado').count()
    
    context = {
        'total_pacientes': total_pacientes,
        'pacientes_hospitalizados': pacientes_hospitalizados,
    }
    return render(request, 'hospital/dashboard_pacientes.html', context)

@login_required
def hospitalizaciones(request):
    """Vista de lista de hospitalizaciones activas"""
    hospitalizaciones_activas = Hospitalizacion.objects.filter(
        estado_hosp='ingresado'
    ).select_related('paciente').order_by('-fecha_ingreso')
    
    context = {
        'hospitalizaciones': hospitalizaciones_activas,
    }
    return render(request, 'hospital/hospitalizaciones.html', context)

@login_required
def detalle(request, hosp_id):
    """Vista de detalle de una hospitalización"""
    hospitalizacion = Hospitalizacion.objects.select_related('paciente').get(id=hosp_id)
    
    context = {
        'hospitalizacion': hospitalizacion,
    }
    return render(request, 'hospital/detalle_hospitalizacion.html', context)

def test_view(request):
    """Vista de prueba"""
    return render(request, 'hospital/test.html')











