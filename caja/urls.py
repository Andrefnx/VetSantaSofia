from django.urls import path
from . import views

app_name = 'caja'

urlpatterns = [
    path('', views.caja, name='cashregister'),
    path('reporte/', views.reporte, name='reporte'),
]