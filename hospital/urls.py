from django.urls import path
from . import views

app_name = 'hospital'

urlpatterns = [
    # Dashboard
    path('dashboard/', views.dashboard_pacientes, name='dashboard_pacientes'),
    path('hospitalizaciones/', views.hospitalizaciones, name='hospitalizaciones'),
    path('detalle/<int:hosp_id>/', views.detalle, name='detalle'),
]