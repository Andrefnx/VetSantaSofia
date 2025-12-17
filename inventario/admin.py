from django.contrib import admin
from django import forms
from .models import Insumo

class InsumoAdminForm(forms.ModelForm):
    class Meta:
        model = Insumo
        fields = '__all__'
    
    class Media:
        js = ('js/admin/insumo_admin.js',)

@admin.register(Insumo)
class InsumoAdmin(admin.ModelAdmin):
    form = InsumoAdminForm
    list_display = ['medicamento', 'marca', 'formato', 'especie', 'stock_actual', 'precio_venta', 'ultimo_movimiento']
    list_filter = ['formato', 'especie', 'tipo_ultimo_movimiento']
    search_fields = ['medicamento', 'marca', 'sku', 'tipo']
    readonly_fields = ['fecha_creacion', 'ultimo_ingreso', 'ultimo_movimiento', 'tipo_ultimo_movimiento']
    
    fieldsets = (
        ('Información General', {
            'fields': ('medicamento', 'marca', 'sku', 'tipo', 'formato', 'descripcion', 'especie')
        }),
        ('Inventario', {
            'fields': ('stock_actual', 'stock_minimo', 'stock_medio', 'precio_venta', 'archivado')
        }),
        ('Dosis - Líquidos e Inyectables', {
            'fields': ('dosis_ml', 'ml_contenedor'),
            'classes': ('collapse', 'formato-liquido', 'formato-inyectable'),
        }),
        ('Dosis - Pastillas', {
            'fields': ('cantidad_pastillas',),
            'classes': ('collapse', 'formato-pastilla'),
        }),
        ('Dosis - Pipetas', {
            'fields': ('unidades_pipeta',),
            'classes': ('collapse', 'formato-pipeta'),
        }),
        ('Peso de Referencia', {
            'fields': ('peso_kg', 'tiene_rango_peso', 'peso_min_kg', 'peso_max_kg'),
            'classes': ('collapse',),
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
