from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from pacientes.models import Paciente  # Cambiado de hospital.models import Mascota
from servicios.models import Servicio
from datetime import datetime, timedelta, time


class HorarioFijoVeterinario(models.Model):
    """
    Modelo para definir el horario fijo semanal de cada veterinario.
    Define bloques horarios que se repiten cada semana.
    """
    DIAS_SEMANA = [
        (0, 'Lunes'),
        (1, 'Martes'),
        (2, 'Miércoles'),
        (3, 'Jueves'),
        (4, 'Viernes'),
        (5, 'Sábado'),
        (6, 'Domingo'),
    ]
    
    veterinario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='horarios_fijos',
        limit_choices_to={'rol': 'veterinario'}
    )
    dia_semana = models.IntegerField(choices=DIAS_SEMANA)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    activo = models.BooleanField(default=True)
    notas = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Horario Fijo de Veterinario'
        verbose_name_plural = 'Horarios Fijos de Veterinarios'
        ordering = ['veterinario', 'dia_semana', 'hora_inicio']
        unique_together = ['veterinario', 'dia_semana', 'hora_inicio']
        indexes = [
            models.Index(fields=['veterinario', 'dia_semana']),
        ]
    
    def __str__(self):
        return f"{self.veterinario.nombre} - {self.get_dia_semana_display()} {self.hora_inicio}-{self.hora_fin}"
    
    def clean(self):
        if self.hora_inicio >= self.hora_fin:
            raise ValidationError('La hora de inicio debe ser anterior a la hora de fin')


class DisponibilidadVeterinario(models.Model):
    """
    Modelo para gestionar excepciones al horario fijo.
    Permite definir vacaciones, licencias y ausencias específicas.
    """
    TIPO_CHOICES = [
        ('vacaciones', 'Vacaciones'),
        ('licencia', 'Licencia'),
        ('ausencia', 'Ausencia'),
        ('disponible_extra', 'Disponibilidad Extra'),
    ]
    
    veterinario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='disponibilidades',
        limit_choices_to={'rol': 'veterinario'}
    )
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='vacaciones')
    notas = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Excepción de Disponibilidad'
        verbose_name_plural = 'Excepciones de Disponibilidad'
        ordering = ['fecha', 'hora_inicio']
        indexes = [
            models.Index(fields=['veterinario', 'fecha']),
            models.Index(fields=['fecha', 'tipo']),
        ]
    
    def clean(self):
        """Validaciones del modelo"""
        if self.hora_inicio and self.hora_fin:
            if self.hora_inicio >= self.hora_fin:
                raise ValidationError('La hora de inicio debe ser menor que la hora de fin')
        
        # Verificar solapamiento de disponibilidades para el mismo veterinario
        if self.veterinario_id and self.fecha:
            disponibilidades_existentes = DisponibilidadVeterinario.objects.filter(
                veterinario=self.veterinario,
                fecha=self.fecha
            )
            if self.pk:
                disponibilidades_existentes = disponibilidades_existentes.exclude(pk=self.pk)
            
            for disp in disponibilidades_existentes:
                # Verificar solapamiento
                if (self.hora_inicio < disp.hora_fin and self.hora_fin > disp.hora_inicio):
                    raise ValidationError(
                        f'Ya existe una disponibilidad para este veterinario que se solapa '
                        f'con el horario {disp.hora_inicio.strftime("%H:%M")} - {disp.hora_fin.strftime("%H:%M")}'
                    )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.veterinario.nombre} {self.veterinario.apellido} - {self.fecha} ({self.get_tipo_display()})"


class Cita(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('en_curso', 'En Curso'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
        ('no_asistio', 'No Asistió'),
    ]
    
    TIPO_CHOICES = [
        ('consulta', 'Consulta General'),
        ('vacunacion', 'Vacunación'),
        ('cirugia', 'Cirugía'),
        ('control', 'Control'),
        ('emergencia', 'Emergencia'),
        ('peluqueria', 'Peluquería'),
        ('otro', 'Otro'),
    ]
    
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='citas')
    veterinario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='citas_asignadas',
        limit_choices_to={'rol': 'veterinario'}
    )
    servicio = models.ForeignKey(
        Servicio,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='citas',
        help_text='Servicio asociado a la cita'
    )
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField(blank=True, null=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='consulta')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    motivo = models.TextField()
    notas = models.TextField(blank=True, null=True)
    recordatorio_enviado = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Cita'
        verbose_name_plural = 'Citas'
        ordering = ['fecha', 'hora_inicio']
        unique_together = ['veterinario', 'fecha', 'hora_inicio']
        indexes = [
            models.Index(fields=['fecha', 'estado']),
            models.Index(fields=['veterinario', 'fecha']),
        ]
    
    def clean(self):
        """Validaciones del modelo"""
        if self.hora_inicio and self.hora_fin:
            if self.hora_inicio >= self.hora_fin:
                raise ValidationError('La hora de inicio debe ser menor que la hora de fin')
        
        # Calcular hora_fin si no está definida y hay servicio
        if not self.hora_fin and self.servicio and self.servicio.duracion:
            duracion_minutos = self.servicio.duracion
            hora_inicio_dt = datetime.combine(datetime.today(), self.hora_inicio)
            hora_fin_dt = hora_inicio_dt + timedelta(minutes=duracion_minutos)
            self.hora_fin = hora_fin_dt.time()
        
        # Validar disponibilidad del veterinario
        if self.veterinario_id and self.fecha and self.hora_inicio and self.hora_fin:
            disponibilidades = DisponibilidadVeterinario.objects.filter(
                veterinario=self.veterinario,
                fecha=self.fecha,
                tipo='disponible'
            )
            
            # Verificar que la cita esté dentro de alguna disponibilidad
            cita_dentro_disponibilidad = False
            for disp in disponibilidades:
                if self.hora_inicio >= disp.hora_inicio and self.hora_fin <= disp.hora_fin:
                    cita_dentro_disponibilidad = True
                    break
            
            if not cita_dentro_disponibilidad and disponibilidades.exists():
                raise ValidationError(
                    f'El veterinario no tiene disponibilidad en este horario. '
                    f'Revise los bloques de disponibilidad configurados.'
                )
            
            # Verificar que no haya solapamiento con otras citas del mismo veterinario
            citas_existentes = Cita.objects.filter(
                veterinario=self.veterinario,
                fecha=self.fecha,
                estado__in=['pendiente', 'confirmada', 'en_curso']
            )
            if self.pk:
                citas_existentes = citas_existentes.exclude(pk=self.pk)
            
            for cita in citas_existentes:
                if cita.hora_fin:
                    if (self.hora_inicio < cita.hora_fin and self.hora_fin > cita.hora_inicio):
                        raise ValidationError(
                            f'Ya existe una cita agendada para este veterinario que se solapa '
                            f'con el horario {cita.hora_inicio.strftime("%H:%M")} - {cita.hora_fin.strftime("%H:%M")}'
                        )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Cita {self.paciente.nombre} - {self.fecha} {self.hora_inicio}"
    
    @property
    def duracion_minutos(self):
        """Retorna la duración de la cita en minutos"""
        if self.hora_inicio and self.hora_fin:
            inicio = datetime.combine(datetime.today(), self.hora_inicio)
            fin = datetime.combine(datetime.today(), self.hora_fin)
            return int((fin - inicio).total_seconds() / 60)
        elif self.servicio:
            return self.servicio.duracion
        return 30  # Duración por defecto
