from django.urls import path
from . import views

urlpatterns = [
    # Dashboard principal
    path('dashboard/', views.dashboard_pacientes, name='dashboard_pacientes'),

    # Consultas
    path('consultas/', views.consulta_view, name='consulta'),

    # Hospitalización
    path('hospitalizacion/', views.hospital_view, name='hospital'),

    # Pacientes
    path('pacientes/', views.pacientes_view, name='pacientes'),
    path('pacientes/<int:paciente_id>/', views.ficha_mascota_view, name='ficha_mascota'),
    path('pacientes/crear/', views.crear_paciente, name='crear_paciente'),
    path('pacientes/<int:paciente_id>/editar/', views.editar_paciente, name='editar_paciente'),
    path('pacientes/<int:paciente_id>/eliminar/', views.eliminar_paciente, name='eliminar_paciente'),
    path('pacientes/ficha/', views.ficha_mascota_view, name='buscar_paciente'),
    
    # Veterinarios
    path('veterinarios/ficha/', views.vet_ficha_view, name='vet_ficha'),
    path('veterinarios/', views.vet_view, name='vet_view'),
    
    # Inventario
    path('inventario/', views.inventario, name='inventario'),
    path('inventario/crear/', views.crear_insumo, name='crear_insumo'),
    path('inventario/editar/<int:insumo_id>/', views.editar_insumo, name='editar_insumo'),
    path('inventario/eliminar/<int:insumo_id>/', views.eliminar_insumo, name='eliminar_insumo'),
    path('inventario/modificar_stock/<int:insumo_id>/', views.modificar_stock, name='modificar_stock'),

    # Servicios
    path('servicios/', views.servicios, name='servicios'),
    path('servicios/crear/', views.crear_servicio, name='crear_servicio'),
    path('servicios/editar/<int:servicio_id>/', views.editar_servicio, name='editar_servicio'),
    path('servicios/eliminar/<int:servicio_id>/', views.eliminar_servicio, name='eliminar_servicio'),
]
