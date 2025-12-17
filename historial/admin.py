from django.contrib import admin
from .models import RegistroHistorico


@admin.register(RegistroHistorico)
class RegistroHistoricoAdmin(admin.ModelAdmin):
    """
    Admin para visualizar el historial de eventos.
    
    IMPORTANTE: Los registros NO son editables (append-only).
    """
    list_display = [
        'fecha_evento',
        'entidad',
        'objeto_id',
        'tipo_evento',
        'criticidad',
        'usuario',
    ]
    
    list_filter = [
        'entidad',
        'tipo_evento',
        'criticidad',
        'fecha_evento',
    ]
    
    search_fields = [
        'descripcion',
        'objeto_id',
    ]
    
    readonly_fields = [
        'fecha_evento',
        'entidad',
        'objeto_id',
        'tipo_evento',
        'descripcion',
        'datos_cambio',
        'usuario',
        'criticidad',
    ]
    
    # NO permitir agregar, editar ni eliminar desde el admin
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Solo superusuarios pueden eliminar (para casos extremos)
        return request.user.is_superuser
    
    date_hierarchy = 'fecha_evento'
    ordering = ['-fecha_evento']
