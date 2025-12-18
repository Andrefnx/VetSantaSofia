from django.urls import path
from . import views

app_name = 'reportes'

urlpatterns = [
    path('', views.index, name='index'),
    path('inventario/', views.reporte_inventario, name='inventario'),
    path('caja/', views.reporte_caja, name='caja'),
    path('clinica/', views.reporte_clinica, name='clinica'),
    path('hospitalizacion/', views.reporte_hospitalizacion, name='hospitalizacion'),
    path('servicios/', views.reporte_servicios, name='servicios'),
]
