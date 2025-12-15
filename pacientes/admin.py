from django.contrib import admin
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
