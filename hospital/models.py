# hospital/models.py
from django.db import models
from gestion.models import Mascota
from django.utils import timezone
from django.conf import settings
from datetime import date
from dateutil.relativedelta import relativedelta

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

class Propietario(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Propietario"
        verbose_name_plural = "Propietarios"
        ordering = ['apellido', 'nombre']
    
    def __str__(self):
        return self.nombre_completo
    
    @property
    def nombre_completo(self):
        return f"{self.nombre} {self.apellido}".strip()

class Paciente(models.Model):
    SEXO_CHOICES = [
        ('M', 'Macho'),
        ('H', 'Hembra'),
    ]
    
    nombre = models.CharField(max_length=100)
    especie = models.CharField(max_length=50)
    raza = models.CharField(max_length=100, blank=True, null=True)
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES)
    color = models.CharField(max_length=50, blank=True, null=True)
    microchip = models.CharField(max_length=50, blank=True, null=True)
    
    # Campos de edad
    fecha_nacimiento = models.DateField(null=True, blank=True, verbose_name="Fecha de nacimiento")
    edad_anos = models.IntegerField(null=True, blank=True, verbose_name="Edad en años")
    edad_meses = models.IntegerField(null=True, blank=True, verbose_name="Edad en meses")
    
    ultimo_peso = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    propietario = models.ForeignKey('Propietario', on_delete=models.CASCADE, related_name='pacientes')
    
    # Campos de control
    activo = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_ultima_modificacion = models.DateTimeField(auto_now=True)
    
    fecha_ultimo_control = models.DateField(blank=True, null=True)
    
    class Meta:
        verbose_name = "Paciente"
        verbose_name_plural = "Pacientes"
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return f"{self.nombre} - {self.propietario.nombre_completo}"
    
    @property
    def edad_formateada(self):
        if self.fecha_nacimiento:
            hoy = date.today()
            edad = relativedelta(hoy, self.fecha_nacimiento)
            
            # Si tiene menos de 1 mes, mostrar días
            if edad.years == 0 and edad.months == 0:
                dias = (hoy - self.fecha_nacimiento).days
                return f"{dias} día{'s' if dias != 1 else ''}"
            # Si tiene menos de 1 año, mostrar meses y días
            elif edad.years == 0:
                if edad.days > 0:
                    return f"{edad.months} mes{'es' if edad.months != 1 else ''} y {edad.days} día{'s' if edad.days != 1 else ''}"
                return f"{edad.months} mes{'es' if edad.months != 1 else ''}"
            # Si tiene más de 1 año, mostrar años y meses
            else:
                if edad.months > 0:
                    return f"{edad.years} año{'s' if edad.years != 1 else ''} y {edad.months} mes{'es' if edad.months != 1 else ''}"
                return f"{edad.years} año{'s' if edad.years != 1 else ''}"
        elif self.edad_anos or self.edad_meses:
            partes = []
            if self.edad_anos:
                partes.append(f"{self.edad_anos} año{'s' if self.edad_anos != 1 else ''}")
            if self.edad_meses:
                partes.append(f"{self.edad_meses} mes{'es' if self.edad_meses != 1 else ''}")
            return " y ".join(partes) + " (estimado)"
        return "No especificada"
    
    @property
    def ultimo_peso_formateado(self):
        """Retorna el último peso con unidad"""
        return f"{self.ultimo_peso} kg" if self.ultimo_peso else "No registrado"



class Consulta(models.Model):
    paciente = models.ForeignKey('Paciente', on_delete=models.CASCADE, related_name='consultas')
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='consultas_realizadas')

    
    # Fecha y hora
    fecha = models.DateTimeField(auto_now_add=True)
    
    # Datos fisiológicos
    temperatura = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True, help_text="°C")
    peso = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True, help_text="kg")
    frecuencia_cardiaca = models.IntegerField(blank=True, null=True, help_text="latidos/min")
    frecuencia_respiratoria = models.IntegerField(blank=True, null=True, help_text="respiraciones/min")
    otros_signos = models.TextField(blank=True, null=True)
    
    # Información clínica
    motivo_consulta = models.TextField()
    diagnostico = models.TextField(blank=True, null=True)
    tratamiento = models.TextField(blank=True, null=True)
    examenes = models.TextField(blank=True, null=True)
    notas = models.TextField(blank=True, null=True)
    recomendaciones = models.TextField(blank=True, null=True)
    
    # Seguimiento
    proxima_cita = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Consulta'
        verbose_name_plural = 'Consultas'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"Consulta {self.paciente.nombre} - {self.fecha.strftime('%d/%m/%Y')}"


class Examen(models.Model):
    paciente = models.ForeignKey('Paciente', on_delete=models.CASCADE, related_name='examenes')
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    fecha = models.DateTimeField(auto_now_add=True)
    tipo = models.CharField(max_length=100, help_text="Ej: Hemograma, Radiografía")
    resultado = models.TextField()
    archivo = models.FileField(upload_to='examenes/', blank=True, null=True)
    
    class Meta:
        verbose_name = 'Examen'
        verbose_name_plural = 'Exámenes'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.tipo} - {self.paciente.nombre} - {self.fecha.strftime('%d/%m/%Y')}"

class Documento(models.Model):
    """Modelo para documentos del paciente"""
    paciente = models.ForeignKey('Paciente', on_delete=models.CASCADE, related_name='documentos')
    
    nombre = models.CharField(max_length=200)
    archivo = models.FileField(upload_to='documentos/')
    fecha_subida = models.DateTimeField(auto_now_add=True)
    descripcion = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Documento'
        verbose_name_plural = 'Documentos'
        ordering = ['-fecha_subida']
    
    def __str__(self):
        return f"{self.nombre} - {self.paciente.nombre}"