from django.urls import path
from . import views

app_name = 'inventario'

urlpatterns = [
    # Inventario
    path('', views.inventario, name='inventario'),
    path('crear/', views.crear_insumo, name='crear_insumo'),
    path('editar/<int:insumo_id>/', views.editar_insumo, name='editar_insumo'),
    path('eliminar/<int:insumo_id>/', views.eliminar_insumo, name='eliminar_insumo'),
    path('detalle/<int:insumo_id>/', views.detalle_insumo, name='detalle_insumo'),
    path('modificar_stock/<int:insumo_id>/', views.modificar_stock_insumo, name='modificar_stock'),
    
    # API
    path('api/productos/', views.productos_api, name='productos_api'),
]