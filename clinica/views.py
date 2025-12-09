from django.shortcuts import render
from django.contrib.auth.decorators import login_required

# Importar desde las apps correctas
from pacientes.models import Paciente, Propietario
from inventario.models import Insumo
from servicios.models import Servicio

@login_required
def consulta_view(request):
    """Vista para el módulo de consultas"""
    return render(request, 'clinica/consultas.html')

@login_required
def vet_view(request):
    """Vista para listar veterinarios"""
    return render(request, 'veterinarios/veterinarios.html')

@login_required
def vet_ficha_view(request):
    """Vista para la ficha del veterinario"""
    return render(request, 'veterinarios/vet_ficha.html')

@login_required
def vet_disponibilidad_view(request):
    """Vista para gestionar disponibilidad de veterinarios"""
    return render(request, 'veterinarios/vet_disponibilidad.html')
