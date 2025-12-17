from django.apps import AppConfig


class ServiciosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'servicios'
    verbose_name = 'Servicios'
    
    def ready(self):
        """Importar signals cuando la app esté lista"""
        import servicios.signals
