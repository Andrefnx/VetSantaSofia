from django.contrib import admin
from .models import ReporteGenerado


@admin.register(ReporteGenerado)
class ReporteGeneradoAdmin(admin.ModelAdmin):
    list_display = ['tipo', 'fecha_generacion', 'usuario', 'total_registros', 'preview_filtros', 'tiene_archivo']
    list_filter = ['tipo', 'fecha_generacion', 'usuario']
    search_fields = ['usuario__nombre', 'usuario__apellido', 'resumen_filtros', 'observaciones']
    readonly_fields = ['fecha_generacion', 'tipo', 'usuario', 'filtros_display', 'resumen_filtros', 'total_registros', 'observaciones']
    fieldsets = (
        ('Información General', {
            'fields': ('tipo', 'fecha_generacion', 'usuario', 'total_registros')
        }),
        ('Filtros Aplicados', {
            'fields': ('resumen_filtros', 'filtros_display')
        }),
        ('Observaciones', {
            'fields': ('observaciones',),
            'classes': ('collapse',)
        }),
    )
    
    def preview_filtros(self, obj):
        """Muestra un preview corto de los filtros"""
        if not obj.resumen_filtros:
            return '-'
        preview = obj.resumen_filtros[:80]
        return preview + '...' if len(obj.resumen_filtros) > 80 else preview
    preview_filtros.short_description = 'Filtros Aplicados'
    
    def filtros_display(self, obj):
        """Muestra el JSON de filtros formateado"""
        import json
        return json.dumps(obj.filtros, indent=2, ensure_ascii=False)
    filtros_display.short_description = 'Filtros (JSON)'
    
    def tiene_archivo(self, obj):
        return '✓' if obj.archivo else '✗'
    tiene_archivo.short_description = 'Archivo'
    
    def has_add_permission(self, request):
        return False  # Solo se crean desde la vista de exportar
