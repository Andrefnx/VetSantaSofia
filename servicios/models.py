from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from inventario.models import Insumo

# Create your models here.

# ===========================
#   SERVICIOS - ARQUITECTURA TÉCNICA
# ===========================
#
# NOTA TÉCNICA IMPORTANTE:
#
# El modelo Servicio representa el CATÁLOGO COMERCIAL de servicios ofrecidos.
# Es una lista de servicios disponibles con sus precios y duraciones.
#
# El modelo ServicioInsumo es ÚNICAMENTE REFERENCIAL/PLANTILLA.
# NO automatiza el descuento de inventario.
# NO valida stock disponible.
# NO genera movimientos de inventario.
#
# FLUJO DE INVENTARIO:
# El descuento de inventario ocurre EXCLUSIVAMENTE a través de los flujos
# operacionales de clínica y caja, donde se registran las ventas reales
# y se aplican los descuentos correspondientes al inventario.
#
# ServicioInsumo sirve solo como:
# - Plantilla de insumos típicamente utilizados en un servicio
# - Referencia para planificación y estimación
# - Guía para el personal al ejecutar el servicio
#
# ===========================

# ===========================
#   SERVICIOS
# ===========================

class Servicio(models.Model):
    """
    Modelo para servicios veterinarios ofrecidos en la clínica.
    
    ⚠️ ADVERTENCIA SOBRE ELIMINACIÓN DE SERVICIOS:
    
    Eliminar servicios es una operación PELIGROSA y debe evitarse siempre que sea posible.
    
    IMPACTO DE ELIMINAR SERVICIOS:
    - Los servicios están referenciados por múltiples módulos: agenda, clínica y caja
    - Aunque las ventas históricas son seguras (precio y descripción se copian al momento
      de la venta), la eliminación puede afectar reportes futuros y consultas de referencias
    - Las citas en agenda pueden quedar huérfanas si se elimina el servicio asociado
    - Los análisis históricos y estadísticas pueden verse comprometidos
    - Se pierden datos valiosos para auditorías y seguimiento de servicios prestados
    
    DATOS SEGUROS EN VENTAS HISTÓRICAS:
    - Al registrar una venta, el precio y la descripción del servicio se copian
    - Esto garantiza que las ventas pasadas mantengan su información original
    - Sin embargo, la relación de clave foránea puede verse afectada
    
    RECOMENDACIÓN FUERTE:
    ✅ PREFERIR DESACTIVACIÓN LÓGICA sobre eliminación física
    ✅ Implementar un campo 'activo' para marcar servicios como inactivos
    ✅ Filtrar servicios inactivos en formularios y listados sin eliminar el registro
    ✅ Mantener el historial completo para reportes y análisis futuros
    
    Solo eliminar servicios si:
    - Fueron creados por error y nunca fueron utilizados
    - No tienen ninguna referencia en agenda, citas o ventas
    - Se ha verificado exhaustivamente que no hay dependencias
    
    Nota: Si necesitas eliminar servicios con referencias existentes, considera
    primero actualizar todas las referencias o implementar eliminación en cascada
    controlada con respaldo previo de la base de datos.
    """
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

    # 🔍 CAMPOS DE TRAZABILIDAD Y SOFT DELETE (Sistema de Historial)
    activo = models.BooleanField(
        default=True,
        verbose_name="Activo",
        help_text="Permite desactivación lógica en lugar de eliminación física"
    )
    
    ultimo_movimiento = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Último Movimiento"
    )
    
    tipo_ultimo_movimiento = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name="Tipo de Último Movimiento",
        help_text="Tipo del último cambio registrado"
    )
    
    usuario_ultima_modificacion = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='servicios_modificados',
        verbose_name="Usuario Última Modificación"
    )

    class Meta:
        db_table = "Servicio"
        verbose_name = "Servicio Veterinario"
        verbose_name_plural = "Servicios Veterinarios"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

    def clean(self):
        super().clean()
        if self.duracion <= 0:
            raise ValidationError('La duración debe ser mayor a 0 minutos.')
        if self.duracion % 15 != 0:
            raise ValidationError('La duración debe ser múltiplo de 15 minutos.')

    @property
    def blocks_required(self) -> int:
        """Cantidad de bloques de 15 min necesarios para este servicio."""
        return (self.duracion + 14) // 15 if self.duracion else 1


class ServicioInsumo(models.Model):
    """
    Tabla de relación entre Servicios e Insumos.
    
    ⚠️ IMPORTANTE: ESTE MODELO ES SOLO REFERENCIAL/PLANTILLA
    
    PROPÓSITO:
    Este modelo sirve ÚNICAMENTE como plantilla o referencia de los insumos
    que típicamente se utilizan al prestar un servicio específico.
    
    LO QUE NO HACE (COMPORTAMIENTO CRÍTICO):
    ❌ NO valida automáticamente el stock disponible
    ❌ NO descuenta inventario al crear/usar el servicio
    ❌ NO genera movimientos de inventario
    ❌ NO actualiza cantidades en la tabla Inventario
    ❌ NO tiene signals ni lógica de negocio automática
    
    USO PRÁCTICO:
    ✅ Plantilla de insumos sugeridos para el servicio
    ✅ Referencia para el personal al ejecutar el servicio
    ✅ Guía para planificación y estimación de costos
    ✅ Ayuda visual en formularios ("este servicio típicamente usa X insumos")
    
    FLUJO REAL DE INVENTARIO:
    El descuento y validación de inventario ocurre EXCLUSIVAMENTE cuando:
    1. Se registra una venta en el módulo de Caja
    2. Se completa una atención en el módulo de Clínica
    3. Se ejecutan los flujos operacionales que aplican los cambios a Inventario
    
    EJEMPLO DE USO:
    Si el servicio "Vacunación" tiene asociados:
    - 1x Vacuna Antirrábica
    - 1x Jeringa desechable
    
    Esta información es solo INFORMATIVA. El sistema no descuenta estos insumos
    automáticamente. El descuento real ocurre cuando el veterinario registra
    la venta o atención y especifica explícitamente qué insumos se utilizaron.
    
    ARQUITECTURA:
    Este diseño permite flexibilidad operacional, ya que en la práctica:
    - Pueden usarse más o menos insumos de los sugeridos
    - Pueden sustituirse insumos según disponibilidad
    - El personal tiene control total sobre el inventario real consumido
    """
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE)
    insumo = models.ForeignKey(Insumo, on_delete=models.PROTECT)  # Proteger insumos de eliminación accidental
    cantidad = models.IntegerField()

    class Meta:
        db_table = 'servicio_insumo'

    def __str__(self):
        return f"{self.servicio.nombre} → {self.cantidad} x {self.insumo.medicamento}"
