"""Django settings for VetSantaSofia."""

from pathlib import Path

import dj_database_url
from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='', cast=Csv())

INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'django_extensions',
    'historial',
    'dashboard',
    'caja',
    'inventario',
    'servicios',
    'pacientes',
    'clinica',
    'login',
    'cuentas',
    'agenda',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'historial.middleware.CurrentUserMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'veteriaria.urls'
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates', BASE_DIR / 'dashboard' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
WSGI_APPLICATION = 'veteriaria.wsgi.application'

DATABASE_URL = config('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}')
DATABASES = {
    'default': dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        conn_health_checks=True,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-cl'
TIME_ZONE = 'America/Santiago'
USE_I18N = True
USE_TZ = True
APPEND_SLASH = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static', BASE_DIR / 'agenda' / 'Static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'cuentas.CustomUser'
LOGIN_URL = 'login'
LOGIN_REDIRECT_URL = '/dashboard/'
LOGOUT_REDIRECT_URL = 'login'
AUTHENTICATION_BACKENDS = [
    'cuentas.backends.RutBackend',
    'django.contrib.auth.backends.ModelBackend',
]

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

JAZZMIN_SETTINGS = {
    'site_title': 'VetSantaSofia Admin',
    'site_header': 'Veterinaria Santa Sofía',
    'site_brand': 'VetSantaSofia',
    'welcome_sign': 'Administración Clínica Veterinaria',
    'copyright': 'Veterinaria Santa Sofía',
    'site_logo': None,
    'login_logo': None,
    'site_icon': None,
    'show_sidebar': True,
    'navigation_expanded': True,
    'order_with_respect_to': ['agenda', 'clinica', 'pacientes', 'inventario', 'servicios', 'auth'],
    'hide_models': ['auth.permission', 'contenttypes.contenttype', 'admin.logentry', 'sessions.session'],
    'icons': {
        'agenda': 'fas fa-calendar-alt',
        'agenda.cita': 'fas fa-clock',
        'agenda.excepciondisponibilidad': 'fas fa-ban',
        'agenda.horariofijoveterinario': 'fas fa-calendar-day',
        'clinica': 'fas fa-stethoscope',
        'clinica.consulta': 'fas fa-notes-medical',
        'clinica.cirugia': 'fas fa-procedures',
        'clinica.hospitalizacion': 'fas fa-hospital',
        'clinica.altamedica': 'fas fa-file-medical',
        'clinica.documento': 'fas fa-file-medical-alt',
        'clinica.registrodiario': 'fas fa-clipboard-list',
        'pacientes': 'fas fa-paw',
        'pacientes.paciente': 'fas fa-dog',
        'pacientes.propietario': 'fas fa-user',
        'inventario': 'fas fa-boxes',
        'inventario.insumo': 'fas fa-pills',
        'servicios': 'fas fa-concierge-bell',
        'servicios.servicioveterinario': 'fas fa-briefcase-medical',
        'servicios.servicioinsumo': 'fas fa-syringe',
        'auth': 'fas fa-user-shield',
        'auth.group': 'fas fa-users-cog',
        'cuentas.customuser': 'fas fa-user-md',
        'admin.logentry': 'fas fa-history',
    },
    'default_icon_parents': 'fas fa-folder',
    'default_icon_children': 'fas fa-file',
    'changeform_format': 'horizontal_tabs',
    'changeform_format_overrides': {
        'auth.user': 'collapsible',
        'auth.group': 'vertical_tabs',
        'inventario.insumo': 'horizontal_tabs',
        'clinica.consulta': 'horizontal_tabs',
        'hospital.hospitalizacion': 'horizontal_tabs',
    },
    'show_ui_builder': True,
    'related_modal_active': False,
    'theme': 'litera',
    'use_google_fonts_cdn': True,
    'custom_css': 'css/base/jazzmin_fixes.css',
}

JAZZMIN_UI_TWEAKS = {
    'navbar_small_text': False,
    'footer_small_text': False,
    'body_small_text': False,
    'brand_small_text': False,
    'brand_colour': False,
    'accent': 'accent-primary',
    'navbar': 'navbar-white navbar-light',
    'no_navbar_border': False,
    'navbar_fixed': False,
    'layout_boxed': False,
    'footer_fixed': False,
    'sidebar_fixed': True,
    'sidebar': 'sidebar-dark-primary',
    'sidebar_nav_small_text': False,
    'sidebar_disable_expand': True,
    'sidebar_nav_child_indent': True,
    'sidebar_nav_compact_style': True,
    'sidebar_nav_legacy_style': True,
    'sidebar_nav_flat_style': True,
    'theme': 'litera',
    'dark_mode_theme': None,
    'button_classes': {
        'primary': 'btn-outline-primary',
        'secondary': 'btn-outline-secondary',
        'info': 'btn-info',
        'warning': 'btn-warning',
        'danger': 'btn-danger',
        'success': 'btn-success',
    },
}
