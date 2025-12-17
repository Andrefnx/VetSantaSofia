"""
WSGI config for veteriaria project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# Usar settings_production en producción, settings en desarrollo
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings_production')

application = get_wsgi_application()
