from django.urls import path
from . import views

app_name = 'pacientes'

urlpatterns = [
    path('', views.pacientes_view, name='pacientes'),
    path('<int:paciente_id>/', views.ficha_mascota_view, name='ficha_mascota'),
    path('detalle/<int:paciente_id>/', views.detalle_paciente, name='detalle_paciente'),
    path('crear/', views.crear_paciente, name='crear_paciente'),
    path('editar/<int:paciente_id>/', views.editar_paciente, name='editar_paciente'),
    path('archivar/<int:paciente_id>/', views.archivar_paciente, name='archivar_paciente'),
    path('buscar_propietarios/', views.buscar_propietarios, name='buscar_propietarios'),
    path('propietarios/<int:propietario_id>/', views.detalle_propietario, name='detalle_propietario'),
]