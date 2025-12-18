from django.urls import path
from . import views, views_cobros

app_name = 'caja'

urlpatterns = [
    
    path('', views.caja, name='cashregister'),
    path('reporte/', views.reporte, name='reporte'),
    path('procesar_venta/', views.procesar_venta, name='procesar_venta'),  # Nueva ruta
    path('boleta/<int:venta_id>/', views_cobros.imprimir_boleta, name='imprimir_boleta'),  # Imprimir boleta
    path('api/guardar-borrador/', views_cobros.guardar_borrador, name='guardar_borrador'),  # Guardar carrito como borrador
    path('api/cobros-pendientes/', views_cobros.api_cobros_pendientes, name='api_cobros_pendientes'),  # API para modal de pagos pendientes
    path('api/recuperar-ventas-proceso/', views_cobros.recuperar_ventas_en_proceso, name='recuperar_ventas_proceso'),  # Recuperar ventas huérfanas
    path('api/cobro/<int:venta_id>/marcar-en-proceso/', views_cobros.marcar_cobro_en_proceso, name='marcar_cobro_en_proceso'),  # Marcar como en proceso
    path('api/cobro/<int:venta_id>/devolver-a-pendiente/', views_cobros.devolver_cobro_a_pendiente, name='devolver_cobro_a_pendiente'),  # Devolver a pendiente (borrador)
    path('api/cobro/<int:venta_id>/eliminar/', views_cobros.eliminar_cobro_pendiente, name='eliminar_cobro_pendiente'),  # Eliminar cobro pendiente
    path('api/cobro/<int:venta_id>/confirmar-pago/', views_cobros.confirmar_pago_venta, name='confirmar_pago_venta'),  # Confirmar pago y descontar stock
]