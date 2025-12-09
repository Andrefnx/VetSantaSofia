# hospital/models.py
from django.db import models
from gestion.models import Mascota
from django.utils import timezone
from django.conf import settings
from datetime import date
from dateutil.relativedelta import relativedelta

# ===========================
#   INVENTARIO (INSUMOS)
# ===========================
class Insumo(models.Model):
    idInventario = models.AutoField(primary_key=True)
    medicamento = models.CharField(max_length=255)
    stock_actual = models.IntegerField(default=0)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        db_table = 'inventario'
        managed = True  # Cambiado de False a True para que Django cree la tabla
    
    def __str__(self):
        return self.medicamento

# Comentar o eliminar ServicioInsumo si no es parte del inventario
# class ServicioInsumo(models.Model):
#     servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE)
#     insumo = models.ForeignKey(Insumo, on_delete=models.CASCADE)
#     cantidad = models.IntegerField()
#     
#     def __str__(self):
#         return f"{self.servicio.nombre} → {self.cantidad} x {self.insumo.medicamento}"
