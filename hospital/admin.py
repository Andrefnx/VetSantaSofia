from django.contrib import admin
from .models import Paciente, Propietario, Insumo, Servicio

# Importar solo si existen en models.py
try:
    from .models import Consulta, Hospitalizacion, Examen, Documento
    MODELOS_EXTENDIDOS = True
except ImportError:
    MODELOS_EXTENDIDOS = False

@admin.register(Propietario)
class PropietarioAdmin(admin.ModelAdmin):
    list_display = ('nombre_completo', 'telefono', 'email', 'fecha_registro')
    search_fields = ('nombre', 'apellido', 'telefono', 'email')
    list_filter = ('fecha_registro',)

@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'especie', 'raza', 'edad', 'sexo', 'propietario', 'microchip', 'activo')
    list_filter = ('especie', 'sexo', 'activo', 'fecha_registro')
    search_fields = ('nombre', 'raza', 'microchip', 'propietario__nombre', 'propietario__apellido')
    readonly_fields = ('fecha_registro',)
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'especie', 'raza', 'edad', 'sexo', 'color', 'microchip')
        }),
        ('Propietario', {
            'fields': ('propietario',)
        }),
        ('Control y Seguimiento', {
            'fields': ('ultimo_peso', 'observaciones')
        }),
        ('Estado', {
            'fields': ('activo', 'fecha_registro')
        }),
    )

# Solo registrar si los modelos existen
if MODELOS_EXTENDIDOS:
    @admin.register(Consulta)
    class ConsultaAdmin(admin.ModelAdmin):
        list_display = ('paciente', 'veterinario', 'fecha', 'diagnostico')
        list_filter = ('fecha', 'veterinario')
        search_fields = ('paciente__nombre', 'diagnostico', 'motivo_consulta')
        readonly_fields = ('fecha',)

    @admin.register(Hospitalizacion)
    class HospitalizacionAdmin(admin.ModelAdmin):
        list_display = ('idHospitalizacion', 'idMascota', 'fecha_ingreso', 'fecha_egreso', 'estado_hosp')
        list_filter = ('estado_hosp', 'fecha_ingreso')
        search_fields = ('idMascota__nombre', 'motivo_hospitalizacion')
        readonly_fields = ('idHospitalizacion',)

    @admin.register(Examen)
    class ExamenAdmin(admin.ModelAdmin):
        list_display = ('paciente', 'tipo', 'fecha', 'veterinario')
        list_filter = ('fecha', 'tipo')
        search_fields = ('paciente__nombre', 'tipo', 'resultado')

    @admin.register(Documento)
    class DocumentoAdmin(admin.ModelAdmin):
        list_display = ('nombre', 'paciente', 'fecha_subida')
        list_filter = ('fecha_subida',)
        search_fields = ('nombre', 'paciente__nombre', 'descripcion')

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
