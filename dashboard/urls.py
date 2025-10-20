from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    
    # Components
    path('components/avatars/', views.avatars, name='avatars'),
    path('components/buttons/', views.buttons, name='buttons'),
    path('components/gridsystem/', views.gridsystem, name='gridsystem'),
    path('components/panels/', views.panels, name='panels'),
    path('components/notifications/', views.notifications, name='notifications'),
    path('components/typography/', views.typography, name='typography'),
    path('components/icons/font-awesome/', views.font_awesome_icons, name='font_awesome_icons'),
    path('components/icons/simple-line/', views.simple_line_icons, name='simple_line_icons'),
    path('components/sweetalert/', views.sweetalert, name='sweetalert'),
    
    # Forms
    path('forms/', views.forms, name='forms'),
    
    # Tables
    path('tables/', views.tables, name='tables'),
    path('tables/datatables/', views.datatables, name='datatables'),
    
    # Charts
    path('charts/', views.charts, name='charts'),
    path('charts/sparkline/', views.sparkline, name='sparkline'),
    
    # Maps
    path('maps/google/', views.googlemaps, name='googlemaps'),
    path('maps/jsvector/', views.jsvectormap, name='jsvectormap'),
    
    # Widgets
    path('widgets/', views.widgets, name='widgets'),
    
    # Layouts
    path('layout/icon-menu/', views.icon_menu, name='icon_menu'),
    path('layout/sidebar-style-2/', views.sidebar_style_2, name='sidebar_style_2'),
]
