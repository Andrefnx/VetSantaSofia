from django.urls import path
from . import views

app_name = 'hospital'

urlpatterns = [
    # Dashboard
    path('dashboard/', views.dashboard_pacientes, name='dashboard_pacientes'),
    
    # Hospitalización
    path('hospitalizacion/', views.hospital_view, name='hospital_view'),
    
    # Test
    path('test/', views.test_view, name='test_view'),
]
