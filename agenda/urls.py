from django.urls import path
from . import views

app_name = 'agenda'

urlpatterns = [
    # Vista principal de la agenda
    path('', views.agenda, name='agenda'),
    
    # Citas por día
    path('citas/<int:year>/<int:month>/<int:day>/', views.citas_dia, name='citas_dia'),
    
    # CRUD de citas
    path('crear/', views.crear_cita, name='crear_cita'),
    path('editar/<int:cita_id>/', views.editar_cita, name='editar_cita'),
    path('eliminar/<int:cita_id>/', views.eliminar_cita, name='eliminar_cita'),
]
