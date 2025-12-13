from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal


class Caja(models.Model):
    """MODELO EXISTENTE - Mantener sin cambios"""
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    fecha_apertura = models.DateTimeField(default=timezone.now)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    monto_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    monto_final = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Caja'
        verbose_name_plural = 'Cajas'
        ordering = ['-fecha_apertura']

    def __str__(self):
        return f"Caja {self.usuario.username} - {self.fecha_apertura.strftime('%d/%m/%Y %H:%M')}"

    @property
    def esta_abierta(self):
        return self.fecha_cierre is None


class MovimientoCaja(models.Model):
    """MODELO EXISTENTE - Mantener sin cambios"""
    TIPO_CHOICES = [
        ('ingreso', 'Ingreso'),
        ('egreso', 'Egreso'),
    ]

    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
        ('cheque', 'Cheque'),
        ('otro', 'Otro'),
    ]

    caja = models.ForeignKey(Caja, on_delete=models.CASCADE, related_name='movimientos')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    concepto = models.CharField(max_length=200)
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES, default='efectivo')
    descripcion = models.TextField(blank=True, null=True)
    fecha = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Movimiento de Caja'
        verbose_name_plural = 'Movimientos de Caja'
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.get_tipo_display()} - ${self.monto} - {self.concepto}"


# =============================================================================
# ✅ NUEVOS MODELOS - Sistema de Cobros y Sesiones de Caja
# =============================================================================

class SesionCaja(models.Model):
    """Sesión diaria de caja con apertura y cierre"""
    usuario_apertura = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT,
        related_name='sesiones_abiertas'
    )
    usuario_cierre = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT,
        related_name='sesiones_cerradas',
        null=True,
        blank=True
    )
    fecha_apertura = models.DateTimeField(default=timezone.now)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    monto_inicial = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    monto_final_calculado = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    monto_final_contado = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    diferencia = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    observaciones_apertura = models.TextField(blank=True, null=True)
    observaciones_cierre = models.TextField(blank=True, null=True)
    esta_cerrada = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = 'Sesión de Caja'
        verbose_name_plural = 'Sesiones de Caja'
        ordering = ['-fecha_apertura']
    
    def __str__(self):
        estado = "CERRADA" if self.esta_cerrada else "ABIERTA"
        return f"Sesión {self.fecha_apertura.strftime('%d/%m/%Y %H:%M')} - {estado}"
    
    def calcular_total_vendido(self):
        """Calcula el total de ventas pagadas en esta sesión"""
        return self.ventas.filter(estado='pagado').aggregate(
            total=models.Sum('total')
        )['total'] or Decimal('0.00')
    
    def cerrar_sesion(self, usuario, monto_contado, observaciones=''):
        """Cierra la sesión y calcula diferencias"""
        if self.esta_cerrada:
            raise ValidationError("Esta sesión ya está cerrada")
        
        self.fecha_cierre = timezone.now()
        self.usuario_cierre = usuario
        self.monto_final_calculado = self.monto_inicial + self.calcular_total_vendido()
        self.monto_final_contado = monto_contado
        self.diferencia = self.monto_final_contado - self.monto_final_calculado
        self.observaciones_cierre = observaciones
        self.esta_cerrada = True
        self.save()


