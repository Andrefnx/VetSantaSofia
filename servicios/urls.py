from django.urls import path
from . import views

app_name = 'servicios'

urlpatterns = [
    path('', views.servicios, name='servicios'),
    path('crear/', views.crear_servicio, name='crear_servicio'),
    path('editar/<int:servicio_id>/', views.editar_servicio, name='editar_servicio'),
    path('eliminar/<int:servicio_id>/', views.eliminar_servicio, name='eliminar_servicio'),
]
