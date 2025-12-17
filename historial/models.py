from django.db import models
from django.conf import settings
from django.utils import timezone


class RegistroHistorico(models.Model):
    """
    Modelo central de auditoría para registrar cambios en entidades del sistema.
    
    ARQUITECTURA HÍBRIDA:
    Este modelo complementa (NO reemplaza) los campos de trazabilidad rápida
    en cada entidad (ultimo_movimiento, tipo_ultimo_movimiento, etc).
    
    PROPÓSITO:
    - Auditoría completa de cambios
    - Trazabilidad de quién, cuándo, qué cambió
    - Compliance y requisitos legales
    - Análisis histórico y reportes
    
    CARACTERÍSTICAS:
    - Append-only: Los registros NUNCA se editan ni eliminan
    - Sin GenericForeignKey: Usa entidad + objeto_id para flexibilidad
    - Datos estructurados en JSONField para análisis posterior
    - Criticidad para filtrar eventos importantes
    
    REGLAS:
    - El registro de historial NO debe fallar la operación principal
    - Los signals deben capturar excepciones al registrar
    - Los datos_cambio deben ser serializables (JSON compatible)
    """
    
    # ===========================
    # CHOICES
    # ===========================
    
    ENTIDAD_CHOICES = [
        ('inventario', 'Inventario'),
        ('servicio', 'Servicio'),
        ('paciente', 'Paciente'),
    ]
    
    TIPO_EVENTO_CHOICES = [
        # Eventos comunes
        ('creacion', 'Creación'),
        ('modificacion_informacion', 'Modificación de Información'),
        ('activacion', 'Activación'),
        ('desactivacion', 'Desactivación'),
        
        # Eventos de inventario
        ('ingreso_stock', 'Ingreso de Stock'),
        ('salida_stock', 'Salida de Stock'),
        ('actualizacion_precio', 'Actualización de Precio'),
        
        # Eventos de servicios
        ('cambio_precio_servicio', 'Cambio de Precio de Servicio'),
        ('cambio_duracion', 'Cambio de Duración'),
        ('cambio_categoria', 'Cambio de Categoría'),
        
        # Eventos de pacientes
        ('cambio_propietario', 'Cambio de Propietario'),
        ('actualizacion_peso', 'Actualización de Peso'),
        ('actualizacion_antecedentes', 'Actualización de Antecedentes Médicos'),
        ('modificacion_datos_basicos', 'Modificación de Datos Básicos'),
    ]
    
    CRITICIDAD_CHOICES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]
    
    # ===========================
    # CAMPOS
    # ===========================
    
    # Timestamp
    fecha_evento = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name="Fecha del Evento",
        help_text="Momento en que ocurrió el evento"
    )
    
    # Identificación de la entidad (sin GenericForeignKey)
    entidad = models.CharField(
        max_length=20,
        choices=ENTIDAD_CHOICES,
        db_index=True,
        verbose_name="Entidad",
        help_text="Tipo de entidad afectada"
    )
    
    objeto_id = models.PositiveIntegerField(
        db_index=True,
        verbose_name="ID del Objeto",
        help_text="ID del registro afectado en su tabla"
    )
    
    # Detalles del evento
    tipo_evento = models.CharField(
        max_length=50,
        choices=TIPO_EVENTO_CHOICES,
        db_index=True,
        verbose_name="Tipo de Evento",
        help_text="Clasificación del evento"
    )
    
    descripcion = models.TextField(
        verbose_name="Descripción",
        help_text="Descripción legible del evento para usuarios"
    )
    
    datos_cambio = models.JSONField(
        blank=True,
        null=True,
        verbose_name="Datos del Cambio",
        help_text="Estructura JSON con valores anteriores/nuevos y metadatos"
    )
    
    # Responsable
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='eventos_historicos',
        verbose_name="Usuario Responsable",
        help_text="Usuario que realizó el cambio (null para cambios automáticos)"
    )
    
    # Criticidad
    criticidad = models.CharField(
        max_length=10,
        choices=CRITICIDAD_CHOICES,
        default='media',
        db_index=True,
        verbose_name="Criticidad",
        help_text="Nivel de importancia del evento"
    )
    
    # ===========================
    # META
    # ===========================
    
    class Meta:
        db_table = 'registro_historico'
        verbose_name = 'Registro Histórico'
        verbose_name_plural = 'Registros Históricos'
        ordering = ['-fecha_evento']
        indexes = [
            # Índice compuesto para búsquedas por entidad
            models.Index(fields=['entidad', 'objeto_id', '-fecha_evento']),
            # Índice para filtros por criticidad
            models.Index(fields=['criticidad', '-fecha_evento']),
            # Índice para búsquedas por usuario
            models.Index(fields=['usuario', '-fecha_evento']),
        ]
    
    # ===========================
    # MÉTODOS
    # ===========================
    
    def __str__(self):
        entidad_display = self.get_entidad_display()
        fecha_str = self.fecha_evento.strftime('%d/%m/%Y %H:%M')
        return f"[{entidad_display} #{self.objeto_id}] {self.get_tipo_evento_display()} - {fecha_str}"
    
    @classmethod
    def registrar_evento(cls, entidad, objeto_id, tipo_evento, descripcion, 
                        usuario=None, datos_cambio=None, criticidad='media'):
        """
        Método helper para registrar eventos de forma segura.
        
        Si el registro falla, captura la excepción y loggea el error
        sin interrumpir la operación principal.
        
        Args:
            entidad (str): Tipo de entidad ('inventario', 'servicio', 'paciente')
            objeto_id (int): ID del objeto afectado
            tipo_evento (str): Tipo de evento
            descripcion (str): Descripción legible
            usuario (User, optional): Usuario responsable
            datos_cambio (dict, optional): Datos estructurados del cambio
            criticidad (str, optional): Nivel de criticidad
        
        Returns:
            RegistroHistorico or None: El registro creado o None si falló
        """
        try:
            return cls.objects.create(
                entidad=entidad,
                objeto_id=objeto_id,
                tipo_evento=tipo_evento,
                descripcion=descripcion,
                usuario=usuario,
                datos_cambio=datos_cambio,
                criticidad=criticidad
            )
        except Exception as e:
            # Loggear el error pero no fallar la operación principal
            import logging
            logger = logging.getLogger(__name__)
            logger.error(
                f"Error al registrar evento histórico: {e}\n"
                f"Entidad: {entidad}, ID: {objeto_id}, Evento: {tipo_evento}"
            )
            return None
    
    @classmethod
    def obtener_historial(cls, entidad, objeto_id, limit=None):
        """
        Obtiene el historial de una entidad específica.
        
        Args:
            entidad (str): Tipo de entidad
            objeto_id (int): ID del objeto
            limit (int, optional): Limitar cantidad de resultados
        
        Returns:
            QuerySet: Registros históricos ordenados por fecha descendente
        """
        queryset = cls.objects.filter(
            entidad=entidad,
            objeto_id=objeto_id
        )
        
        if limit:
            queryset = queryset[:limit]
        
        return queryset
    
    def get_icono(self):
        """Retorna el ícono Font Awesome apropiado según el tipo de evento"""
        iconos = {
            'creacion': 'fa-plus-circle',
            'modificacion_informacion': 'fa-edit',
            'activacion': 'fa-check-circle',
            'desactivacion': 'fa-times-circle',
            'ingreso_stock': 'fa-arrow-up',
            'salida_stock': 'fa-arrow-down',
            'actualizacion_precio': 'fa-dollar-sign',
            'cambio_precio_servicio': 'fa-dollar-sign',
            'cambio_duracion': 'fa-clock',
            'cambio_categoria': 'fa-tags',
            'cambio_propietario': 'fa-exchange-alt',
            'actualizacion_peso': 'fa-weight',
            'actualizacion_antecedentes': 'fa-file-medical',
            'modificacion_datos_basicos': 'fa-user-edit',
        }
        return iconos.get(self.tipo_evento, 'fa-history')
    
    def get_color_criticidad(self):
        """Retorna la clase CSS según la criticidad"""
        colores = {
            'baja': 'text-secondary',
            'media': 'text-info',
            'alta': 'text-warning',
            'critica': 'text-danger',
        }
        return colores.get(self.criticidad, 'text-secondary')
