from django.db import models


class Caja(models.Model):
    fecha_caja = models.DateField()
    valor_total = models.IntegerField()
    valor_ins = models.FloatField()
    metodo_pago = models.CharField(max_length=50)

    def __str__(self):
        return f"Caja {self.id} - {self.fecha_caja}"
