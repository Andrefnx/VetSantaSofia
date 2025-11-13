# hospital/models.py
from django.db import models
from gestion.models import Mascota

from django.db import models
from gestion.models import Mascota

class Insumo(models.Model):
    idIns = models.AutoField(primary_key=True)
    medicamento = models.CharField(max_length=100)
    dosis = models.FloatField()
    valor_unitario = models.FloatField()
    cantidad = models.IntegerField()

    def __str__(self):
        return self.medicamento

class Hospitalizacion(models.Model):
    idHospitalizacion = models.AutoField(primary_key=True)
    idMascota = models.ForeignKey(Mascota, on_delete=models.CASCADE)
    idIns = models.ForeignKey(Insumo, on_delete=models.CASCADE)
    fecha_ingreso = models.DateField()
    fecha_egreso = models.DateField()
    motivo_hospitalizacion = models.TextField()
    tratamiento = models.TextField()
    telefono = models.CharField(max_length=15)
    notas = models.TextField()
    estado_hosp = models.CharField(
        max_length=20,
        choices=[
            ('ingresado', 'Ingresado'),
            ('egresado', 'Egresado'),
            ('en tratamiento', 'En Tratamiento'),
            ('llamar duenio', 'Llamar Dueño'),
            ('alta', 'Alta'),
        ],
        default='ingresado'
    )

    def __str__(self):
        return f"Hospitalización {self.idHospitalizacion} - {self.idMascota.nombreMascota}"
