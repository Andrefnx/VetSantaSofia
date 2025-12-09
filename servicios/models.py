from django.db import models

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


class ServicioInsumo(models.Model):
    servicio = models.ForeignKey('Servicio', on_delete=models.CASCADE, related_name='insumos_servicio')
    insumo = models.ForeignKey('inventario.Insumo', on_delete=models.CASCADE, related_name='servicios_insumo')
    cantidad = models.IntegerField(default=1, verbose_name="Cantidad")

    class Meta:
        unique_together = ('servicio', 'insumo')
        db_table = "ServicioInsumo"
        verbose_name = "Insumo del Servicio"
        verbose_name_plural = "Insumos de los Servicios"

    def __str__(self):
        return f"{self.servicio.nombre} → {self.cantidad} x {self.insumo.medicamento}"
