from django.urls import path
from . import views

app_name = 'caja'

urlpatterns = [
    
    path('', views.caja, name='cashregister'),
    path('reporte/', views.reporte, name='reporte'),
    path('procesar_venta/', views.procesar_venta, name='procesar_venta'),  # Nueva ruta
]