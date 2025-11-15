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
    
    path('pacientes/', views.pacientes_view, name='pacientes_view'),
    
    path('pacientes/ficha/', views.ficha_mascota, name='ficha_mascota'),

    # Veterinarios
    path('veterinarios/ficha/', views.vet_ficha_view, name='vet_ficha'),
    path('veterinarios/', views.vet_view, name='vet_view'),  # Cambia el name aquí a 'vet_view'
    
    # Inventario
    path('inventario/', views.inventario, name='inventario'),

    path('servicios/', views.servicios, name='servicios'),
    
    path('test/', views.test_view, name='test'),

]
