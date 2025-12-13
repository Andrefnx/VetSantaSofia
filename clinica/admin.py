from django.contrib import admin
from .models import Consulta, Hospitalizacion, Cirugia, RegistroDiario, Alta, Documento

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


@admin.register(Hospitalizacion)
class HospitalizacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'paciente', 'veterinario', 'estado', 'fecha_ingreso', 'fecha_alta')
    list_filter = ('estado', 'fecha_ingreso', 'paciente')
    search_fields = ('paciente__nombre', 'motivo', 'diagnostico_hosp')
    readonly_fields = ('fecha_ingreso',)
    
    fieldsets = (
        ('Información General', {
            'fields': ('paciente', 'veterinario', 'fecha_ingreso', 'fecha_alta', 'estado')
        }),
        ('Diagnóstico', {
            'fields': ('motivo', 'diagnostico_hosp', 'observaciones')
        }),
    )
    
    ordering = ('-fecha_ingreso',)
    date_hierarchy = 'fecha_ingreso'


@admin.register(Cirugia)
class CirugiaAdmin(admin.ModelAdmin):
    list_display = ('id', 'tipo_cirugia', 'hospitalizacion', 'veterinario_cirujano', 'fecha_cirugia', 'resultado')
    list_filter = ('resultado', 'fecha_cirugia', 'tipo_cirugia')
    search_fields = ('tipo_cirugia', 'descripcion', 'hospitalizacion__paciente__nombre')
    readonly_fields = ('fecha_cirugia',)
    
    fieldsets = (
        ('Información General', {
            'fields': ('hospitalizacion', 'tipo_cirugia', 'fecha_cirugia', 'veterinario_cirujano')
        }),
        ('Anestesia', {
            'fields': ('anestesiologo', 'tipo_anestesia')
        }),
        ('Detalles de la Cirugía', {
            'fields': ('descripcion', 'duracion_minutos', 'resultado', 'complicaciones')
        }),
        ('Medicamentos', {
            'fields': ('medicamentos',)
        }),
    )
    
    ordering = ('-fecha_cirugia',)
    date_hierarchy = 'fecha_cirugia'


@admin.register(RegistroDiario)
class RegistroDiarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'hospitalizacion', 'fecha_registro', 'temperatura', 'peso')
    list_filter = ('fecha_registro', 'hospitalizacion__paciente')
    search_fields = ('hospitalizacion__paciente__nombre', 'observaciones')
    readonly_fields = ('fecha_registro',)
    
    fieldsets = (
        ('Información General', {
            'fields': ('hospitalizacion', 'fecha_registro')
        }),
        ('Signos Vitales', {
            'fields': ('temperatura', 'peso', 'frecuencia_cardiaca', 'frecuencia_respiratoria')
        }),
        ('Observaciones y Medicamentos', {
            'fields': ('observaciones', 'medicamentos')
        }),
    )
    
    ordering = ('-fecha_registro',)
    date_hierarchy = 'fecha_registro'


@admin.register(Alta)
class AltaAdmin(admin.ModelAdmin):
    list_display = ('id', 'hospitalizacion', 'fecha_alta', 'proxima_revision')
    list_filter = ('fecha_alta', 'proxima_revision')
    search_fields = ('hospitalizacion__paciente__nombre', 'diagnostico_final')
    readonly_fields = ('fecha_alta',)
    
    fieldsets = (
        ('Información General', {
            'fields': ('hospitalizacion', 'fecha_alta', 'proxima_revision')
        }),
        ('Resumen Médico', {
            'fields': ('diagnostico_final', 'tratamiento_post_alta', 'recomendaciones')
        }),
    )
    
    ordering = ('-fecha_alta',)
    date_hierarchy = 'fecha_alta'


@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'paciente', 'fecha_subida')
    list_filter = ('fecha_subida', 'paciente')
    search_fields = ('nombre', 'descripcion', 'paciente__nombre')
    readonly_fields = ('fecha_subida',)
    
    fieldsets = (
        ('Información del Documento', {
            'fields': ('paciente', 'nombre', 'descripcion')
        }),
        ('Archivo', {
            'fields': ('archivo', 'fecha_subida')
        }),
    )
    
    ordering = ('-fecha_subida',)
    date_hierarchy = 'fecha_subida'
