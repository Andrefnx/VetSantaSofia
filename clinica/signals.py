"""
Señales para crear cobros pendientes automáticamente
cuando se guarda una Consulta o Hospitalización
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Consulta, Hospitalizacion
from caja.services import crear_cobro_pendiente_desde_consulta, crear_cobro_pendiente_desde_hospitalizacion


# ⚠️ SIGNAL DESACTIVADA - Los cobros pendientes se crean manualmente en las vistas
# para evitar timing issues con ManyToMany fields (servicios, insumos_detalle)
# Ver: clinica/views.py -> crear_consulta() y actualizar_consulta()
#
# @receiver(post_save, sender=Consulta)
# def crear_cobro_desde_consulta(sender, instance, created, **kwargs):
#     """
#     Crea un cobro pendiente automáticamente cuando se guarda una consulta
#     Solo si no existe ya un cobro asociado
#     """
#     # Solo si la consulta es nueva o si no tiene venta asociada
#     if not hasattr(instance, 'venta') or not instance.venta:
#         # Verificar que tenga servicios o insumos
#         tiene_servicios = instance.servicios.exists()
#         tiene_insumos = instance.insumos_detalle.exists()
#         
#         if tiene_servicios or tiene_insumos:
#             try:
#                 # Usar el veterinario como usuario de creación
#                 usuario = instance.veterinario if instance.veterinario else instance.paciente.propietario
#                 crear_cobro_pendiente_desde_consulta(instance, usuario)
#             except Exception as e:
#                 # Loguear el error pero no interrumpir el guardado
#                 print(f"Error al crear cobro desde consulta {instance.id}: {str(e)}")


# ⚠️ SIGNAL DESACTIVADA - Los cobros pendientes se crean manualmente en crear_alta_medica()
# para tener control completo sobre el flujo y evitar duplicados
# Ver: clinica/views.py -> crear_alta_medica()
#
# @receiver(post_save, sender=Hospitalizacion)
# def crear_cobro_desde_hospitalizacion(sender, instance, created, **kwargs):
#     """
#     Crea un cobro pendiente cuando se da de alta una hospitalización
#     """
#     # Solo si la hospitalización está en estado 'alta' y no tiene venta
#     if instance.estado == 'alta' and (not hasattr(instance, 'venta') or not instance.venta):
#         # Verificar que tenga insumos o cirugías
#         tiene_insumos = instance.insumos_detalle.exists()
#         tiene_cirugias = instance.cirugias.exists()
#         
#         if tiene_insumos or tiene_cirugias:
#             try:
#                 usuario = instance.veterinario if instance.veterinario else instance.paciente.propietario
#                 crear_cobro_pendiente_desde_hospitalizacion(instance, usuario)
#             except Exception as e:
#                 print(f"Error al crear cobro desde hospitalización {instance.id}: {str(e)}")
