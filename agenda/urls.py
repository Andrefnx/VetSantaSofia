from django.urls import path
from . import views

app_name = 'agenda'

urlpatterns = [
    # Vista principal de la agenda
    path('', views.agenda, name='agenda'),
    
    # Citas por día
    path('citas/<int:year>/<int:month>/<int:day>/', views.citas_dia, name='citas_dia'),
    
    # CRUD de citas
    path('citas/crear/', views.crear_cita, name='crear_cita'),
    path('citas/editar/<int:cita_id>/', views.editar_cita, name='editar_cita'),
    path('citas/eliminar/<int:cita_id>/', views.eliminar_cita, name='eliminar_cita'),
    
    # Disponibilidad de veterinarios
    path('disponibilidad/mes/<int:year>/<int:month>/', views.disponibilidad_mes, name='disponibilidad_mes'),
    path('disponibilidad/dia/<int:year>/<int:month>/<int:day>/', views.disponibilidad_dia, name='disponibilidad_dia'),
    path('disponibilidad/crear/', views.crear_disponibilidad, name='crear_disponibilidad'),
    path('disponibilidad/editar/<int:disponibilidad_id>/', views.editar_disponibilidad, name='editar_disponibilidad'),
    path('disponibilidad/eliminar/<int:disponibilidad_id>/', views.eliminar_disponibilidad, name='eliminar_disponibilidad'),
    
    # Slots disponibles para agendamiento
    path('slots/<int:veterinario_id>/<int:year>/<int:month>/<int:day>/', views.slots_disponibles, name='slots_disponibles'),
    
    # Horarios fijos
    path('horarios-fijos/<int:veterinario_id>/', views.horarios_fijos, name='horarios_fijos'),
    path('horarios-fijos/crear/', views.crear_horario_fijo, name='crear_horario_fijo'),
    path('horarios-fijos/editar/<int:horario_id>/', views.editar_horario_fijo, name='editar_horario_fijo'),
    path('horarios-fijos/eliminar/<int:horario_id>/', views.eliminar_horario_fijo, name='eliminar_horario_fijo'),
]
