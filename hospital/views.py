from django.shortcuts import get_object_or_404, redirect, render

from hospital.forms import HospitalizacionForm
from hospital.models import Hospitalizacion, Insumo

# Dashboard principal
def dashboard_pacientes(request):
    return render(request, 'dashboard_pacientes.html')

# --- AGENDA ---
def agenda_view(request):
    return render(request, 'agenda/agenda.html')

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

def ver_insumos(request):
    insumos = insumo.objects.all()
    return render(request, 'ver_insumos.html', {'insumos': insumos}
)

def agregar_insumo(request):
    if request.method == 'POST':
        medicamento = request.POST.get('medicamento')
        dosis = request.POST.get('dosis')
        valor_unitario = request.POST.get('valor_unitario')
        cantidad = request.POST.get('cantidad')
        Insumo.objects.create(
            medicamento=medicamento,
            dosis=dosis,
            valor_unitario=valor_unitario,
            cantidad=cantidad
        )
        return redirect('ver_insumos')
    return render(request, 'agregar_insumo.html')

def eliminar_insumo(request, insumo_id):
    if request.method == 'POST':
        Insumo.objects.filter(idIns=insumo_id).delete()
        
    return redirect('ver_insumos')

def editar_insumo(request, insumo_id):
    insumo_obj = get_object_or_404(Insumo, idIns=insumo_id)
    if request.method == 'POST':
        insumo_obj.medicamento = request.POST.get('medicamento')
        insumo_obj.dosis = request.POST.get('dosis')
        insumo_obj.valor_unitario = request.POST.get('valor_unitario')
        insumo_obj.cantidad = request.POST.get('cantidad')
        insumo_obj.save()
        return redirect('ver_insumos')
    return render(request, 'editar_insumo.html', {'insumo': insumo_obj})

def lista_hospitalizaciones(request):
    estado = request.GET.get('estado')
    if estado:
        registros = Hospitalizacion.objects.filter(estado_hosp=estado)
    else:
        registros = Hospitalizacion.objects.all()
    return render(request, 'hospitalizacion_lista.html', {'registros': registros})

def crear_hospitalizacion(request):
    if request.method == 'POST':
        form = HospitalizacionForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('lista_hospitalizaciones')
    else:
        form = HospitalizacionForm()
    return render(request, 'hospitalizacion_form.html', {'form': form})

def editar_hospitalizacion(request, pk):
    registro = get_object_or_404(Hospitalizacion, pk=pk)
    if request.method == 'POST':
        form = HospitalizacionForm(request.POST, instance=registro)
        if form.is_valid():
            form.save()
            return redirect('lista_hospitalizaciones')
    else:
        form = HospitalizacionForm(instance=registro)
    return render(request, 'hospitalizacion_form.html', {'form': form})

def eliminar_hospitalizacion(request, pk):
    registro = get_object_or_404(Hospitalizacion, pk=pk)
    if request.method == 'POST':
        registro.delete()
        return redirect('lista_hospitalizaciones')
    return render(request, 'hospitalizacion_confirm_delete.html', {'registro': registro})
