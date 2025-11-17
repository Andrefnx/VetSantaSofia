from datetime import date
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib.auth.decorators import login_required

from agenda.forms import AgendaForm
from agenda.models import Agenda
from hospital.models import Hospitalizacion

@login_required
def agenda_view(request):
    fecha = request.GET.get('fecha')
    if not fecha:
        fecha = date.today()
    citas = Agenda.objects.filter(fecha_agenda=fecha).order_by('hora_agenda')
    return render(request, 'agenda/agenda.html', {'citas': citas, 'fecha': fecha})
        
@login_required
def crear_cita(request):
    if request.method == 'POST':
        form = AgendaForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('agenda_diaria')
    else:
        initial = {}
        fecha = request.GET.get('fecha')
        hora = request.GET.get('hora')
        if fecha:
            initial['fecha_agenda'] = fecha
        if hora:
            initial['hora_agenda'] = hora
        form = AgendaForm(initial=initial)
    return render(request, 'agenda_form.html', {'form': form})

def editar_cita(request, pk):
    cita = get_object_or_404(agenda, pk=pk)
    if request.method == 'POST':
        form = AgendaForm(request.POST, instance=cita)
        if form.is_valid():
            form.save()
            return redirect('agenda_diaria')
    else:
        form = AgendaForm(instance=cita)
    return render(request, 'agenda_form.html', {'form': form})

def cancelar_cita(request, pk):
    cita = get_object_or_404(agenda, pk=pk)
    cita.delete()
    return redirect('agenda_diaria')

def confirmar_cita(request, pk):
    cita = get_object_or_404(agenda, pk=pk)
    cita.estado = 'confirmada'
    cita.save()
    return redirect('agenda_diaria')

def lista_hospitalizaciones(request):
    estado = request.GET.get('estado')
    if estado:
        registros = Hospitalizacion.objects.filter(estado_hosp=estado)
    else:
        registros = Hospitalizacion.objects.all()
    return render(request, 'hospitalizacion_lista.html', {'registros': registros})