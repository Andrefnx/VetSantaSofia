"""
URLs para el sistema de caja y cobros
"""

from django.urls import path
from . import views_cobros

app_name = 'caja'

urlpatterns = [
    # Dashboard principal
    path('dashboard/', views_cobros.dashboard_caja, name='dashboard'),
    
    # Sesiones de caja
    path('abrir/', views_cobros.abrir_caja, name='abrir_caja'),
    path('cerrar/<int:sesion_id>/', views_cobros.cerrar_caja, name='cerrar_caja'),
    path('historial/', views_cobros.historial_sesiones, name='historial_sesiones'),
    path('sesion/<int:sesion_id>/reporte/', views_cobros.ver_reporte_sesion, name='reporte_sesion'),
    
    # Cobros pendientes
    path('cobros-pendientes/', views_cobros.lista_cobros_pendientes, name='lista_cobros'),
    path('cobro/<int:venta_id>/', views_cobros.detalle_cobro_pendiente, name='detalle_cobro'),
    path('api/cobros-pendientes/', views_cobros.api_cobros_pendientes, name='api_cobros_pendientes'),
    path('api/recuperar-ventas-proceso/', views_cobros.recuperar_ventas_en_proceso, name='recuperar_ventas_proceso'),
    
    # Venta libre
    path('venta-libre/', views_cobros.crear_venta_libre_view, name='crear_venta_libre'),
    
    # Edición de ventas (AJAX)
    path('venta/<int:venta_id>/agregar-item/', views_cobros.agregar_item_venta, name='agregar_item'),
    path('detalle/<int:detalle_id>/eliminar/', views_cobros.eliminar_item_venta, name='eliminar_item'),
    path('detalle/<int:detalle_id>/modificar-cantidad/', views_cobros.modificar_cantidad_item, name='modificar_cantidad'),
    path('venta/<int:venta_id>/aplicar-descuento/', views_cobros.aplicar_descuento, name='aplicar_descuento'),
    
    # Procesamiento de pagos
    path('venta/<int:venta_id>/confirmar-pago/', views_cobros.confirmar_pago_venta, name='confirmar_pago'),
    path('venta/<int:venta_id>/cancelar/', views_cobros.cancelar_venta_view, name='cancelar_venta'),
    
    # APIs de búsqueda
    path('api/buscar-paciente/', views_cobros.buscar_paciente, name='api_buscar_paciente'),
    path('api/buscar-servicio/', views_cobros.buscar_servicio, name='api_buscar_servicio'),
    path('api/buscar-insumo/', views_cobros.buscar_insumo, name='api_buscar_insumo'),
]
