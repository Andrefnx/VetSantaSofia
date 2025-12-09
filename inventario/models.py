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
    TIPO_MOVIMIENTO_CHOICES = [
        ('entrada', 'Entrada de Stock'),
        ('salida', 'Salida de Stock'),  # ⭐ ASEGURAR que diga "Salida de Stock"
        ('venta', 'Venta'),
        ('consulta', 'Uso en Consulta'),
        ('hospitalizacion', 'Uso en Hospitalización'),
        ('ajuste_manual', 'Ajuste Manual'),
        ('devolucion', 'Devolución'),
        ('registro_inicial', 'Registro Inicial'),
    ]
    
    idInventario = models.AutoField(primary_key=True)
    medicamento = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, blank=True, null=True)
    especie = models.CharField(max_length=50, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    ml_contenedor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="ML en Contenedor")
    tipo = models.CharField(max_length=50, null=True, blank=True, verbose_name="Tipo de Producto")
    precio_venta = models.FloatField(default=0)
    stock_actual = models.IntegerField(default=0)
    precauciones = models.TextField(blank=True, null=True)
    contraindicaciones = models.TextField(blank=True, null=True)
    efectos_adversos = models.TextField(blank=True, null=True)
    dosis_ml = models.FloatField(blank=True, null=True)
    peso_kg = models.FloatField(blank=True, null=True)
    
    # Campos de trazabilidad
    fecha_creacion = models.DateTimeField(default=timezone.now, verbose_name="Fecha de Registro")
    ultimo_ingreso = models.DateTimeField(null=True, blank=True)
    ultimo_movimiento = models.DateTimeField(null=True, blank=True)
    tipo_ultimo_movimiento = models.CharField(
        max_length=20, 
        choices=TIPO_MOVIMIENTO_CHOICES, 
        null=True, 
        blank=True
    )
    usuario_ultimo_movimiento = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_insumos'
    )

    class Meta:
        db_table = "Insumo"
        ordering = ["medicamento"]

    def __str__(self):
        return self.medicamento
    
    def get_usuario_nombre_completo(self):
        """Retorna el nombre completo del usuario que realizó el último movimiento"""
        if self.usuario_ultimo_movimiento:
            try:
                # Usar la propiedad nombre_completo del modelo CustomUser
                return self.usuario_ultimo_movimiento.nombre_completo
            except AttributeError:
                # Fallback si no existe la propiedad
                try:
                    return f"{self.usuario_ultimo_movimiento.nombre} {self.usuario_ultimo_movimiento.apellido}".strip()
                except AttributeError:
                    return str(self.usuario_ultimo_movimiento)
        return "-"
    
