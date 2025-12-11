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

def test_view(request):
    """Vista de prueba"""
    return render(request, 'hospital/test.html')











