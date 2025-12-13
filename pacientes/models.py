# hospital/models.py
from django.db import models
from django.contrib.auth import get_user_model
from datetime import date
from dateutil.relativedelta import relativedelta

User = get_user_model()

class Propietario(models.Model):
    """Modelo para los dueños de mascotas"""
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Propietario'
        verbose_name_plural = 'Propietarios'
        ordering = ['apellido', 'nombre']
    
    def __str__(self):
        return f"{self.nombre} {self.apellido}"
    
    @property
    def nombre_completo(self):
        return f"{self.nombre} {self.apellido}"


class Paciente(models.Model):
    """Modelo para las mascotas/pacientes"""
    ESPECIE_CHOICES = [
        ('perro', 'Perro'),
        ('gato', 'Gato'),
        ('otro', 'Otro'),
    ]
    
    SEXO_CHOICES = [
        ('M', 'Macho'),
        ('H', 'Hembra'),
    ]
    
    nombre = models.CharField(max_length=100)
    especie = models.CharField(max_length=20, choices=ESPECIE_CHOICES)
    raza = models.CharField(max_length=100, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES)
    
    # Edad
    fecha_nacimiento = models.DateField(blank=True, null=True)
    edad_anos = models.IntegerField(blank=True, null=True)
    edad_meses = models.IntegerField(blank=True, null=True)
    
    microchip = models.CharField(max_length=50, blank=True, null=True, unique=True)
    ultimo_peso = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    
    # ⭐ ANTECEDENTES MÉDICOS CRÍTICOS
    alergias = models.TextField(blank=True, null=True, help_text="Ej: alergia al pollo, penicilina")
    enfermedades_cronicas = models.TextField(blank=True, null=True, help_text="Ej: diabetes, artritis")
    medicamentos_actuales = models.TextField(blank=True, null=True, help_text="Medicamentos que está tomando actualmente")
    cirugia_previa = models.TextField(blank=True, null=True, help_text="Cirugías previas realizadas")
    
    propietario = models.ForeignKey(Propietario, on_delete=models.CASCADE, related_name='mascotas')
    activo = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Paciente'
        verbose_name_plural = 'Pacientes'
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return f"{self.nombre} ({self.get_especie_display()})"
    
    @property
    def edad_formateada(self):
        """Retorna la edad formateada según disponibilidad de datos"""
        if self.fecha_nacimiento:
            hoy = date.today()
            delta = relativedelta(hoy, self.fecha_nacimiento)
            
            if delta.years > 0 and delta.months > 0:
                return f"{delta.years} año{'s' if delta.years != 1 else ''} y {delta.months} mes{'es' if delta.months != 1 else ''}"
            elif delta.years > 0:
                return f"{delta.years} año{'s' if delta.years != 1 else ''}"
            elif delta.months > 0:
                return f"{delta.months} mes{'es' if delta.months != 1 else ''}"
            else:
                return f"{delta.days} día{'s' if delta.days != 1 else ''}"
        elif self.edad_anos is not None:
            texto = f"{self.edad_anos} año{'s' if self.edad_anos != 1 else ''}"
            if self.edad_meses:
                texto += f" y {self.edad_meses} mes{'es' if self.edad_meses != 1 else ''}"
            return f"~{texto} (estimado)"
        return "No especificada"

