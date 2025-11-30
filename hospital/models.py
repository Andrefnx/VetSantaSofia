# hospital/models.py
from django.db import models
from gestion.models import Mascota
from django.utils import timezone

class Hospitalizacion(models.Model):
    idHospitalizacion = models.AutoField(primary_key=True)
    idMascota = models.ForeignKey(Mascota, on_delete=models.CASCADE)
    idIns = models.ForeignKey('Insumo', on_delete=models.CASCADE)  # <-- Pon el nombre entre comillas
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


# ===========================
#   INVENTARIO (INSUMOS)
# ===========================
class Insumo(models.Model):
    idInventario = models.AutoField(primary_key=True)
    medicamento = models.CharField(max_length=200)
    categoria = models.CharField(max_length=100, blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    codigo_barra = models.CharField(max_length=100, blank=True, null=True)
    presentacion = models.CharField(max_length=150, blank=True, null=True)
    especie = models.CharField(max_length=50, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    unidad_medida = models.CharField(max_length=50, blank=True, null=True)
    precio_venta = models.FloatField(default=0)
    margen = models.FloatField(default=0)
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=0)
    stock_maximo = models.IntegerField(default=0)
    almacenamiento = models.TextField(blank=True, null=True)
    precauciones = models.TextField(blank=True, null=True)
    contraindicaciones = models.TextField(blank=True, null=True)
    efectos_adversos = models.TextField(blank=True, null=True)
    dosis_ml = models.FloatField(blank=True, null=True)
    peso_kg = models.FloatField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "Insumo"
        ordering = ["medicamento"]

    def __str__(self):
        return self.medicamento


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

# ===========================
#   RELACIÓN SERVICIO - INSUMO
# ===========================
class ServicioInsumo(models.Model):
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE)
    insumo = models.ForeignKey(Insumo, on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=1)

    class Meta:
        unique_together = ('servicio', 'insumo')
        db_table = "ServicioInsumo"

    def __str__(self):
        return f"{self.servicio.nombre} → {self.cantidad} x {self.insumo.medicamento}"

class Paciente(models.Model):
    ESPECIE_CHOICES = [
        ('canino', 'Canino'),
        ('felino', 'Felino'),
        ('otro', 'Otro'),
    ]
    
    SEXO_CHOICES = [
        ('macho', 'Macho'),
        ('hembra', 'Hembra'),
    ]
    
    nombre = models.CharField(max_length=100)
    especie = models.CharField(max_length=20, choices=ESPECIE_CHOICES)
    raza = models.CharField(max_length=100, blank=True, null=True)
    edad = models.CharField(max_length=50, blank=True, null=True)
    sexo = models.CharField(max_length=10, choices=SEXO_CHOICES)
    propietario = models.ForeignKey('Propietario', on_delete=models.CASCADE, related_name='pacientes')
    fecha_registro = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Paciente'
        verbose_name_plural = 'Pacientes'
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return f"{self.nombre} - {self.propietario.nombre_completo}"

class Propietario(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Propietario'
        verbose_name_plural = 'Propietarios'
    
    @property
    def nombre_completo(self):
        return f"{self.nombre} {self.apellido}"
    
    def __str__(self):
        return self.nombre_completo