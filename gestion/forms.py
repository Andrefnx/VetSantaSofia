from django import forms
from .models import DocumentoMascota, Agenda

class DocumentoMascotaForm(forms.ModelForm):
    class Meta:
        model = DocumentoMascota
        fields = ['archivo']


class AgendaForm(forms.ModelForm):
    class Meta:
        model = Agenda
        fields = [
            'idMascota', 'fecha_agenda', 'hora_agenda',
            'nombreMascota', 'nombre_apellido', 'telefono',
            'razon', 'estado'
        ]
        widgets = {
            'fecha_agenda': forms.DateInput(attrs={'type': 'date'}),
            'hora_agenda': forms.TimeInput(attrs={'type': 'time'}),
        }
