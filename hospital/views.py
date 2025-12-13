from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.urls import reverse
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
    """Redirige a la vista de pacientes del sistema actual"""
    return redirect('pacientes:pacientes')

@login_required
def detalle(request, hosp_id):
    """Redirige a la ficha del paciente con la pestaña de hospital"""
    try:
        hospitalizacion = Hospitalizacion.objects.get(id=hosp_id)
        # Redirigir a la ficha clínica del paciente con la pestaña de hospital
        url = reverse('pacientes:ficha_mascota', args=[hospitalizacion.idMascota.id])
        return redirect(f'{url}?tab=hospital&hosp_id={hosp_id}#hospital')
    except Hospitalizacion.DoesNotExist:
        return redirect('pacientes:pacientes')

def test_view(request):
    """Vista de prueba"""
    return render(request, 'hospital/test.html')











