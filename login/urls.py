from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_user, name='login'),
    path('registro/', views.register_user, name='register_user'),
]