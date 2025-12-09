# hospital/models.py
from django.db import models
from gestion.models import Mascota
from django.utils import timezone
from django.conf import settings
from datetime import date
from dateutil.relativedelta import relativedelta

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

