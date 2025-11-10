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
def ficha_mascota_view(request):
    return render(request, 'pacientes/ficha_mascota.html')

# --- VETERINARIOS ---
def vet_ficha_view(request):
    return render(request, 'veterinarios/vet_ficha.html')

def vet_disponibilidad_view(request):
    return render(request, 'veterinarios/vet_disponibilidad.html')

# --- INVENTARIO ---

def inventario(request):
    return render(request, 'inventario/inventario.html')
