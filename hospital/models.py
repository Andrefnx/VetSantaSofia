# hospital/models.py
from django.db import models
from gestion.models import Mascota

class Insumo(models.Model):
    idInventario = models.AutoField(primary_key=True)
    medicamento = models.CharField(max_length=100)  # Usar 'medicamento' como nombre principal
    categoria = models.CharField(max_length=50, blank=True, null=True)
    sku = models.CharField(max_length=50, blank=True, null=True)
    codigo_barra = models.CharField(max_length=50, blank=True, null=True)
    presentacion = models.CharField(max_length=50, blank=True, null=True)
    especie = models.CharField(max_length=50, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    unidad_medida = models.CharField(max_length=20, blank=True, null=True)
    precio_compra = models.FloatField(blank=True, null=True)
    precio_venta = models.FloatField(blank=True, null=True)
    margen = models.FloatField(blank=True, null=True)
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=0)
    stock_maximo = models.IntegerField(default=0)
    almacenamiento = models.CharField(max_length=100, blank=True, null=True)
    precauciones = models.TextField(blank=True, null=True)
    contraindicaciones = models.TextField(blank=True, null=True)
    efectos_adversos = models.TextField(blank=True, null=True)
    dosis_ml = models.FloatField(default=0)
    peso_kg = models.FloatField(default=1) 


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

class Servicio(models.Model):
    idServicio = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    categoria = models.CharField(max_length=100)
    precio = models.PositiveIntegerField(default=0)
    duracion = models.PositiveIntegerField(default=0)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    insumos = models.ManyToManyField(
        'Insumo',
        through='ServicioInsumo',
        related_name='servicios'
    )

    def __str__(self):
        return self.nombre


class ServicioInsumo(models.Model):
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE)
    insumo = models.ForeignKey(Insumo, on_delete=models.CASCADE)

    cantidad = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('servicio', 'insumo')

    def __str__(self):
        return f"{self.servicio.nombre} → {self.cantidad} x {self.insumo.medicamento}"
