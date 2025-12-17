"""
Signals para el modelo Paciente.

Captura cambios y registra eventos en el sistema de historial.
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from decimal import Decimal

from .models import Paciente
from historial.models import RegistroHistorico
from historial.middleware import get_current_user
from historial.utils import (
    registrar_creacion,
    registrar_cambio_propietario,
    registrar_actualizacion_peso,
    registrar_actualizacion_antecedentes,
    registrar_cambio_estado,
    registrar_modificacion_informacion,
)


# Variable global para almacenar el estado anterior
_paciente_anterior = {}


@receiver(pre_save, sender=Paciente)
def paciente_pre_save(sender, instance, **kwargs):
    """
    Captura el estado anterior del paciente antes de guardar.
    """
    if instance.pk:
        try:
            anterior = Paciente.objects.get(pk=instance.pk)
            _paciente_anterior[instance.pk] = {
                'nombre': anterior.nombre,
                'especie': anterior.especie,
                'raza': anterior.raza,
                'color': anterior.color,
                'sexo': anterior.sexo,
                'fecha_nacimiento': anterior.fecha_nacimiento,
                'edad_anos': anterior.edad_anos,
                'edad_meses': anterior.edad_meses,
                'microchip': anterior.microchip,
                'ultimo_peso': anterior.ultimo_peso,
                'alergias': anterior.alergias,
                'enfermedades_cronicas': anterior.enfermedades_cronicas,
                'medicamentos_actuales': anterior.medicamentos_actuales,
                'cirugia_previa': anterior.cirugia_previa,
                'propietario_id': anterior.propietario_id,
                'propietario': anterior.propietario,  # Guardar objeto completo
                'activo': anterior.activo,
            }
        except Paciente.DoesNotExist:
            pass


@receiver(post_save, sender=Paciente)
def paciente_post_save(sender, instance, created, **kwargs):
    """
    Registra eventos de cambios en el paciente.
    """
    try:
        # Obtener usuario del middleware o del atributo _usuario_modificacion
        usuario = get_current_user() or getattr(instance, '_usuario_modificacion', None)
        
        if created:
            # CREACIÓN DE FICHA
            registrar_creacion(
                entidad='paciente',
                objeto_id=instance.pk,
                nombre_objeto=f"{instance.nombre} ({instance.get_especie_display()})",
                usuario=usuario,
                datos_adicionales={
                    'especie': instance.especie,
                    'sexo': instance.sexo,
                    'propietario': instance.propietario.nombre_completo,
                }
            )
            
            # Actualizar campos de trazabilidad
            instance.ultimo_movimiento = timezone.now()
            instance.tipo_ultimo_movimiento = 'creacion'
            instance.usuario_ultima_modificacion = usuario
            Paciente.objects.filter(pk=instance.pk).update(
                ultimo_movimiento=instance.ultimo_movimiento,
                tipo_ultimo_movimiento=instance.tipo_ultimo_movimiento,
                usuario_ultima_modificacion=usuario
            )
            
        else:
            # ACTUALIZACIÓN - Detectar cambios
            anterior = _paciente_anterior.get(instance.pk)
            
            if not anterior:
                return
            
            # Variables para tracking de cambios
            cambios_detectados = []
            tipo_evento_prioritario = None
            criticidad_max = 'baja'
            
            # Sistema de prioridad para tipo_ultimo_movimiento:
            # 1. PROPIETARIO (crítica) > 2. ANTECEDENTES (crítica) > 3. PESO (media) > 4. ESTADO (media) > 5. DATOS BÁSICOS (baja)
            
            # 1. CAMBIO DE PROPIETARIO (MÁXIMA PRIORIDAD - CRÍTICA)
            if anterior['propietario_id'] != instance.propietario_id:
                registrar_cambio_propietario(
                    paciente_id=instance.pk,
                    nombre_paciente=instance.nombre,
                    propietario_anterior=anterior['propietario'],  # Usar el capturado en pre_save
                    propietario_nuevo=instance.propietario,
                    usuario=usuario
                )
                tipo_evento_prioritario = 'cambio_propietario'
                criticidad_max = 'critica'
                cambios_detectados.append('propietario')
            
            # 2. CAMBIOS EN ANTECEDENTES MÉDICOS (CRÍTICO - SEGUNDA PRIORIDAD)
            # Registrar cada antecedente que cambió individualmente
            if anterior['alergias'] != instance.alergias:
                registrar_actualizacion_antecedentes(
                    paciente_id=instance.pk,
                    nombre_paciente=instance.nombre,
                    campo_modificado='alergias',
                    valor_anterior=anterior['alergias'],
                    valor_nuevo=instance.alergias,
                    usuario=usuario
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'actualizacion_antecedentes'
                    criticidad_max = 'critica'
                cambios_detectados.append('alergias')
            
            if anterior['enfermedades_cronicas'] != instance.enfermedades_cronicas:
                registrar_actualizacion_antecedentes(
                    paciente_id=instance.pk,
                    nombre_paciente=instance.nombre,
                    campo_modificado='enfermedades_cronicas',
                    valor_anterior=anterior['enfermedades_cronicas'],
                    valor_nuevo=instance.enfermedades_cronicas,
                    usuario=usuario
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'actualizacion_antecedentes'
                    criticidad_max = 'critica'
                cambios_detectados.append('enfermedades_cronicas')
            
            if anterior['medicamentos_actuales'] != instance.medicamentos_actuales:
                registrar_actualizacion_antecedentes(
                    paciente_id=instance.pk,
                    nombre_paciente=instance.nombre,
                    campo_modificado='medicamentos_actuales',
                    valor_anterior=anterior['medicamentos_actuales'],
                    valor_nuevo=instance.medicamentos_actuales,
                    usuario=usuario
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'actualizacion_antecedentes'
                    criticidad_max = 'critica'
                cambios_detectados.append('medicamentos_actuales')
            
            if anterior['cirugia_previa'] != instance.cirugia_previa:
                registrar_actualizacion_antecedentes(
                    paciente_id=instance.pk,
                    nombre_paciente=instance.nombre,
                    campo_modificado='cirugia_previa',
                    valor_anterior=anterior['cirugia_previa'],
                    valor_nuevo=instance.cirugia_previa,
                    usuario=usuario
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'actualizacion_antecedentes'
                    criticidad_max = 'critica'
                cambios_detectados.append('cirugia_previa')
            
            # 3. CAMBIO DE PESO (TERCERA PRIORIDAD)
            if anterior['ultimo_peso'] != instance.ultimo_peso and instance.ultimo_peso is not None:
                registrar_actualizacion_peso(
                    paciente_id=instance.pk,
                    nombre_paciente=instance.nombre,
                    peso_anterior=anterior['ultimo_peso'],
                    peso_nuevo=instance.ultimo_peso,
                    usuario=usuario
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'actualizacion_peso'
                    criticidad_max = 'media'
                cambios_detectados.append('ultimo_peso')
            
            # 4. CAMBIO DE ESTADO (CUARTA PRIORIDAD)
            if anterior['activo'] != instance.activo:
                registrar_cambio_estado(
                    entidad='paciente',
                    objeto_id=instance.pk,
                    nombre_objeto=instance.nombre,
                    activo=instance.activo,
                    usuario=usuario
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'activacion' if instance.activo else 'desactivacion'
                    criticidad_max = 'media'
                cambios_detectados.append('activo')
            
            # 5. MODIFICACIÓN DE DATOS BÁSICOS (MENOR PRIORIDAD)
            campos_basicos = ['nombre', 'especie', 'raza', 'color', 'sexo', 
                             'fecha_nacimiento', 'edad_anos', 'edad_meses', 'microchip']
            
            cambios_basicos = []
            valores_anteriores = {}
            valores_nuevos = {}
            
            for campo in campos_basicos:
                valor_anterior = anterior[campo]
                valor_nuevo = getattr(instance, campo)
                if valor_anterior != valor_nuevo:
                    cambios_basicos.append(campo)
                    valores_anteriores[campo] = str(valor_anterior) if valor_anterior is not None else None
                    valores_nuevos[campo] = str(valor_nuevo) if valor_nuevo is not None else None
            
            if cambios_basicos:
                registrar_modificacion_informacion(
                    entidad='paciente',
                    objeto_id=instance.pk,
                    nombre_objeto=instance.nombre,
                    campos_modificados=cambios_basicos,
                    usuario=usuario,
                    valores_anteriores=valores_anteriores,
                    valores_nuevos=valores_nuevos
                )
                if not tipo_evento_prioritario:
                    tipo_evento_prioritario = 'modificacion_datos_basicos'
                    criticidad_max = 'baja'
                cambios_detectados.extend(cambios_basicos)
            
            # Actualizar campos de trazabilidad solo si hubo cambios
            if cambios_detectados and tipo_evento_prioritario:
                instance.ultimo_movimiento = timezone.now()
                instance.tipo_ultimo_movimiento = tipo_evento_prioritario
                instance.usuario_ultima_modificacion = usuario
                Paciente.objects.filter(pk=instance.pk).update(
                    ultimo_movimiento=instance.ultimo_movimiento,
                    tipo_ultimo_movimiento=instance.tipo_ultimo_movimiento,
                    usuario_ultima_modificacion=usuario
                )
            
            # Limpiar estado anterior
            if instance.pk in _paciente_anterior:
                del _paciente_anterior[instance.pk]
    
    except Exception as e:
        # No fallar la operación principal si falla el registro de historial
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error en signal de Paciente: {e}", exc_info=True)
