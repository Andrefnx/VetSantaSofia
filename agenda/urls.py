from django.urls import path
from . import views
app_name = 'agenda'

urlpatterns = [
    path('', views.agenda_view, name='agenda'),
    
]