from django.contrib import admin
from .models import Insumo

@admin.register(Insumo)
class InsumoAdmin(admin.ModelAdmin):
    list_display = ['medicamento', 'marca', 'formato', 'especie', 'stock_actual', 'precio_venta', 'ultimo_movimiento']
    list_filter = ['formato', 'especie', 'tipo_ultimo_movimiento']
    search_fields = ['medicamento', 'marca', 'sku', 'tipo']
    readonly_fields = ['fecha_creacion', 'ultimo_ingreso', 'ultimo_movimiento', 'tipo_ultimo_movimiento']
    
    fieldsets = (
        ('Información General', {
            'fields': ('medicamento', 'marca', 'sku', 'tipo', 'formato', 'descripcion', 'especie')
        }),
        ('Inventario', {
            'fields': ('stock_actual', 'precio_venta')
        }),
        ('Dosis', {
            'fields': ('dosis_ml', 'ml_contenedor', 'cantidad_pastillas', 'unidades_pipeta', 'peso_kg', 
                      'tiene_rango_peso', 'peso_min_kg', 'peso_max_kg')
        }),
        ('Información Médica', {
            'fields': ('precauciones', 'contraindicaciones', 'efectos_adversos'),
            'classes': ('collapse',)
        }),
        ('Historial', {
            'fields': ('fecha_creacion', 'ultimo_ingreso', 'ultimo_movimiento', 'tipo_ultimo_movimiento', 
                      'usuario_ultimo_movimiento'),
            'classes': ('collapse',)
        }),
    )
