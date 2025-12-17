"""
Signals para el modelo Servicio.

Captura cambios y registra eventos en el sistema de historial.
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Servicio
from historial.models import RegistroHistorico
from historial.utils import (
    registrar_creacion,
    registrar_cambio_precio,
    registrar_cambio_estado,
    registrar_modificacion_informacion,
)


# Variable global para almacenar el estado anterior
_servicio_anterior = {}


@receiver(pre_save, sender=Servicio)
def servicio_pre_save(sender, instance, **kwargs):
    """
    Captura el estado anterior del servicio antes de guardar.
    """
    if instance.pk:
        try:
            anterior = Servicio.objects.get(pk=instance.pk)
            _servicio_anterior[instance.pk] = {
                'nombre': anterior.nombre,
                'descripcion': anterior.descripcion,
                'categoria': anterior.categoria,
                'precio': anterior.precio,
                'duracion': anterior.duracion,
                'activo': anterior.activo,
            }
        except Servicio.DoesNotExist:
            pass


@receiver(post_save, sender=Servicio)
def servicio_post_save(sender, instance, created, **kwargs):
    """
    Registra eventos de cambios en el servicio.
    """
    try:
        # Obtener usuario del middleware o del atributo _usuario_modificacion
        usuario = get_current_user() or getattr(instance, '_usuario_modificacion', None)
        
        if created:
            # CREACIÓN DE SERVICIO
            registrar_creacion(
                entidad='servicio',
                objeto_id=instance.pk,
                nombre_objeto=instance.nombre,
                usuario=usuario,
                datos_adicionales={
                    'categoria': instance.categoria,
                    'precio': instance.precio,
                    'duracion': instance.duracion,
                }
            )
            
            # Actualizar campos de trazabilidad
            instance.ultimo_movimiento = timezone.now()
            instance.tipo_ultimo_movimiento = 'creacion'
            instance.usuario_ultima_modificacion = usuario
            Servicio.objects.filter(pk=instance.pk).update(
                ultimo_movimiento=instance.ultimo_movimiento,
                tipo_ultimo_movimiento=instance.tipo_ultimo_movimiento,
                usuario_ultima_modificacion=usuario
            )
            
        else:
            # ACTUALIZACIÓN - Detectar cambios
            anterior = _servicio_anterior.get(instance.pk)
            
            if not anterior:
                return
            
            # Variables para tracking de cambios
            cambios_detectados = []
            tipo_evento_prioritario = None
            criticidad_max = 'baja'
            
            # Sistema de prioridad para tipo_ultimo_movimiento:
            # 1. PRECIO (alta) > 2. ESTADO (media) > 3. CATEGORIA/DURACION (media) > 4. INFO (baja)
            
            # 1. CAMBIO DE PRECIO (MÁXIMA PRIORIDAD - ALTA CRITICIDAD)
            if anterior['precio'] != instance.precio:
                registrar_cambio_precio(
                    entidad='servicio',
                    objeto_id=instance.pk,
                    nombre_objeto=instance.nombre,
                    precio_anterior=anterior['precio'],
                    precio_nuevo=instance.precio,
                    usuario=usuario
                )
                tipo_evento_prioritario = 'cambio_precio_servicio'
                criticidad_max = 'alta'
                cambios_detectados.append('precio')
            
            # 2. CAMBIO DE ESTADO (SEGUNDA PRIORIDAD)
            if anterior['activo'] != instance.activo:
                registrar_cambio_estado(
                    entidad='servicio',
                    objeto_id=instance.pk,
                    nombre_objeto=instance.nombre,
                    activo=instance.activo,
                    usuario=usuario
                )
                # Solo sobrescribir si no hay cambio de precio
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'activacion' if instance.activo else 'desactivacion'
                    criticidad_max = 'media'
                cambios_detectados.append('activo')
            
            # 3. CAMBIO DE CATEGORÍA
            if anterior['categoria'] != instance.categoria:
                RegistroHistorico.registrar_evento(
                    entidad='servicio',
                    objeto_id=instance.pk,
                    tipo_evento='cambio_categoria',
                    descripcion=f"{instance.nombre}: Categoría '{anterior['categoria']}' → '{instance.categoria}'",
                    usuario=usuario,
                    datos_cambio={
                        'campo': 'categoria',
                        'antes': anterior['categoria'],
                        'despues': instance.categoria,
                    },
                    criticidad='media'
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'cambio_categoria'
                    criticidad_max = 'media'
                cambios_detectados.append('categoria')
            
            # 4. CAMBIO DE DURACIÓN
            if anterior['duracion'] != instance.duracion:
                RegistroHistorico.registrar_evento(
                    entidad='servicio',
                    objeto_id=instance.pk,
                    tipo_evento='cambio_duracion',
                    descripcion=f"{instance.nombre}: Duración {anterior['duracion']}min → {instance.duracion}min",
                    usuario=usuario,
                    datos_cambio={
                        'campo': 'duracion',
                        'antes': anterior['duracion'],
                        'despues': instance.duracion,
                    },
                    criticidad='media'
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'cambio_duracion'
                    criticidad_max = 'media'
                cambios_detectados.append('duracion')
            
            # 5. CAMBIOS EN NOMBRE O DESCRIPCIÓN
            cambios_info = []
            valores_anteriores = {}
            valores_nuevos = {}
            
            if anterior['nombre'] != instance.nombre:
                cambios_info.append('nombre')
                valores_anteriores['nombre'] = str(anterior['nombre']) if anterior['nombre'] else None
                valores_nuevos['nombre'] = str(instance.nombre) if instance.nombre else None
                
            if anterior['descripcion'] != instance.descripcion:
                cambios_info.append('descripcion')
                valores_anteriores['descripcion'] = str(anterior['descripcion']) if anterior['descripcion'] else None
                valores_nuevos['descripcion'] = str(instance.descripcion) if instance.descripcion else None
            
            if cambios_info:
                registrar_modificacion_informacion(
                    entidad='servicio',
                    objeto_id=instance.pk,
                    nombre_objeto=instance.nombre,
                    campos_modificados=cambios_info,
                    usuario=usuario,
                    valores_anteriores=valores_anteriores,
                    valores_nuevos=valores_nuevos
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'modificacion_informacion'
                    criticidad_max = 'baja'
                cambios_detectados.extend(cambios_info)
            
            # Actualizar campos de trazabilidad solo si hubo cambios
            if cambios_detectados and tipo_evento_prioritario:
                instance.ultimo_movimiento = timezone.now()
                instance.tipo_ultimo_movimiento = tipo_evento_prioritario
                instance.usuario_ultima_modificacion = usuario
                Servicio.objects.filter(pk=instance.pk).update(
                    ultimo_movimiento=instance.ultimo_movimiento,
                    tipo_ultimo_movimiento=instance.tipo_ultimo_movimiento,
                    usuario_ultima_modificacion=usuario
                )
            
            # Limpiar estado anterior
            if instance.pk in _servicio_anterior:
                del _servicio_anterior[instance.pk]
    
    except Exception as e:
        # No fallar la operación principal si falla el registro de historial
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error en signal de Servicio: {e}", exc_info=True)
