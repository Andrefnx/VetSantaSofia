from django.urls import path
from . import views

app_name = 'pacientes'

urlpatterns = [
    path('', views.pacientes_view, name='pacientes'),
    path('<int:paciente_id>/', views.ficha_mascota_view, name='ficha_mascota'),
    path('crear/', views.crear_paciente, name='crear_paciente'),
    path('editar/<int:paciente_id>/', views.editar_paciente, name='editar_paciente'),
    path('eliminar/<int:paciente_id>/', views.eliminar_paciente, name='eliminar_paciente'),
    path('buscar_propietarios/', views.buscar_propietarios, name='buscar_propietarios'),
]