from django import forms
from .models import Caja, DetalleCaja
from hospital.models import Hospitalizacion
from gestion.models import Consulta

class CajaForm(forms.ModelForm):
    class Meta:
        model = Caja
        fields = ['fecha_caja', 'descripcion', 'valor_total', 'veterinario', 'metodo_pago', 'consulta', 'hospitalizacion']
        widgets = {
            'fecha_caja': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'descripcion': forms.TextInput(attrs={'class': 'form-control'}),
            'valor_total': forms.NumberInput(attrs={'class': 'form-control'}),
            'valor_ins': forms.NumberInput(attrs={'class': 'form-control'}),
            'veterinario': forms.TextInput(attrs={'class': 'form-control'}),
            'metodo_pago': forms.Select(attrs={'class': 'form-select'}),
            'consulta': forms.Select(attrs={'class': 'form-select'}),
            'hospitalizacion': forms.Select(attrs={'class': 'form-select'}),
        }
class DetalleForm(forms.ModelForm):
    class Meta:
        model = DetalleCaja
        fields = ['insumo', 'cantidad']
        widgets = {
            'insumo': forms.Select(attrs={'class': 'form-select'}),
            'cantidad': forms.NumberInput(attrs={'class': 'form-control', 'min': 1}),
       }
        
DetalleCajaFormSet = forms.inlineformset_factory(
    Caja,
    DetalleCaja,
    form=DetalleCajaForm,
    extra=1,
    can_delete=True
)