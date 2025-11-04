from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import Usuario

class UsuarioRegistroForm(UserCreationForm):
    rut = forms.CharField(
        max_length=12,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Ej: 12.345.678-9'
        })
    )
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'correo@ejemplo.com'
        })
    )
    first_name = forms.CharField(
        max_length=150,
        required=True,
        label="Nombre",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nombre'
        })
    )
    last_name = forms.CharField(
        max_length=150,
        required=True,
        label="Apellido",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Apellido'
        })
    )
    telefono = forms.CharField(
        max_length=15,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '+56 9 1234 5678'
        })
    )
    direccion = forms.CharField(
        max_length=255,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Dirección completa'
        })
    )
    fecha_nacimiento = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        })
    )
    password1 = forms.CharField(
        label="Contraseña",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Contraseña'
        })
    )
    password2 = forms.CharField(
        label="Confirmar Contraseña",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Confirmar contraseña'
        })
    )
    
    class Meta:
        model = Usuario
        fields = ['rut', 'email', 'first_name', 'last_name', 'telefono', 
                  'direccion', 'fecha_nacimiento', 'password1', 'password2']
    
    def clean_rut(self):
        rut = self.cleaned_data.get('rut')
        # Remove formatting
        rut_clean = rut.replace('.', '').replace('-', '')
        return rut_clean
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = self.cleaned_data['rut'].replace('.', '').replace('-', '')
        if commit:
            user.save()
        return user