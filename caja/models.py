from django.db import models
from django.conf import settings
from django.utils import timezone


class Caja(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    fecha_apertura = models.DateTimeField(default=timezone.now)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    monto_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    monto_final = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Caja'
        verbose_name_plural = 'Cajas'
        ordering = ['-fecha_apertura']

    def __str__(self):
        return f"Caja {self.usuario.username} - {self.fecha_apertura.strftime('%d/%m/%Y %H:%M')}"

    @property
    def esta_abierta(self):
        return self.fecha_cierre is None


class MovimientoCaja(models.Model):
    TIPO_CHOICES = [
        ('ingreso', 'Ingreso'),
        ('egreso', 'Egreso'),
    ]

    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
        ('cheque', 'Cheque'),
        ('otro', 'Otro'),
    ]

    caja = models.ForeignKey(Caja, on_delete=models.CASCADE, related_name='movimientos')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    concepto = models.CharField(max_length=200)
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES, default='efectivo')
    descripcion = models.TextField(blank=True, null=True)
    fecha = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Movimiento de Caja'
        verbose_name_plural = 'Movimientos de Caja'
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.get_tipo_display()} - ${self.monto} - {self.concepto}"
