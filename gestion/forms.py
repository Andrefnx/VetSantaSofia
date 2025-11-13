from django import forms
from .models import DocumentoMascota

class DocumentoMascotaForm(forms.ModelForm):
    class Meta:
        model = DocumentoMascota
        fields = ['archivo']


