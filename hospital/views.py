from django.shortcuts import render

# Dashboard principal
def dashboard_pacientes(request):
    return render(request, 'dashboard_pacientes.html')

# --- CONSULTAS ---
def consulta_view(request):
    return render(request, 'consultas/consulta.html')

# --- HOSPITALIZACIÓN ---
def hospital_view(request):
    return render(request, 'hospitalizacion/hospital.html')

# --- PACIENTES ---
def pacientes_view(request):
    return render(request, 'pacientes/pacientes.html')


def ficha_mascota(request):
    return render(request, 'pacientes/ficha_mascota.html')

# --- VETERINARIOS ---

def vet_view(request):
    return render(request, 'veterinarios/veterinarios.html')
def vet_ficha_view(request):
    dias = range(1, 32)  # Días del 1 al 31
    return render(request, 'veterinarios/vet_ficha.html', {'dias': dias})

# --- INVENTARIO ---

def inventario(request):
    return render(request, 'inventario/inventario.html')

# --- SERVICIOS ---

def servicios(request):
    return render(request, 'inventario/servicios.html')

def test_view(request):
    return render(request, 'inventario/test.html')