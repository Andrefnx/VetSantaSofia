from django.db import models
from hospital.models import Insumo

class Caja(models.Model):
    idCaja = models.AutoField(primary_key=True)
    fecha_caja = models.DateField()
    descripcion = models.CharField(max_length=200, null=True, blank=True)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2)
    veterinario = models.CharField(max_length=100)
    num_operacion = models.IntegerField(max_length=100, null=True, blank=True)
    metodo_pago = models.CharField(max_length=50, choices=[
        ('efectivo', 'Efectivo'),
        ('tarjetadeb', 'Debito'),
        ('tarjetacred', 'Credito'),
        ('transferencia', 'Transferencia')
    ])
    consulta = models.ForeignKey('consulta', on_delete=models.SET_NULL, null=True, blank=True)
    hospitalizacion = models.ForeignKey('hospitalizacion', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'Caja'

    @property #no modifica la base de datos
    def valor_ins(self):
        return sum(detalle.subtotal for detalle in self.detalles.all())

    def __str__(self):
        return f"Caja {self.id} - {self.fecha_caja}"
    
class DetalleCaja(models.Model):
    Caja = models.ForeignKey(Caja, on_delete=models.CASCADE, related_name='detalles')
    Insumo = models.ForeignKey(Insumo, on_delete=models.CASCADE)
    cantidad = models.IntergerField(default=1)

    @property
    def subtotal(self):
        return self.cantidad * self.Insumo.valor_unitario
    
    def __str__(self):
        return f"{self.Insumo.medicamento} x {self.cantidad}"