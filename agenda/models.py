from django.db import models
from gestion.models import Mascota

class Agenda(models.Model):  # Modelo con mayúscula
    idMascota = models.ForeignKey(Mascota, on_delete=models.CASCADE)
    fecha_agenda = models.DateField()
    hora_agenda = models.TimeField()
    nombreMascota = models.CharField(max_length=100)
    nombre_apellido = models.CharField(max_length=100)
    telefono = models.IntegerField()
    razon = models.CharField(max_length=100)
    estado = models.CharField(
        max_length=20,
        choices=[
            ('pendiente', 'Pendiente'),
            ('confirmada', 'Confirmada'),
            ('cancelada', 'Cancelada'),
        ],
        default='pendiente'
    )
    def __str__(self):
        return self.nombreMascota

    class Meta:
        unique_together = ('nombreMascota', 'fecha_agenda', 'hora_agenda')