class Venta(models.Model):
    """
    Representa un cobro (puede ser pendiente o pagado)
    - Creado automáticamente desde Consulta/Hospitalización
    - O creado manualmente como venta libre
    """
    ESTADO_CHOICES = [
        ('pendiente', 'Cobro Pendiente'),
        ('pagado', 'Pagado'),
        ('cancelado', 'Cancelado'),
    ]
    
    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
        ('cheque', 'Cheque'),
        ('mixto', 'Mixto'),
    ]
    
    TIPO_ORIGEN_CHOICES = [
        ('consulta', 'Consulta'),
        ('hospitalizacion', 'Hospitalización'),
        ('venta_libre', 'Venta Libre'),
    ]
    
    # Identificación
    numero_venta = models.CharField(max_length=20, unique=True, editable=False)
    sesion = models.ForeignKey(SesionCaja, on_delete=models.PROTECT, related_name='ventas', null=True, blank=True)
    
    # Origen
    tipo_origen = models.CharField(max_length=20, choices=TIPO_ORIGEN_CHOICES, default='venta_libre')
    consulta = models.OneToOneField(
        'clinica.Consulta', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='venta'
    )
    hospitalizacion = models.OneToOneField(
        'clinica.Hospitalizacion',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='venta'
    )
    
    # Paciente (puede ser null para ventas libres)
    paciente = models.ForeignKey(
        'pacientes.Paciente',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='ventas'
    )
    
    # Estado y montos
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    subtotal_servicios = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    subtotal_insumos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Pago
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES, null=True, blank=True)
    fecha_pago = models.DateTimeField(null=True, blank=True)
    usuario_cobro = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='ventas_cobradas'
    )
    
    # Registro
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    usuario_creacion = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='ventas_creadas'
    )
    observaciones = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Venta / Cobro'
        verbose_name_plural = 'Ventas / Cobros'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['estado', 'fecha_creacion']),
            models.Index(fields=['numero_venta']),
        ]
    
    def __str__(self):
        paciente_str = f" - {self.paciente.nombre}" if self.paciente else " - Venta Libre"
        return f"{self.numero_venta}{paciente_str} - {self.get_estado_display()}"
    
    def save(self, *args, **kwargs):
        """Genera número de venta automático"""
        if not self.numero_venta:
            from django.db.models import Max
            ultimo = Venta.objects.aggregate(Max('id'))['id__max'] or 0
            self.numero_venta = f"V{timezone.now().strftime('%Y%m%d')}-{ultimo + 1:04d}"
        super().save(*args, **kwargs)
    
    def calcular_totales(self):
        """Recalcula los totales basándose en los detalles"""
        self.subtotal_servicios = self.detalles.filter(
            tipo='servicio'
        ).aggregate(
            total=models.Sum(models.F('cantidad') * models.F('precio_unitario'))
        )['total'] or Decimal('0.00')
        
        self.subtotal_insumos = self.detalles.filter(
            tipo='insumo'
        ).aggregate(
            total=models.Sum(models.F('cantidad') * models.F('precio_unitario'))
        )['total'] or Decimal('0.00')
        
        self.total = self.subtotal_servicios + self.subtotal_insumos - self.descuento
        self.save()


class DetalleVenta(models.Model):
    """Líneas de detalle de una venta (servicios e insumos)"""
    TIPO_CHOICES = [
        ('servicio', 'Servicio'),
        ('insumo', 'Insumo'),
    ]
    
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='detalles')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    
    # Referencia al objeto original (puede ser null si fue eliminado)
    servicio = models.ForeignKey(
        'servicios.Servicio',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    insumo = models.ForeignKey(
        'inventario.Insumo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Información snapshot (se guarda en el momento para historial)
    descripcion = models.CharField(max_length=255)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Metadata para insumos calculados por dosis
    peso_paciente = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    dosis_calculada_ml = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ml_contenedor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    calculo_automatico = models.BooleanField(default=False)
    
    # Control de stock
    stock_descontado = models.BooleanField(default=False)
    fecha_descuento_stock = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Detalle de Venta'
        verbose_name_plural = 'Detalles de Venta'
        ordering = ['id']
    
    def __str__(self):
        return f"{self.descripcion} x{self.cantidad} = ${self.subtotal}"
    
    def save(self, *args, **kwargs):
        """Calcula subtotal automáticamente"""
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)


class AuditoriaCaja(models.Model):
    """Registro de todas las modificaciones en ventas/cobros para auditoría"""
    ACCION_CHOICES = [
        ('crear_venta', 'Crear Venta'),
        ('agregar_detalle', 'Agregar Detalle'),
        ('eliminar_detalle', 'Eliminar Detalle'),
        ('modificar_detalle', 'Modificar Detalle'),
        ('aplicar_descuento', 'Aplicar Descuento'),
        ('confirmar_pago', 'Confirmar Pago'),
        ('cancelar_venta', 'Cancelar Venta'),
        ('abrir_sesion', 'Abrir Sesión'),
        ('cerrar_sesion', 'Cerrar Sesión'),
    ]
    
    venta = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE,
        related_name='auditorias',
        null=True,
        blank=True
    )
    sesion = models.ForeignKey(
        SesionCaja,
        on_delete=models.CASCADE,
        related_name='auditorias',
        null=True,
        blank=True
    )
    
    accion = models.CharField(max_length=30, choices=ACCION_CHOICES)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    fecha = models.DateTimeField(auto_now_add=True)
    
    descripcion = models.TextField()
    datos_anteriores = models.JSONField(null=True, blank=True)
    datos_nuevos = models.JSONField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Auditoría de Caja'
        verbose_name_plural = 'Auditorías de Caja'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.get_accion_display()} - {self.usuario.nombre} - {self.fecha.strftime('%d/%m/%Y %H:%M')}"
