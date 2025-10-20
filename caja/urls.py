from django.urls import path
from caja import views

urlpatterns = [
    path('', views.cashregister, name='cash_register'),
    # Páginas generales
]