from django.apps import AppConfig


class HistorialConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'historial'
    verbose_name = 'Sistema de Auditoría y Trazabilidad'
    
    def ready(self):
        """Importar signals cuando la app esté lista"""
        # Los signals se importarán en la siguiente fase
        pass
