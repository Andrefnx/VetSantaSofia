from django.contrib import admin
from .models import Servicio, ServicioInsumo

@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'duracion', 'activo', 'fecha_creacion')
    list_filter = ('activo', 'categoria', 'fecha_creacion')
    search_fields = ('nombre', 'descripcion', 'categoria')
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion', 'ultimo_movimiento', 'tipo_ultimo_movimiento', 'usuario_ultima_modificacion')
    ordering = ('nombre',)
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'descripcion', 'categoria')
        }),
        ('Precio y Duración', {
            'fields': ('precio', 'duracion')
        }),
        ('Estado', {
            'fields': ('activo',)
        }),
        ('Trazabilidad', {
            'fields': ('fecha_creacion', 'fecha_actualizacion', 'ultimo_movimiento', 'tipo_ultimo_movimiento', 'usuario_ultima_modificacion'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ServicioInsumo)
class ServicioInsumoAdmin(admin.ModelAdmin):
    list_display = ('servicio', 'insumo', 'cantidad')
    list_filter = ('servicio',)
    search_fields = ('servicio__nombre', 'insumo__medicamento')
    autocomplete_fields = ['servicio', 'insumo']
