from django.db import models
from django.conf import settings
from django.utils import timezone
from pacientes.models import Paciente
from inventario.models import Insumo

class Consulta(models.Model):
    """Modelo para consultas veterinarias"""
    TIPO_CONSULTA_CHOICES = [
        ('consulta_general', 'Consulta general'),
        ('urgencia', 'Urgencia'),
        ('vacuna', 'Vacuna'),
        ('desparacitacion', 'Desparacitación'),
        ('control', 'Control'),
        ('cirugia', 'Cirugía'),
        ('otros', 'Otros'),
    ]
    
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='consultas')
    fecha = models.DateTimeField(default=timezone.now)
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    tipo_consulta = models.CharField(max_length=30, choices=TIPO_CONSULTA_CHOICES, default='consulta_general')
    temperatura = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    peso = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    frecuencia_cardiaca = models.IntegerField(null=True, blank=True)
    frecuencia_respiratoria = models.IntegerField(null=True, blank=True)
    otros = models.TextField(blank=True, null=True)
    diagnostico = models.TextField()
    tratamiento = models.TextField(blank=True)
    notas = models.TextField(blank=True)
    
    # ⭐ NUEVO: Relación ManyToMany con Insumos
    medicamentos = models.ManyToManyField(Insumo, blank=True, related_name='consultas_usadas')
    
    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Consulta'
        verbose_name_plural = 'Consultas'
    
    def __str__(self):
        return f"Consulta de {self.paciente.nombre} - {self.fecha.strftime('%d/%m/%Y')}"


class MedicamentoUtilizado(models.Model):
    """Medicamentos utilizados en una consulta"""
    consulta = models.ForeignKey(Consulta, on_delete=models.CASCADE, related_name='medicamentos_detalle')
    inventario_id = models.IntegerField(blank=True, null=True, help_text="ID del producto de inventario")
    nombre = models.CharField(max_length=200)
    dosis = models.CharField(max_length=100, blank=True, null=True)
    peso_paciente = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Medicamento Utilizado'
        verbose_name_plural = 'Medicamentos Utilizados'
    
    def __str__(self):
        return f"{self.nombre} - {self.dosis or 'Sin dosis'}"


class Hospitalizacion(models.Model):
    """Modelo para hospitalizaciones"""
    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('alta', 'Alta'),
        ('fallecido', 'Fallecido'),
    ]
    
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='hospitalizaciones')
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='hospitalizaciones_atendidas')
    fecha_ingreso = models.DateTimeField()
    fecha_alta = models.DateTimeField(blank=True, null=True)
    motivo = models.TextField()
    diagnostico_hosp = models.TextField(blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activa')
    observaciones = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-fecha_ingreso']
        verbose_name = 'Hospitalización'
        verbose_name_plural = 'Hospitalizaciones'
    
    def __str__(self):
        return f"Hospitalización de {self.paciente.nombre} - {self.fecha_ingreso.strftime('%d/%m/%Y')}"


class Cirugia(models.Model):
    """Modelo para cirugías dentro de una hospitalización"""
    RESULTADO_CHOICES = [
        ('exitosa', 'Exitosa'),
        ('parcial', 'Parcial'),
        ('problemas', 'Con problemas'),
    ]
    
    hospitalizacion = models.OneToOneField(Hospitalizacion, on_delete=models.CASCADE, related_name='cirugia', null=True, blank=True)
    fecha_cirugia = models.DateTimeField()
    veterinario_cirujano = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='cirugias_realizadas')
    tipo_cirugia = models.CharField(max_length=200)
    descripcion = models.TextField()
    duracion_minutos = models.IntegerField(blank=True, null=True)
    anestesiologo = models.CharField(max_length=100, blank=True)
    tipo_anestesia = models.CharField(max_length=100, blank=True)
    medicamentos = models.ManyToManyField(Insumo, blank=True, related_name='cirugias_usadas')
    complicaciones = models.TextField(blank=True)
    resultado = models.CharField(max_length=20, choices=RESULTADO_CHOICES, default='exitosa')
    
    class Meta:
        ordering = ['-fecha_cirugia']
        verbose_name = 'Cirugía'
        verbose_name_plural = 'Cirugías'
    
    def __str__(self):
        return f"{self.tipo_cirugia} - {self.fecha_cirugia.strftime('%d/%m/%Y')}"


class RegistroDiario(models.Model):
    """Registro diario durante hospitalización"""
    hospitalizacion = models.ForeignKey(Hospitalizacion, on_delete=models.CASCADE, related_name='registros_diarios')
    fecha_registro = models.DateTimeField()
    temperatura = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    peso = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    frecuencia_cardiaca = models.IntegerField(null=True, blank=True)
    frecuencia_respiratoria = models.IntegerField(null=True, blank=True)
    observaciones = models.TextField(blank=True)
    medicamentos = models.ManyToManyField(Insumo, blank=True, related_name='registros_usados')
    
    class Meta:
        ordering = ['-fecha_registro']
        verbose_name = 'Registro Diario'
        verbose_name_plural = 'Registros Diarios'
    
    def __str__(self):
        return f"Registro {self.hospitalizacion.paciente.nombre} - {self.fecha_registro.strftime('%d/%m/%Y')}"


class Alta(models.Model):
    """Resumen de alta médica"""
    hospitalizacion = models.OneToOneField(Hospitalizacion, on_delete=models.CASCADE, related_name='alta_medica')
    fecha_alta = models.DateTimeField()
    diagnostico_final = models.TextField()
    tratamiento_post_alta = models.TextField()
    recomendaciones = models.TextField()
    proxima_revision = models.DateField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Alta Médica'
        verbose_name_plural = 'Altas Médicas'
    
    def __str__(self):
        return f"Alta de {self.hospitalizacion.paciente.nombre} - {self.fecha_alta.strftime('%d/%m/%Y')}"


class Examen(models.Model):
    """Modelo para exámenes médicos"""
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='examenes')
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    fecha = models.DateField()
    tipo = models.CharField(max_length=100)
    resultado = models.TextField(blank=True, null=True)
    archivo = models.FileField(upload_to='examenes/', blank=True, null=True)
    
    class Meta:
        ordering = ['-fecha']
        verbose_name = 'Examen'
        verbose_name_plural = 'Exámenes'
    
    def __str__(self):
        return f"{self.tipo} - {self.paciente.nombre} ({self.fecha})"


class Documento(models.Model):
    """Modelo para documentos adjuntos"""
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='documentos')
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    archivo = models.FileField(upload_to='documentos/')
    fecha_subida = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-fecha_subida']
        verbose_name = 'Documento'
        verbose_name_plural = 'Documentos'
    
    def __str__(self):
        return f"{self.nombre} - {self.paciente.nombre}"