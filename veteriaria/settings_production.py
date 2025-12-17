"""
Django settings for veteriaria project - PRODUCTION

Optimizado para deployment en Render.com
"""

from pathlib import Path
import os
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# ==============================================================================
# SECURITY SETTINGS
# ==============================================================================

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise ValueError("⚠️  SECRET_KEY no está configurada en las variables de entorno")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

# Hosts permitidos
ALLOWED_HOSTS = os.getenv(
    "ALLOWED_HOSTS",
    "localhost,127.0.0.1,.onrender.com"
).split(",")

# Configuraciones de seguridad para producción
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000  # 1 año
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    X_FRAME_OPTIONS = 'DENY'

# CSRF Trusted Origins para Render
CSRF_TRUSTED_ORIGINS = [
    'https://*.onrender.com',
]
# Agregar dominios personalizados si existen
if os.getenv('CUSTOM_DOMAIN'):
    CSRF_TRUSTED_ORIGINS.append(f"https://{os.getenv('CUSTOM_DOMAIN')}")


# ==============================================================================
# APPLICATION DEFINITION
# ==============================================================================

INSTALLED_APPS = [
    'jazzmin',
    
    'admin_tools_stats',
    'django_nvd3',
    
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'django_extensions',
    'historial',  # Sistema de auditoría y trazabilidad
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
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Whitenoise para archivos estáticos
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'historial.middleware.CurrentUserMiddleware',  # Captura el usuario actual para signals
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'veteriaria.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates',
            BASE_DIR / 'dashboard' / 'templates',
        ],
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


# ==============================================================================
# DATABASE
# ==============================================================================

# Configuración de base de datos con dj-database-url
# Render proporciona automáticamente DATABASE_URL
DATABASES = {
    'default': dj_database_url.config(
        default=os.getenv('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Fallback manual si DATABASE_URL no existe (no debería pasar en Render)
if not os.getenv('DATABASE_URL'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME'),
            'USER': os.getenv('DB_USER'),
            'PASSWORD': os.getenv('DB_PASSWORD'),
            'HOST': os.getenv('DB_HOST'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }


# ==============================================================================
# PASSWORD VALIDATION
# ==============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ==============================================================================
# INTERNATIONALIZATION
# ==============================================================================

LANGUAGE_CODE = 'es-cl'
TIME_ZONE = 'America/Santiago'
USE_I18N = True
USE_TZ = True
APPEND_SLASH = True


# ==============================================================================
# STATIC FILES (CSS, JavaScript, Images)
# ==============================================================================

STATIC_URL = '/static/'

STATICFILES_DIRS = [
    BASE_DIR / 'static',
    BASE_DIR / 'agenda' / 'Static',
]

STATIC_ROOT = BASE_DIR / 'staticfiles'

# Whitenoise configuration for production
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}


# ==============================================================================
# MEDIA FILES
# ==============================================================================

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# ==============================================================================
# AUTHENTICATION
# ==============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'cuentas.CustomUser'

LOGIN_URL = 'login'
LOGIN_REDIRECT_URL = '/dashboard/'
LOGOUT_REDIRECT_URL = 'login'

AUTHENTICATION_BACKENDS = [
    'cuentas.backends.RutBackend',
    'django.contrib.auth.backends.ModelBackend',
]


# ==============================================================================
# JAZZMIN CONFIGURATION
# ==============================================================================

JAZZMIN_SETTINGS = {
    "site_title": "VetSantaSofia Admin",
    "site_header": "Veterinaria Santa Sofía",
    "site_brand": "VetSantaSofia",
    "welcome_sign": "Administración Clínica Veterinaria",
    "copyright": "Veterinaria Santa Sofía",
    "site_logo": None,
    "login_logo": None,
    "site_icon": None,
    "show_sidebar": True,
    "navigation_expanded": True,
    "order_with_respect_to": [
        "agenda",
        "clinica",
        "pacientes",
        "inventario",
        "servicios",
        "auth",
    ],
    "hide_models": [
        "auth.permission",
        "contenttypes.contenttype",
        "admin.logentry",
        "sessions.session",
    ],
    "icons": {
        "agenda": "fas fa-calendar-alt",
        "agenda.cita": "fas fa-clock",
        "agenda.excepciondisponibilidad": "fas fa-ban",
        "agenda.horariofijoveterinario": "fas fa-calendar-day",
        "clinica": "fas fa-stethoscope",
        "clinica.consulta": "fas fa-notes-medical",
        "clinica.cirugia": "fas fa-procedures",
        "clinica.hospitalizacion": "fas fa-hospital",
        "clinica.altamedica": "fas fa-file-medical",
        "clinica.documento": "fas fa-file-medical-alt",
        "clinica.registrodiario": "fas fa-clipboard-list",
        "pacientes": "fas fa-paw",
        "pacientes.paciente": "fas fa-dog",
        "pacientes.propietario": "fas fa-user",
        "inventario": "fas fa-boxes",
        "inventario.insumo": "fas fa-pills",
        "servicios": "fas fa-concierge-bell",
        "servicios.servicioveterinario": "fas fa-briefcase-medical",
        "servicios.servicioinsumo": "fas fa-syringe",
        "auth": "fas fa-user-shield",
        "auth.group": "fas fa-users-cog",
        "cuentas.customuser": "fas fa-user-md",
        "admin.logentry": "fas fa-history",
    },
    "default_icon_parents": "fas fa-folder",
    "default_icon_children": "fas fa-file",
    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {
        "auth.user": "collapsible",
        "auth.group": "vertical_tabs",
        "inventario.insumo": "horizontal_tabs",
        "clinica.consulta": "horizontal_tabs",
        "hospital.hospitalizacion": "horizontal_tabs",
    },
    "show_ui_builder": False,  # Deshabilitado en producción
    "related_modal_active": False,
    "theme": "litera",
    "use_google_fonts_cdn": True,
    "custom_css": "css/base/jazzmin_fixes.css",
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": False,
    "accent": "accent-primary",
    "navbar": "navbar-white navbar-light",
    "no_navbar_border": False,
    "navbar_fixed": False,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": True,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": True,
    "sidebar_nav_legacy_style": True,
    "sidebar_nav_flat_style": True,
    "theme": "litera",
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-outline-primary",
        "secondary": "btn-outline-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success"
    }
}


# ==============================================================================
# LOGGING CONFIGURATION
# ==============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}


# ==============================================================================
# EMAIL CONFIGURATION (Opcional - configurar si usas email)
# ==============================================================================

if os.getenv('EMAIL_HOST'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
    DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'


# ==============================================================================
# PERFORMANCE & CACHING (Opcional)
# ==============================================================================

# Session configuration
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_AGE = 86400  # 24 horas
SESSION_SAVE_EVERY_REQUEST = False


# ==============================================================================
# DEBUG INFO
# ==============================================================================

if DEBUG:
    print("⚠️  WARNING: DEBUG está activado en producción!")
    print(f"📍 ALLOWED_HOSTS: {ALLOWED_HOSTS}")
    print(f"🔐 CSRF_TRUSTED_ORIGINS: {CSRF_TRUSTED_ORIGINS}")
