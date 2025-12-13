from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),  # Ruta raíz para login
    path('login/', views.login_view, name='login_alt'),  # Alternativa
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('forgot-password/', views.forgot_password_view, name='forgot_password'),
]