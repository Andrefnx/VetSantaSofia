from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from pacientes.models import Paciente  # Cambiado de hospital.models import Mascota
from servicios.models import Servicio
from datetime import datetime, timedelta, time


BLOCK_MINUTES = 15


def time_to_block_index(value: time) -> int:
    """Convierte una hora a índice de bloque de 15 min (0-95)."""
    if value is None:
        raise ValidationError('La hora es requerida para calcular bloque.')
    total_minutes = value.hour * 60 + value.minute
    if total_minutes < 0 or total_minutes >= 24 * 60:
        raise ValidationError('Hora fuera de rango del día.')
    if total_minutes % BLOCK_MINUTES != 0:
        raise ValidationError('La hora debe ser múltiplo de 15 minutos.')
    return total_minutes // BLOCK_MINUTES


def block_index_to_time(index: int) -> time:
    """Convierte índice de bloque (0-96) a hora de inicio del bloque."""
    if index is None:
        raise ValidationError('El índice de bloque es requerido.')
    if index < 0 or index > 96:
        raise ValidationError('El índice de bloque debe estar entre 0 y 96.')
    total_minutes = index * BLOCK_MINUTES
    hours, minutes = divmod(total_minutes, 60)
    if hours == 24 and minutes == 0:
        # Caso límite: fin del día, se usa 23:59 para hora_fin derivada
        return time(23, 59)
    return time(hours, minutes)


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


class DisponibilidadBloquesDia(models.Model):
    """Disponibilidad diaria basada en bloques de 15 minutos."""

    veterinario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='disponibilidades_bloques',
        limit_choices_to={'rol': 'veterinario'}
    )
    fecha = models.DateField()
    trabaja = models.BooleanField(default=True)
    rangos = models.JSONField(default=list, help_text='Lista de dicts {"start_block": int, "end_block": int}')
    notas = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Disponibilidad diaria (bloques)'
        verbose_name_plural = 'Disponibilidades diarias (bloques)'
        ordering = ['fecha']
        unique_together = ['veterinario', 'fecha']
        indexes = [
            models.Index(fields=['veterinario', 'fecha']),
        ]

    def __str__(self):
        estado = 'Trabaja' if self.trabaja else 'No trabaja'
        return f"{self.veterinario} - {self.fecha} ({estado})"

    def clean(self):
        if not self.trabaja:
            self.rangos = []
            return

        if not isinstance(self.rangos, list):
            raise ValidationError('Los rangos deben ser una lista de bloques.')

        normalizados = []
        for item in self.rangos:
            try:
                start_block = int(item.get('start_block'))
                end_block = int(item.get('end_block'))
            except Exception as exc:  # noqa: BLE001 - Validación específica abajo
                raise ValidationError(f'Formato de rango inválido: {item}') from exc

            if start_block < 0 or end_block > 96 or start_block >= end_block:
                raise ValidationError('Cada rango debe cumplir 0<=inicio<fin<=96.')
            normalizados.append({'start_block': start_block, 'end_block': end_block})

        normalizados.sort(key=lambda r: r['start_block'])

        merged = []
        for rng in normalizados:
            if not merged:
                merged.append(rng)
                continue
            last = merged[-1]
            if rng['start_block'] <= last['end_block']:
                # Unimos rangos contiguos o solapados
                last['end_block'] = max(last['end_block'], rng['end_block'])
            else:
                merged.append(rng)

        self.rangos = merged


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
    start_block = models.PositiveSmallIntegerField(blank=True, null=True, help_text='Índice de bloque de inicio (0-95)')
    end_block = models.PositiveSmallIntegerField(blank=True, null=True, help_text='Índice de bloque fin exclusivo (1-96)')
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
            models.Index(fields=['veterinario', 'fecha', 'start_block']),
        ]
    
    def clean(self):
        """Validaciones del modelo"""
        # Sincronizar bloques a partir de hora_inicio y duración de servicio
        if self.hora_inicio:
            self.start_block = self.start_block if self.start_block is not None else time_to_block_index(self.hora_inicio)
        if self.servicio and self.servicio.duracion:
            blocks_required = (self.servicio.duracion + BLOCK_MINUTES - 1) // BLOCK_MINUTES
        else:
            blocks_required = None

        if self.start_block is not None and blocks_required:
            self.end_block = self.end_block if self.end_block is not None else self.start_block + blocks_required

        # Validar rango de bloques
        if self.start_block is not None and self.end_block is not None:
            if self.start_block < 0 or self.start_block >= 96:
                raise ValidationError('start_block debe estar entre 0 y 95.')
            if self.end_block <= self.start_block or self.end_block > 96:
                raise ValidationError('end_block debe estar entre start_block+1 y 96.')

        # Calcular hora_fin a partir de bloques o servicio
        if not self.hora_fin:
            if self.end_block is not None:
                # end_block es exclusivo; usamos su hora de inicio como fin real
                self.hora_fin = block_index_to_time(self.end_block)
            elif self.hora_inicio and self.servicio and self.servicio.duracion:
                hora_inicio_dt = datetime.combine(datetime.today(), self.hora_inicio)
                hora_fin_dt = hora_inicio_dt + timedelta(minutes=self.servicio.duracion)
                self.hora_fin = hora_fin_dt.time()

        if self.hora_inicio and self.hora_fin:
            if self.hora_inicio >= self.hora_fin:
                raise ValidationError('La hora de inicio debe ser menor que la hora de fin')

        # Validar disponibilidad por bloques si existe registro diario
        if self.veterinario_id and self.fecha and self.start_block is not None and self.end_block is not None:
            disponibilidad_dia = DisponibilidadBloquesDia.objects.filter(veterinario=self.veterinario, fecha=self.fecha).first()

            if disponibilidad_dia:
                if not disponibilidad_dia.trabaja:
                    raise ValidationError('El veterinario no trabaja este día.')

                dentro = any(
                    rng['start_block'] <= self.start_block and self.end_block <= rng['end_block']
                    for rng in disponibilidad_dia.rangos
                )
                if not dentro:
                    raise ValidationError('El horario solicitado está fuera de la disponibilidad configurada.')

        # Validar solapes con otras citas usando bloques si ambos lo tienen
        if self.veterinario_id and self.fecha:
            citas_existentes = Cita.objects.filter(
                veterinario=self.veterinario,
                fecha=self.fecha,
                estado__in=['pendiente', 'confirmada', 'en_curso']
            )
            if self.pk:
                citas_existentes = citas_existentes.exclude(pk=self.pk)

            for cita in citas_existentes:
                if self.start_block is not None and self.end_block is not None and cita.start_block is not None and cita.end_block is not None:
                    if self.start_block < cita.end_block and self.end_block > cita.start_block:
                        raise ValidationError(
                            f'Bloques ocupados por otra cita {cita.hora_inicio.strftime("%H:%M")} - {cita.hora_fin.strftime("%H:%M")}.'
                        )
                elif cita.hora_fin and self.hora_fin:
                    if self.hora_inicio < cita.hora_fin and self.hora_fin > cita.hora_inicio:
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
