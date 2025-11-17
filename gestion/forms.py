from django import forms
from .models import DocumentoMascota, Agenda, Mascota, Cliente

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


class MascotaForm(forms.ModelForm):
    class Meta:
        model = Mascota
        fields = ['nombreMascota', 'animal_mascota', 'raza_mascota', 'edad', 'peso', 'idCliente']
        widgets = {
            'idCliente': forms.Select(attrs={'class': 'form-control'}),
        }


class ClienteForm(forms.ModelForm):
    class Meta:
        model = Cliente
        fields = ['rutCliente', 'dvCliente', 'nombreCliente', 'telCliente', 'emailCliente', 'direccion']
