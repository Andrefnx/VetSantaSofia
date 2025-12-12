from django.apps import AppConfig


class ClinicaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'clinica'
    
    def ready(self):
        """Importa las signals cuando la app esté lista"""
        import clinica.signals
