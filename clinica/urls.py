from django.urls import path
from . import views

app_name = 'clinica'

urlpatterns = [
    # Vistas existentes
    path('consultas/', views.consulta_view, name='consultas'),
    path('veterinarios/', views.vet_view, name='veterinarios'),
    path('veterinarios/ficha/', views.vet_ficha_view, name='vet_ficha'),
    path('veterinarios/disponibilidad/', views.vet_disponibilidad_view, name='vet_disponibilidad'),
    
    # ⭐ Nuevas rutas para pacientes
    path('veterinarios/pacientes/<int:paciente_id>/', views.ficha_paciente, name='ficha_paciente'),
    path('pacientes/<int:paciente_id>/data/', views.get_paciente_data, name='get_paciente_data'),
    path('pacientes/<int:paciente_id>/antecedentes/', views.actualizar_antecedentes, name='actualizar_antecedentes'),
    path('pacientes/<int:paciente_id>/consulta/crear/', views.crear_consulta, name='crear_consulta'),
    path('pacientes/<int:paciente_id>/consulta/<int:consulta_id>/detalle/', views.detalle_consulta, name='detalle_consulta'),
    path('pacientes/<int:pk>/', views.ficha_mascota, name='ficha_mascota'),
    path('api/servicios/', views.obtener_servicios, name='obtener_servicios'),
    path('api/insumos/', views.obtener_insumos, name='obtener_insumos'),
    
    # ⭐ NUEVAS RUTAS PARA HOSPITALIZACIONES
    path('pacientes/<int:paciente_id>/hospitalizacion/crear/', views.crear_hospitalizacion, name='crear_hospitalizacion'),
    path('pacientes/<int:paciente_id>/hospitalizaciones/', views.obtener_hospitalizaciones, name='obtener_hospitalizaciones'),
    path('pacientes/<int:paciente_id>/hospitalizacion/<int:hospitalizacion_id>/detalle/', views.detalle_hospitalizacion, name='detalle_hospitalizacion'),
    
    # Rutas para cirugías
    path('hospitalizacion/<int:hospitalizacion_id>/cirugia/crear/', views.crear_cirugia, name='crear_cirugia'),
    
    # Rutas para registros diarios
    path('hospitalizacion/<int:hospitalizacion_id>/registro/crear/', views.crear_registro_diario, name='crear_registro_diario'),
    
    # Rutas para altas médicas
    path('hospitalizacion/<int:hospitalizacion_id>/alta/crear/', views.crear_alta_medica, name='crear_alta_medica'),
]