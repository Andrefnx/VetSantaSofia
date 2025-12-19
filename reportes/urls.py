from django.urls import path
from . import views

app_name = 'reportes'

urlpatterns = [
    path('', views.index, name='index'),
    path('inventario/', views.reporte_inventario, name='inventario'),
    path('inventario/exportar-excel/', views.exportar_inventario_excel, name='exportar_inventario_excel'),
    path('financieros/', views.reporte_financieros, name='financieros'),
    path('caja/', views.reporte_caja, name='caja'),
    path('caja/exportar-excel/', views.exportar_caja_excel, name='exportar_caja_excel'),
    path('clinica/', views.reporte_clinica, name='clinica'),
    path('clinica/exportar-excel/', views.exportar_clinica_excel, name='exportar_clinica_excel'),
    path('hospitalizacion/', views.reporte_hospitalizacion, name='hospitalizacion'),
    path('hospitalizacion/exportar-excel/', views.exportar_hospitalizacion_excel, name='exportar_hospitalizacion_excel'),
    path('servicios/', views.reporte_servicios, name='servicios'),
    path('servicios/exportar-excel/', views.exportar_servicios_excel, name='exportar_servicios_excel'),
]
