from django.contrib import admin
from .models import Paciente, Propietario, Consulta, Examen, Documento, Insumo, Servicio

@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'especie', 'raza', 'edad_formateada', 'sexo', 'propietario', 'activo', 'fecha_registro']
    list_filter = ['especie', 'sexo', 'activo', 'fecha_registro']
    search_fields = ['nombre', 'microchip', 'propietario__nombre', 'propietario__apellido']
    readonly_fields = ['fecha_registro', 'fecha_ultima_modificacion']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'especie', 'raza', 'sexo', 'color', 'microchip')
        }),
        ('Edad', {
            'fields': ('fecha_nacimiento', 'edad_anos', 'edad_meses')
        }),
        ('Datos Clínicos', {
            'fields': ('ultimo_peso', 'observaciones', 'fecha_ultimo_control')
        }),
        ('Propietario', {
            'fields': ('propietario',)
        }),
        ('Control', {
            'fields': ('activo', 'fecha_registro', 'fecha_ultima_modificacion')
        }),
    )

@admin.register(Propietario)
class PropietarioAdmin(admin.ModelAdmin):
    list_display = ['nombre_completo', 'telefono', 'email', 'fecha_registro']
    search_fields = ['nombre', 'apellido', 'telefono', 'email']
    readonly_fields = ['fecha_registro']

@admin.register(Consulta)
class ConsultaAdmin(admin.ModelAdmin):
    list_display = ['paciente', 'veterinario', 'fecha', 'motivo_consulta']
    list_filter = ['fecha', 'veterinario']
    search_fields = ['paciente__nombre', 'motivo_consulta', 'diagnostico']
    readonly_fields = ['fecha']

@admin.register(Examen)
class ExamenAdmin(admin.ModelAdmin):
    list_display = ['paciente', 'tipo', 'fecha', 'veterinario']
    list_filter = ['tipo', 'fecha']
    search_fields = ['paciente__nombre', 'tipo', 'resultado']
    readonly_fields = ['fecha']

@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'paciente', 'fecha_subida']
    list_filter = ['fecha_subida']
    search_fields = ['nombre', 'paciente__nombre', 'descripcion']
    readonly_fields = ['fecha_subida']

@admin.register(Insumo)
class InsumoAdmin(admin.ModelAdmin):
    list_display = ('medicamento', 'categoria', 'stock_actual', 'precio_venta')
    list_filter = ('categoria',)
    search_fields = ('medicamento',)

@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'duracion')
    list_filter = ('categoria',)
    search_fields = ('nombre',)
