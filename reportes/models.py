from django.db import models
from django.conf import settings
from django.utils import timezone


class ReporteGenerado(models.Model):
    """Registro de reportes generados con sus archivos Excel"""
    TIPO_CHOICES = [
        ('inventario', 'Inventario'),
        ('caja', 'Caja'),
        ('clinica', 'Clínica'),
        ('hospitalizacion', 'Hospitalización'),
        ('servicios', 'Servicios'),
    ]
    
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    fecha_generacion = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    # Filtros aplicados (formato JSON)
    filtros = models.JSONField(default=dict, blank=True)
    
    # Archivo Excel generado
    archivo = models.FileField(upload_to='reportes/excel/', null=True, blank=True)
    
    # Estadísticas
    total_registros = models.IntegerField(default=0)
    
    class Meta:
        verbose_name = 'Reporte Generado'
        verbose_name_plural = 'Reportes Generados'
        ordering = ['-fecha_generacion']
    
    def __str__(self):
        return f"{self.get_tipo_display()} - {self.fecha_generacion.strftime('%d/%m/%Y %H:%M')} - {self.usuario.nombre if self.usuario else 'N/A'}"
