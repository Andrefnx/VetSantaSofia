from django.db import models
from django.core.exceptions import ValidationError
from inventario.models import Insumo

# Create your models here.

# ===========================
#   SERVICIOS
# ===========================

class Servicio(models.Model):
    idServicio = models.AutoField(primary_key=True)

    nombre = models.CharField(
        max_length=150,
        verbose_name="Nombre del Servicio"
    )

    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción"
    )

    categoria = models.CharField(
        max_length=100,
        verbose_name="Categoría"
    )

    precio = models.PositiveIntegerField(
        default=0,
        verbose_name="Precio del Servicio"
    )

    duracion = models.PositiveIntegerField(
        default=0,
        verbose_name="Duración (minutos)"
    )

    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Registro"
    )

    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )

    class Meta:
        db_table = "Servicio"
        verbose_name = "Servicio Veterinario"
        verbose_name_plural = "Servicios Veterinarios"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

    def clean(self):
        super().clean()
        if self.duracion <= 0:
            raise ValidationError('La duración debe ser mayor a 0 minutos.')
        if self.duracion % 15 != 0:
            raise ValidationError('La duración debe ser múltiplo de 15 minutos.')

    @property
    def blocks_required(self) -> int:
        """Cantidad de bloques de 15 min necesarios para este servicio."""
        return (self.duracion + 14) // 15 if self.duracion else 1


class ServicioInsumo(models.Model):
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE)
    insumo = models.ForeignKey(Insumo, on_delete=models.PROTECT)  # Proteger insumos de eliminación accidental
    cantidad = models.IntegerField()

    class Meta:
        db_table = 'servicio_insumo'

    def __str__(self):
        return f"{self.servicio.nombre} → {self.cantidad} x {self.insumo.medicamento}"
