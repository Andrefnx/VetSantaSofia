from django.db import models
from django.conf import settings

# Create your models here.

class Consulta(models.Model):
    paciente = models.ForeignKey('pacientes.Paciente', on_delete=models.CASCADE, related_name='consultas')
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='consultas_realizadas')
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
    proxima_cita = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Consulta'
        verbose_name_plural = 'Consultas'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"Consulta {self.paciente.nombre} - {self.fecha.strftime('%d/%m/%Y')}"


class Examen(models.Model):
    paciente = models.ForeignKey('pacientes.Paciente', on_delete=models.CASCADE, related_name='examenes')
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
    paciente = models.ForeignKey('pacientes.Paciente', on_delete=models.CASCADE, related_name='documentos')
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