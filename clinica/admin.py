from django.contrib import admin
from .models import Consulta

@admin.register(Consulta)
class ConsultaAdmin(admin.ModelAdmin):
    list_display = ('id', 'paciente', 'veterinario', 'temperatura', 'peso', 'fecha')
    list_filter = ('paciente', 'veterinario', 'fecha')
    search_fields = ('paciente__nombre', 'veterinario__username', 'diagnostico', 'tratamiento')
    readonly_fields = ('fecha',)
    
    fieldsets = (
        ('Información General', {
            'fields': ('paciente', 'veterinario', 'fecha')
        }),
        ('Signos Vitales', {
            'fields': ('temperatura', 'peso', 'frecuencia_cardiaca', 'frecuencia_respiratoria', 'otros')
        }),
        ('Diagnóstico y Tratamiento', {
            'fields': ('diagnostico', 'tratamiento', 'notas')
        }),
    )
    
    ordering = ('-fecha',)
    date_hierarchy = 'fecha'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('paciente', 'veterinario')
