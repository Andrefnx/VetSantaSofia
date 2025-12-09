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
    
    FORMATO_CHOICES = [
        ('liquido', 'Líquido'),
        ('pastilla', 'Pastilla'),
        ('pipeta', 'Pipeta'),
        ('inyectable', 'Inyectable'),
        ('polvo', 'Polvo'),
        ('crema', 'Crema'),
        ('otro', 'Otro'),
    ]
    
    idInventario = models.AutoField(primary_key=True)
    medicamento = models.CharField(max_length=255)
    marca = models.CharField(max_length=100, blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    tipo = models.CharField(max_length=100, blank=True, null=True)
    formato = models.CharField(max_length=50, choices=FORMATO_CHOICES, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    especie = models.CharField(max_length=100, blank=True, null=True)
    
    stock_actual = models.IntegerField(default=0)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Campos para dosis - MEJORADOS
    # Para líquidos
    dosis_ml = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Dosis en ml (para líquidos)")
    ml_contenedor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="ML por contenedor")
    
    # Para pastillas
    cantidad_pastillas = models.IntegerField(null=True, blank=True, help_text="Cantidad de pastillas")
    
    # Para pipetas
    unidades_pipeta = models.IntegerField(null=True, blank=True, help_text="Unidades de pipeta")
    
    # Peso de referencia (común para todos)
    peso_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Peso de referencia en kg")
    
    # Rango de peso
    tiene_rango_peso = models.BooleanField(default=False, help_text="¿Tiene rango de peso específico?")
    peso_min_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Peso mínimo en kg")
    peso_max_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Peso máximo en kg")
    
    # Campos informativos
    precauciones = models.TextField(blank=True, null=True)
    contraindicaciones = models.TextField(blank=True, null=True)
    efectos_adversos = models.TextField(blank=True, null=True)
    
    # Campos de seguimiento
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
    
    def get_dosis_display(self):
        """Retorna la dosis formateada según el formato del producto"""
        if not self.formato:
            return "-"
        
        # Rango de peso
        rango_peso = ""
        if self.tiene_rango_peso and self.peso_min_kg and self.peso_max_kg:
            rango_peso = f" ({self.peso_min_kg}-{self.peso_max_kg} kg)"
        elif self.peso_kg:
            rango_peso = f" por {self.peso_kg} kg"
        
        if self.formato == 'liquido' and self.dosis_ml:
            return f"{self.dosis_ml} ml{rango_peso}"
        elif self.formato == 'pastilla' and self.cantidad_pastillas:
            pastilla_texto = "pastilla" if self.cantidad_pastillas == 1 else "pastillas"
            return f"{self.cantidad_pastillas} {pastilla_texto}{rango_peso}"
        elif self.formato == 'pipeta' and self.unidades_pipeta:
            unidad_texto = "unidad" if self.unidades_pipeta == 1 else "unidades"
            return f"{self.unidades_pipeta} {unidad_texto}{rango_peso}"
        elif self.formato == 'inyectable' and self.dosis_ml:
            return f"{self.dosis_ml} ml{rango_peso}"
        
        return "-"
