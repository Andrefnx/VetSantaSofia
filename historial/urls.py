"""
URLs para el módulo de historial.
"""
from django.urls import path
from . import views

app_name = 'historial'

urlpatterns = [
    # Página completa de historial (detecta AJAX automáticamente)
    path('<str:entidad>/<int:objeto_id>/', 
         views.historial_detalle, 
         name='detalle'),
    
    # Resumen para modales (AJAX)
    path('resumen/<str:entidad>/<int:objeto_id>/', 
         views.historial_resumen, 
         name='resumen'),
]
