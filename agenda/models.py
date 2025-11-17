from django.db import models
from django.contrib.auth import get_user_model
from hospital.models import Mascota  # Cambia si tu app tiene otro nombre

User = get_user_model()

class Cita(models.Model):
    TIPO_CHOICES = [
        ('consulta', 'Consulta general'),
        ('vacunacion', 'Vacunación'),
        ('control', 'Control'),
        ('procedimiento', 'Procedimiento'),
    ]

    mascota = models.ForeignKey(Mascota, on_delete=models.CASCADE)
    veterinario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    fecha = models.DateField()
    hora = models.TimeField()
    duracion = models.IntegerField(default=30)  # minutos
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)

    notas = models.TextField(blank=True, null=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha', 'hora']

    def __str__(self):
        return f"{self.mascota.nombre} - {self.fecha} {self.hora}"
