from django.urls import path
from . import views

app_name = 'hospital'

urlpatterns = [
    # Dashboard
    path('dashboard/', views.dashboard_pacientes, name='dashboard_pacientes'),
    
    # Pacientes
    path('pacientes/', views.pacientes_view, name='pacientes_view'),
    path('pacientes/<int:paciente_id>/', views.ficha_mascota_view, name='ficha_mascota'),
    path('pacientes/crear/', views.crear_paciente, name='crear_paciente'),
    path('pacientes/editar/<int:paciente_id>/', views.editar_paciente, name='editar_paciente'),
    path('pacientes/editar/<int:paciente_id>/ajax/', views.editar_paciente_ajax, name='editar_paciente_ajax'),
    path('pacientes/eliminar/<int:paciente_id>/', views.eliminar_paciente, name='eliminar_paciente'),
    path('pacientes/detalle/<int:paciente_id>/', views.detalle_paciente, name='detalle_paciente'),
    
    # Propietarios
    path('propietarios/buscar/', views.buscar_propietarios, name='buscar_propietarios'),
    path('propietarios/<int:propietario_id>/', views.detalle_propietario, name='detalle_propietario'),
    
    # Veterinarios
    path('veterinarios/', views.vet_view, name='vet_view'),
    path('veterinarios/ficha/', views.vet_ficha_view, name='vet_ficha_view'),
    path('veterinarios/disponibilidad/', views.vet_disponibilidad_view, name='vet_disponibilidad_view'),
    
    # Consultas
    path('consultas/', views.consulta_view, name='consulta_view'),
    
    # Hospitalización
    path('hospitalizacion/', views.hospital_view, name='hospital_view'),
    
    # Inventario
    path('inventario/', views.inventario, name='inventario'),
    path('inventario/crear/', views.crear_insumo, name='crear_insumo'),
    path('inventario/editar/<int:insumo_id>/', views.editar_insumo, name='editar_insumo'),
    path('inventario/eliminar/<int:insumo_id>/', views.eliminar_insumo, name='eliminar_insumo'),
    path('inventario/modificar-stock/<int:insumo_id>/', views.modificar_stock, name='modificar_stock'),
    
    # Servicios
    path('servicios/', views.servicios, name='servicios'),
    path('servicios/crear/', views.crear_servicio, name='crear_servicio'),
    path('servicios/editar/<int:servicio_id>/', views.editar_servicio, name='editar_servicio'),
    path('servicios/eliminar/<int:servicio_id>/', views.eliminar_servicio, name='eliminar_servicio'),
    
    # Test
    path('test/', views.test_view, name='test_view'),
]
