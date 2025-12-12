from django.contrib import admin
from .models import Cita, DisponibilidadVeterinario


@admin.register(DisponibilidadVeterinario)
class DisponibilidadVeterinarioAdmin(admin.ModelAdmin):
    list_display = ['veterinario', 'fecha', 'hora_inicio', 'hora_fin', 'tipo']
    list_filter = ['tipo', 'fecha', 'veterinario']
    search_fields = ['veterinario__nombre', 'veterinario__apellido', 'notas']
    date_hierarchy = 'fecha'
    ordering = ['-fecha', 'hora_inicio']
    
    fieldsets = (
        ('Veterinario', {
            'fields': ('veterinario',)
        }),
        ('Fecha y Horario', {
            'fields': ('fecha', 'hora_inicio', 'hora_fin')
        }),
        ('Tipo de Disponibilidad', {
            'fields': ('tipo', 'notas')
        }),
    )


@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = ['paciente', 'veterinario', 'servicio', 'fecha', 'hora_inicio', 'tipo', 'estado']
    list_filter = ['estado', 'tipo', 'fecha', 'veterinario']
    search_fields = ['paciente__nombre', 'veterinario__nombre', 'veterinario__apellido', 'motivo']
    date_hierarchy = 'fecha'
    ordering = ['-fecha', 'hora_inicio']
    
    fieldsets = (
        ('Paciente y Veterinario', {
            'fields': ('paciente', 'veterinario')
        }),
        ('Servicio', {
            'fields': ('servicio', 'tipo')
        }),
        ('Fecha y Horario', {
            'fields': ('fecha', 'hora_inicio', 'hora_fin')
        }),
        ('Detalles', {
            'fields': ('motivo', 'notas', 'estado', 'recordatorio_enviado')
        }),
    )
