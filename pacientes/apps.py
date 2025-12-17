from django.apps import AppConfig


class PacientesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pacientes'
    verbose_name = 'Pacientes'
    
    def ready(self):
        """Importar signals cuando la app esté lista"""
        import pacientes.signals
