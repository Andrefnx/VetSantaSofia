"""
Signals para el modelo Insumo (Inventario).

Sincroniza eventos existentes con el sistema de historial centralizado.
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from decimal import Decimal

from .models import Insumo

from historial.models import RegistroHistorico
from historial.utils import (
    registrar_creacion,
    registrar_cambio_precio,
    registrar_cambio_stock,
    registrar_modificacion_informacion,
)


# Variable global para almacenar el estado anterior
_insumo_anterior = {}


@receiver(pre_save, sender=Insumo)
def insumo_pre_save(sender, instance, **kwargs):
    """
    Captura el estado anterior del insumo antes de guardar.
    """
    if instance.pk:
        try:
            anterior = Insumo.objects.get(pk=instance.pk)
            _insumo_anterior[instance.pk] = {
                'medicamento': anterior.medicamento,
                'marca': anterior.marca,
                'sku': anterior.sku,
                'tipo': anterior.tipo,
                'formato': anterior.formato,
                'descripcion': anterior.descripcion,
                'especie': anterior.especie,
                'precio_venta': anterior.precio_venta,
                'stock_actual': anterior.stock_actual,
                # Campos de dosis
                'dosis_ml': anterior.dosis_ml,
                'ml_contenedor': anterior.ml_contenedor,
                'cantidad_pastillas': anterior.cantidad_pastillas,
                'unidades_pipeta': anterior.unidades_pipeta,
                'peso_kg': anterior.peso_kg,
                # Campos de información adicional
                'precauciones': anterior.precauciones,
                'contraindicaciones': anterior.contraindicaciones,
                'efectos_adversos': anterior.efectos_adversos,
            }
        except Insumo.DoesNotExist:
            pass


@receiver(post_save, sender=Insumo)
def insumo_post_save(sender, instance, created, **kwargs):
    """
    Sincroniza eventos del inventario con el sistema de historial centralizado.
    """
    try:
        # Obtener usuario del middleware o del atributo _usuario_modificacion
        usuario = get_current_user() or getattr(instance, '_usuario_modificacion', None)
        if not usuario and instance.usuario_ultimo_movimiento:
            usuario = instance.usuario_ultimo_movimiento
        
        if created:
            # CREACIÓN DE INSUMO
            # Solo registrar si tiene stock inicial (sino es solo un registro en catálogo)
            if instance.stock_actual and instance.stock_actual > 0:
                registrar_creacion(
                    entidad='inventario',
                    objeto_id=instance.pk,
                    nombre_objeto=instance.medicamento,
                    usuario=usuario,
                    datos_adicionales={
                        'marca': instance.marca,
                        'formato': instance.formato,
                        'stock_inicial': instance.stock_actual,
                        'precio': float(instance.precio_venta) if instance.precio_venta else None,
                    }
                )
            
        else:
            # ACTUALIZACIÓN - Sincronizar con historial centralizado
            anterior = _insumo_anterior.get(instance.pk)
            
            if not anterior:
                return
            
            # Variables para tracking de cambios
            cambios_detectados = []
            tipo_evento_prioritario = None
            
            # Sistema de prioridad para tipo_ultimo_movimiento:
            # 1. STOCK (alta) > 2. PRECIO (alta) > 3. INFO (baja)
            # NOTA: En inventario, tipo_ultimo_movimiento puede estar pre-establecido
            # por el sistema de gestión de stock (ingreso_stock, salida_stock)
            
            # 1. CAMBIO DE STOCK (MÁXIMA PRIORIDAD - ALTA CRITICIDAD)
            if anterior['stock_actual'] != instance.stock_actual:
                # El tipo de movimiento ya está definido en tipo_ultimo_movimiento por el modelo
                tipo_movimiento = instance.tipo_ultimo_movimiento
                
                if tipo_movimiento in ['ingreso_stock', 'salida_stock']:
                    registrar_cambio_stock(
                        objeto_id=instance.pk,
                        nombre_insumo=instance.medicamento,
                        tipo_movimiento=tipo_movimiento,
                        stock_anterior=anterior['stock_actual'],
                        stock_nuevo=instance.stock_actual,
                        usuario=usuario
                    )
                    tipo_evento_prioritario = tipo_movimiento
                    cambios_detectados.append('stock_actual')
            
            # 2. CAMBIO DE PRECIO (SEGUNDA PRIORIDAD - ALTA CRITICIDAD)
            if anterior['precio_venta'] != instance.precio_venta and instance.precio_venta is not None:
                registrar_cambio_precio(
                    entidad='inventario',
                    objeto_id=instance.pk,
                    nombre_objeto=instance.medicamento,
                    precio_anterior=anterior['precio_venta'],
                    precio_nuevo=instance.precio_venta,
                    usuario=usuario
                )
                # Solo sobrescribir si no hay cambio de stock
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'actualizacion_precio'
                cambios_detectados.append('precio_venta')
            
            # 3. MODIFICACIÓN DE INFORMACIÓN (MENOR PRIORIDAD)
            campos_info = [
                'medicamento', 'marca', 'sku', 'tipo', 'formato', 'descripcion', 'especie',
                'dosis_ml', 'ml_contenedor', 'cantidad_pastillas', 'unidades_pipeta', 'peso_kg',
                'precauciones', 'contraindicaciones', 'efectos_adversos'
            ]
            
            cambios_info = []
            valores_anteriores = {}
            valores_nuevos = {}
            
            for campo in campos_info:
                valor_anterior = anterior[campo]
                valor_nuevo = getattr(instance, campo)
                if valor_anterior != valor_nuevo:
                    cambios_info.append(campo)
                    valores_anteriores[campo] = str(valor_anterior) if valor_anterior is not None else None
                    valores_nuevos[campo] = str(valor_nuevo) if valor_nuevo is not None else None
            
            if cambios_info:
                registrar_modificacion_informacion(
                    entidad='inventario',
                    objeto_id=instance.pk,
                    nombre_objeto=instance.medicamento,
                    campos_modificados=cambios_info,
                    usuario=usuario,
                    valores_anteriores=valores_anteriores,
                    valores_nuevos=valores_nuevos
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'modificacion_informacion'
                cambios_detectados.extend(cambios_info)
            
            # NOTA: No actualizamos tipo_ultimo_movimiento aquí porque el modelo Insumo
            # ya lo maneja en su propia lógica de negocio (especialmente para stock).
            # El signal solo registra en el historial centralizado sin interferir.
            
            # Limpiar estado anterior
            if instance.pk in _insumo_anterior:
                del _insumo_anterior[instance.pk]
    
    except Exception as e:
        # No fallar la operación principal si falla el registro de historial
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error en signal de Insumo: {e}", exc_info=True)
