from django.db import models
from pacientes.models import Paciente

class Hospitalizacion(models.Model):
    ESTADO_CHOICES = [
        ('ingresado', 'Ingresado'),
        ('en_tratamiento', 'En Tratamiento'),
        ('recuperacion', 'En Recuperación'),
        ('alta', 'Alta'),
    ]
    
    idMascota = models.ForeignKey(Paciente, on_delete=models.CASCADE)
    fecha_ingreso = models.DateTimeField(auto_now_add=True)
    fecha_alta = models.DateTimeField(null=True, blank=True)
    motivo = models.TextField()
    diagnostico = models.TextField(blank=True, null=True)
    tratamiento = models.TextField(blank=True, null=True)
    estado_hosp = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ingresado')
    observaciones = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Hospitalización'
        verbose_name_plural = 'Hospitalizaciones'
        ordering = ['-fecha_ingreso']
    
    def __str__(self):
        return f"Hospitalización {self.idMascota.nombre} - {self.fecha_ingreso.strftime('%d/%m/%Y')}"