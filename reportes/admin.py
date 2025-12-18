from django.contrib import admin
from .models import ReporteGenerado


@admin.register(ReporteGenerado)
class ReporteGeneradoAdmin(admin.ModelAdmin):
    list_display = ['tipo', 'fecha_generacion', 'usuario', 'total_registros', 'tiene_archivo']
    list_filter = ['tipo', 'fecha_generacion', 'usuario']
    search_fields = ['usuario__nombre', 'usuario__apellido']
    readonly_fields = ['fecha_generacion', 'filtros', 'total_registros']
    
    def tiene_archivo(self, obj):
        return '✓' if obj.archivo else '✗'
    tiene_archivo.short_description = 'Archivo'
    
    def has_add_permission(self, request):
        return False  # Solo se crean desde la vista de exportar
