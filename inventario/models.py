# hospital/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone

class Insumo(models.Model):
    TIPO_MOVIMIENTO_CHOICES = [
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
        ('registro_inicial', 'Registro Inicial'),
    ]
    
    idInventario = models.AutoField(primary_key=True)
    medicamento = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True, null=True)
    tipo = models.CharField(max_length=100, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    especie = models.CharField(max_length=100, blank=True, null=True)
    
    stock_actual = models.IntegerField(default=0)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Campos para dosis
    dosis_ml = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Dosis en ml")
    peso_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Peso de referencia en kg")
    ml_contenedor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="ML por contenedor")
    
    # Campos informativos
    precauciones = models.TextField(blank=True, null=True)
    contraindicaciones = models.TextField(blank=True, null=True)
    efectos_adversos = models.TextField(blank=True, null=True)
    
    # Campos de seguimiento - TODOS NULLABLE
    fecha_creacion = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    ultimo_ingreso = models.DateTimeField(null=True, blank=True)
    ultimo_movimiento = models.DateTimeField(null=True, blank=True)
    tipo_ultimo_movimiento = models.CharField(max_length=20, choices=TIPO_MOVIMIENTO_CHOICES, null=True, blank=True)
    usuario_ultimo_movimiento = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'inventario'
        verbose_name = 'Insumo'
        verbose_name_plural = 'Insumos'
        ordering = ['medicamento']
    
    def __str__(self):
        return self.medicamento
    
    def get_usuario_nombre_completo(self):
        if self.usuario_ultimo_movimiento:
            return f"{self.usuario_ultimo_movimiento.nombre} {self.usuario_ultimo_movimiento.apellido}"
        return "(sin registro)"
