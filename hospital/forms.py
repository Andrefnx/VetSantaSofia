from django import forms
from .models import Hospitalizacion

class HospitalizacionForm(forms.ModelForm):
    class Meta:
        model = Hospitalizacion
        fields = [
            'idMascota', 'idIns', 'fecha_ingreso', 'fecha_egreso',
            'motivo_hospitalizacion', 'tratamiento', 'telefono',
            'notas', 'estado_hosp'
        ]
        widgets = {
            'fecha_ingreso': forms.DateInput(attrs={'type': 'date'}),
            'fecha_egreso': forms.DateInput(attrs={'type': 'date'}),
        }
