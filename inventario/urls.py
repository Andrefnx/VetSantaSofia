from django.urls import path
from . import views

app_name = 'inventario'

urlpatterns = [
    path('', views.inventario_view, name='inventario'),
    path('crear/', views.crear_insumo, name='crear_insumo'),
    path('<int:insumo_id>/editar/', views.editar_insumo, name='editar_insumo'),
    path('<int:insumo_id>/detalle/', views.detalle_insumo, name='detalle_insumo'),
    path('<int:insumo_id>/eliminar/', views.eliminar_insumo, name='eliminar_insumo'),
    path('<int:insumo_id>/modificar-stock/', views.modificar_stock_insumo, name='modificar_stock'),
    path('<int:insumo_id>/actualizar-niveles/', views.actualizar_niveles_stock, name='actualizar_niveles_stock'),
    path('restaurar/<int:producto_id>/', views.restaurar_producto, name='restaurar_producto'),
    
    # API endpoints
    path('api/productos/', views.api_productos, name='api_productos'),
]