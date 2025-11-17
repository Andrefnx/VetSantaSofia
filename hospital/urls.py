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
    
    path('pacientes/', views.pacientes, name='pacientes_view'),
    
    path('pacientes/ficha/', views.ficha_mascota_view, name='ficha_mascota'),

    # Veterinarios
    path('veterinarios/ficha/', views.vet_ficha_view, name='vet_ficha'),
    path('veterinarios/', views.vet_view, name='vet_view'),  # Cambia el name aquí a 'vet_view'
    
    # Inventario
    path('inventario/', views.inventario, name='inventario'),
    path('inventario/crear/', views.crear_insumo, name='crear_insumo'),
    path('inventario/editar/<int:insumo_id>/', views.editar_insumo, name='editar_insumo'),
    path('inventario/eliminar/<int:insumo_id>/', views.eliminar_insumo, name='eliminar_insumo'),
    path('inventario/modificar_stock/<int:insumo_id>/', views.modificar_stock, name='modificar_stock'),

    path('servicios/', views.servicios, name='servicios'),
    
    path('test/', views.test_view, name='test'),

]
