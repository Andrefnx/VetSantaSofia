"""
Sistema de Auditoría y Trazabilidad

Este módulo proporciona un sistema centralizado para registrar
y consultar el historial de cambios en entidades del sistema.

Uso básico:
    from historial.models import RegistroHistorico
    from historial.utils import registrar_creacion, registrar_cambio_precio
    
    # Registrar un evento
    evento = registrar_creacion('servicio', 10, 'Vacunación Antirrábica', usuario=request.user)
    
    # Consultar historial
    historial = RegistroHistorico.obtener_historial('servicio', 10)
"""

# No importar modelos aquí para evitar AppRegistryNotReady
default_app_config = 'historial.apps.HistorialConfig'
