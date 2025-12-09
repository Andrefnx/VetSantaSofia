from django.db import models
from django.conf import settings
from pacientes.models import Paciente  # Cambiado de hospital.models import Mascota

class Cita(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('en_curso', 'En Curso'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
        ('no_asistio', 'No Asistió'),
    ]
    
    TIPO_CHOICES = [
        ('consulta', 'Consulta General'),
        ('vacunacion', 'Vacunación'),
        ('cirugia', 'Cirugía'),
        ('control', 'Control'),
        ('emergencia', 'Emergencia'),
        ('peluqueria', 'Peluquería'),
        ('otro', 'Otro'),
    ]
    
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='citas')
    veterinario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='citas_asignadas'
    )
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField(blank=True, null=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='consulta')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    motivo = models.TextField()
    notas = models.TextField(blank=True, null=True)
    recordatorio_enviado = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Cita'
        verbose_name_plural = 'Citas'
        ordering = ['fecha', 'hora_inicio']
        unique_together = ['veterinario', 'fecha', 'hora_inicio']
    
    def __str__(self):
        return f"Cita {self.paciente.nombre} - {self.fecha} {self.hora_inicio}"
