from django import forms
from .models import Caja
from hospital.models import Hospitalizacion
from gestion.models import Consulta

class CajaForm(forms.ModelForm):
    class Meta:
        model = Caja
        fields = ['valor_total', 'valor_ins', 'metodo_pago']
