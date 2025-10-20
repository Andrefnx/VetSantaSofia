from django.urls import path
from dashboard import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
      # Páginas generales
    path('widgets/', views.widgets, name='dashboard_widgets'),
    path('sidebar-style-2/', views.sidebar_style_2, name='dashboard_sidebar_style_2'),
    path('starter-template/', views.starter_template, name='dashboard_starter_template'),

    # Charts
    path('charts/', views.charts, name='dashboard_charts'),
    path('charts/sparkline/', views.sparkline, name='dashboard_sparkline'),

    # Components
    path('components/avatars/', views.avatars, name='dashboard_avatars'),
    path('components/buttons/', views.buttons, name='dashboard_buttons'),
    path('components/gridsystem/', views.gridsystem, name='dashboard_gridsystem'),
    path('components/panels/', views.panels, name='dashboard_panels'),
    path('components/notifications/', views.notifications, name='dashboard_notifications'),
    path('components/sweetalert/', views.sweetalert, name='dashboard_sweetalert'),
    path('components/font-awesome-icons/', views.font_awesome_icons, name='dashboard_font_awesome_icons'),
    path('components/simple-line-icons/', views.simple_line_icons, name='dashboard_simple_line_icons'),
    path('components/typography/', views.typography, name='dashboard_typography'),

    # Forms
    path('forms/', views.forms, name='dashboard_forms'),

    # Maps
    path('maps/googlemaps/', views.googlemaps, name='dashboard_googlemaps'),
    path('maps/jsvectormap/', views.jsvectormap, name='dashboard_jsvectormap'),

    # Tables
    path('tables/', views.tables, name='dashboard_tables'),
    path('tables/datatables/', views.datatables, name='dashboard_datatables'),
    path('tables/icon-menu/', views.icon_menu, name='dashboard_icon_menu'),

]
