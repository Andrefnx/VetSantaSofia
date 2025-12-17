from django.urls import path
from . import views, views_cobros

app_name = 'caja'

urlpatterns = [
    
    path('', views.caja, name='cashregister'),
    path('reporte/', views.reporte, name='reporte'),
    path('procesar_venta/', views.procesar_venta, name='procesar_venta'),  # Nueva ruta
    path('api/cobros-pendientes/', views_cobros.api_cobros_pendientes, name='api_cobros_pendientes'),  # API para modal de pagos pendientes
    path('api/cobro/<int:venta_id>/eliminar/', views_cobros.eliminar_cobro_pendiente, name='eliminar_cobro_pendiente'),  # Eliminar cobro pendiente
]