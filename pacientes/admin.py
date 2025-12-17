from django.contrib import admin
from django.core.exceptions import ValidationError
from .models import Propietario, Paciente


@admin.register(Propietario)
class PropietarioAdmin(admin.ModelAdmin):
    list_display = (
        'nombre',
        'apellido',
        'telefono',
        'email',
        'fecha_registro',
    )

    search_fields = (
        'nombre',
        'apellido',
        'telefono',
        'email',
    )

    list_filter = (
        'fecha_registro',
    )

    ordering = ('apellido', 'nombre')
    
    def save_model(self, request, obj, form, change):
        """
        Ensure model validation (clean/full_clean) is called.
        Django ModelForm already calls full_clean(), but this ensures
        our custom validation is properly triggered and errors are displayed.
        """
        try:
            obj.full_clean()
            super().save_model(request, obj, form, change)
        except ValidationError:
            # Re-raise to let Django admin handle and display errors normally
            raise


@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = (
        'nombre',
        'especie',
        'sexo',
        'propietario',
        'activo',
        'fecha_registro',
    )

    search_fields = (
        'nombre',
        'propietario__nombre',
        'propietario__apellido',
        'propietario__telefono',
        'propietario__email',
        'microchip',
    )

    list_filter = (
        'activo',
        'especie',
        'sexo',
    )

    ordering = ('-fecha_registro',)
