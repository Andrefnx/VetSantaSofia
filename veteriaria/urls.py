from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from veteriaria.views_ui import ui_preview

admin.site.site_header = 'VetLog'
admin.site.site_title = 'VetLog Admin'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('dashboard/', include('dashboard.urls')),
    path('pacientes/', include('pacientes.urls')),
    path('inventario/', include('inventario.urls')),
    path('servicios/', include('servicios.urls')),
    path('clinica/', include('clinica.urls')),
    path('agenda/', include('agenda.urls')),
    path('caja/', include('caja.urls')),
    path('historial/', include('historial.urls')),
    path('ui/preview/', ui_preview, name='ui_preview'),
    path('', include('login.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
