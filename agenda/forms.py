from django import forms
from .models import Agenda
class AgendaForm(forms.ModelForm):

    class Meta:
        model = Agenda
        fields = [
            'idMascota', 'fecha_agenda', 'hora_agenda',
            'nombreMascota', 'nombre_apellido', 'telefono',
            'razon', 'estado'
        ]
        labels = {
            'nombreMascota': 'Nombre Mascota',
        }
        widgets = {
            'fecha_agenda': forms.DateInput(attrs={'type': 'date'}),
            'hora_agenda': forms.TimeInput(attrs={'type': 'time'}),
        }