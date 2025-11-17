from django.urls import path
from . import views

app_name = "agenda"

urlpatterns = [
    path('', views.agenda, name='agenda'),
    path('citas/<int:year>/<int:month>/<int:day>/', views.citas_dia, name='citas_dia'),
    path('crear/', views.crear_cita, name='crear_cita'),
]
