from django import forms
from .models import Caja, MovimientoCaja

class AperturaCajaForm(forms.ModelForm):
    """Formulario para apertura de caja"""
    class Meta:
        model = Caja
        fields = ['monto_inicial', 'observaciones']
        widgets = {
            'monto_inicial': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'Monto inicial en efectivo',
                'step': '0.01',
                'min': '0'
            }),
            'observaciones': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Observaciones opcionales'
            }),
        }
        labels = {
            'monto_inicial': 'Monto Inicial',
            'observaciones': 'Observaciones',
        }


class CierreCajaForm(forms.ModelForm):
    """Formulario para cierre de caja"""
    class Meta:
        model = Caja
        fields = ['monto_final', 'observaciones']
        widgets = {
            'monto_final': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'Monto final en efectivo',
                'step': '0.01',
                'min': '0'
            }),
            'observaciones': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Observaciones del cierre'
            }),
        }
        labels = {
            'monto_final': 'Monto Final',
            'observaciones': 'Observaciones',
        }


class MovimientoCajaForm(forms.ModelForm):
    """Formulario para registrar movimientos de caja"""
    class Meta:
        model = MovimientoCaja
        fields = ['tipo', 'monto', 'concepto', 'metodo_pago', 'descripcion']
        widgets = {
            'tipo': forms.Select(attrs={'class': 'form-control'}),
            'monto': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'Monto',
                'step': '0.01',
                'min': '0'
            }),
            'concepto': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Concepto del movimiento'
            }),
            'metodo_pago': forms.Select(attrs={'class': 'form-control'}),
            'descripcion': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Descripción adicional (opcional)'
            }),
        }
        labels = {
            'tipo': 'Tipo de Movimiento',
            'monto': 'Monto',
            'concepto': 'Concepto',
            'metodo_pago': 'Método de Pago',
            'descripcion': 'Descripción',
        }
