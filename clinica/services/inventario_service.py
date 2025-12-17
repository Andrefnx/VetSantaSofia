"""
Servicio de validación y descuento de inventario para clínica.

Este módulo proporciona funciones para validar la disponibilidad de stock
y descontar inventario al ejecutar servicios veterinarios.

FUNCIONES:
- validate_stock_for_services(): Valida stock sin modificar inventario
- discount_stock_for_services(): Descuenta stock y registra movimientos
"""

from django.core.exceptions import ValidationError
from django.db import transaction
from servicios.models import Servicio, ServicioInsumo


def validate_stock_for_services(services):
    """
    Valida que existe stock suficiente para ejecutar los servicios solicitados.
    
    Esta función verifica que todos los insumos requeridos por los servicios
    tengan stock suficiente disponible en el inventario. Si algún insumo no
    tiene stock suficiente, se lanza una excepción con detalles específicos.
    
    COMPORTAMIENTO:
    - Solo VALIDA stock disponible
    - NO descuenta ni modifica el inventario
    - NO genera movimientos de inventario
    - NO tiene efectos secundarios
    
    Args:
        services: Iterable de instancias de Servicio (puede ser QuerySet, lista, etc.)
    
    Raises:
        ValidationError: Si algún insumo tiene stock insuficiente.
                        El mensaje incluye:
                        - Nombre del insumo
                        - Cantidad requerida
                        - Stock disponible actual
    
    Returns:
        None: Si todo el stock es suficiente
    
    Example:
        >>> from servicios.models import Servicio
        >>> servicios = Servicio.objects.filter(id__in=[1, 2, 3])
        >>> try:
        >>>     validate_stock_for_services(servicios)
        >>>     print("Stock suficiente para todos los servicios")
        >>> except ValidationError as e:
        >>>     print(f"Error: {e.message}")
    
    Uso típico:
        # Antes de confirmar una cita o venta
        servicios_a_ejecutar = [servicio1, servicio2]
        validate_stock_for_services(servicios_a_ejecutar)
        # Si no hay error, proceder con la operación
    """
    
    # Diccionario para acumular cantidades requeridas por insumo
    # {insumo_id: cantidad_total_requerida}
    insumos_requeridos = {}
    
    # Referenciar objetos insumo para no hacer múltiples queries
    # {insumo_id: objeto_insumo}
    insumos_cache = {}
    
    # Iterar sobre cada servicio
    for servicio in services:
        # Obtener todos los insumos asociados a este servicio
        servicios_insumos = ServicioInsumo.objects.filter(servicio=servicio).select_related('insumo')
        
        for servicio_insumo in servicios_insumos:
            insumo = servicio_insumo.insumo
            cantidad_requerida = servicio_insumo.cantidad
            
            # Acumular cantidades si el mismo insumo se usa en múltiples servicios
            if insumo.idInventario in insumos_requeridos:
                insumos_requeridos[insumo.idInventario] += cantidad_requerida
            else:
                insumos_requeridos[insumo.idInventario] = cantidad_requerida
                insumos_cache[insumo.idInventario] = insumo
    
    # Validar stock disponible para cada insumo
    errores = []
    
    for insumo_id, cantidad_requerida in insumos_requeridos.items():
        insumo = insumos_cache[insumo_id]
        stock_disponible = insumo.stock_actual
        
        # Si el stock es insuficiente, agregar al listado de errores
        if stock_disponible < cantidad_requerida:
            error_msg = (
                f"Stock insuficiente para '{insumo.medicamento}': "
                f"Se requieren {cantidad_requerida} unidades, "
                f"pero solo hay {stock_disponible} disponibles."
            )
            errores.append(error_msg)
    
    # Si hay errores, lanzar ValidationError con todos los mensajes
    if errores:
        mensaje_completo = "No hay stock suficiente para ejecutar los servicios:\n" + "\n".join(errores)
        raise ValidationError(mensaje_completo)
    
    # Si no hay errores, simplemente retornar (validación exitosa)
    return None


def validate_stock_for_single_service(servicio):
    """
    Valida stock para un único servicio.
    
    Función auxiliar que envuelve validate_stock_for_services para
    validar un solo servicio.
    
    Args:
        servicio: Instancia de Servicio
    
    Raises:
        ValidationError: Si algún insumo del servicio tiene stock insuficiente
    
    Returns:
        None: Si el stock es suficiente
    
    Example:
        >>> from servicios.models import Servicio
        >>> servicio = Servicio.objects.get(id=1)
        >>> validate_stock_for_single_service(servicio)
    """
    return validate_stock_for_services([servicio])


def discount_stock_for_services(services, user, origen_obj):
    """
    Descuenta stock del inventario para los servicios ejecutados.
    
    Esta función realiza el descuento real de inventario al ejecutar servicios.
    Utiliza transacciones atómicas para garantizar que TODOS los descuentos
    se apliquen correctamente o NINGUNO se aplique (no descuentos parciales).
    
    COMPORTAMIENTO CRÍTICO:
    - Valida stock ANTES de descontar (falla rápido si hay insuficiencia)
    - Usa transaction.atomic() para garantizar atomicidad
    - Descuenta Insumo.stock_actual basado en ServicioInsumo.cantidad
    - Si cualquier operación falla, hace ROLLBACK completo
    - NO permite descuentos parciales
    
    AUDITORÍA:
    - Prepara datos para auditoría de movimientos de inventario
    - TODO: Implementar modelo de auditoría (MovimientoInventario o similar)
    - Registrar: usuario, fecha/hora, origen, insumos afectados, cantidades
    
    Args:
        services: Iterable de instancias de Servicio
        user: Usuario que ejecuta la operación (para auditoría)
        origen_obj: Objeto origen del descuento (Cita, Venta, Consulta, etc.)
                   Se almacenará la referencia para trazabilidad
    
    Raises:
        ValidationError: Si hay stock insuficiente (antes de descontar)
        Exception: Cualquier error durante el descuento causa rollback completo
    
    Returns:
        dict: Información sobre el descuento realizado:
              {
                  'success': True,
                  'insumos_descontados': [
                      {'insumo_id': 1, 'medicamento': 'X', 'cantidad': 2},
                      ...
                  ],
                  'mensaje': 'Descuento realizado exitosamente'
              }
    
    Example:
        >>> from servicios.models import Servicio
        >>> from cuentas.models import Usuario
        >>> 
        >>> servicios = Servicio.objects.filter(id__in=[1, 2])
        >>> usuario = Usuario.objects.get(id=1)
        >>> origen = consulta_obj  # Objeto de origen
        >>> 
        >>> try:
        >>>     resultado = discount_stock_for_services(servicios, usuario, origen)
        >>>     print(f"Éxito: {resultado['mensaje']}")
        >>> except ValidationError as e:
        >>>     print(f"Error de stock: {e.message}")
        >>> except Exception as e:
        >>>     print(f"Error en descuento: {str(e)}")
    
    Notas de implementación:
        - El descuento es IRREVERSIBLE sin intervención manual
        - Se recomienda validar stock antes de confirmar operaciones
        - Considerar implementar sistema de reversión para casos excepcionales
    
    IMPORTANTE - PREVENCIÓN DE DESCUENTO DUPLICADO:
        - Si origen_obj tiene el atributo 'insumos_descontados', se verifica que sea False
        - Si ya fue descontado (True), se lanza ValidationError
        - Después del descuento exitoso, se marca el flag como True
        - Esto previene descuentos accidentales duplicados
    """
    
    # PASO 0: Verificar si el objeto origen ya tuvo sus insumos descontados
    # Prevenir descuentos duplicados
    if hasattr(origen_obj, 'insumos_descontados'):
        if origen_obj.insumos_descontados:
            raise ValidationError(
                f"Los insumos de este {origen_obj.__class__.__name__} ya fueron descontados del inventario. "
                f"No es posible realizar descuentos duplicados."
            )
    
    # PASO 1: Validar stock ANTES de hacer cualquier modificación
    # Si falla, se lanza ValidationError y no se ejecuta nada más
    validate_stock_for_services(services)
    
    # PASO 2: Preparar estructura para acumular descuentos
    # {insumo_id: {'insumo': objeto, 'cantidad': total}}
    descuentos_a_realizar = {}
    
    # Iterar servicios para acumular descuentos necesarios
    for servicio in services:
        servicios_insumos = ServicioInsumo.objects.filter(servicio=servicio).select_related('insumo')
        
        for servicio_insumo in servicios_insumos:
            insumo = servicio_insumo.insumo
            cantidad = servicio_insumo.cantidad
            
            if insumo.idInventario in descuentos_a_realizar:
                descuentos_a_realizar[insumo.idInventario]['cantidad'] += cantidad
            else:
                descuentos_a_realizar[insumo.idInventario] = {
                    'insumo': insumo,
                    'cantidad': cantidad
                }
    
    # PASO 3: Ejecutar descuentos dentro de transacción atómica
    # Si cualquier operación falla, TODO se revierte automáticamente
    try:
        with transaction.atomic():
            insumos_descontados = []
            
            # Realizar descuentos
            for insumo_id, datos in descuentos_a_realizar.items():
                insumo = datos['insumo']
                cantidad_a_descontar = datos['cantidad']
                
                # Descontar del stock actual
                insumo.stock_actual -= cantidad_a_descontar
                
                # Validación adicional de seguridad (no debería fallar si validate_stock funcionó)
                if insumo.stock_actual < 0:
                    raise ValidationError(
                        f"Error crítico: Stock negativo para '{insumo.medicamento}'. "
                        f"Esto no debería ocurrir. Contacte al administrador."
                    )
                
                # Guardar cambios
                insumo.save()
                
                # Registrar para respuesta
                insumos_descontados.append({
                    'insumo_id': insumo.idInventario,
                    'medicamento': insumo.medicamento,
                    'cantidad_descontada': cantidad_a_descontar,
                    'stock_restante': insumo.stock_actual
                })
            
            # TODO: IMPLEMENTAR AUDITORÍA DE MOVIMIENTOS DE INVENTARIO
            # Cuando se implemente el modelo de auditoría, agregar aquí:
            #
            # from inventario.models import MovimientoInventario
            # 
            # for item in insumos_descontados:
            #     MovimientoInventario.objects.create(
            #         insumo_id=item['insumo_id'],
            #         tipo_movimiento='DESCUENTO_SERVICIO',
            #         cantidad=item['cantidad_descontada'],
            #         usuario=user,
            #         origen_tipo=origen_obj.__class__.__name__,
            #         origen_id=origen_obj.id,
            #         observaciones=f"Descuento por servicios ejecutados",
            #         fecha=timezone.now()
            #     )
            #
            # Estructura recomendada para modelo MovimientoInventario:
            # - insumo: ForeignKey(Insumo)
            # - tipo_movimiento: CharField (ENTRADA, SALIDA, DESCUENTO_SERVICIO, AJUSTE, etc.)
            # - cantidad: IntegerField (positivo o negativo según tipo)
            # - stock_anterior: IntegerField
            # - stock_posterior: IntegerField
            # - usuario: ForeignKey(User)
            # - origen_tipo: CharField (ContentType o nombre de modelo)
            # - origen_id: IntegerField (ID del objeto origen)
            # - fecha: DateTimeField(auto_now_add=True)
            # - observaciones: TextField
            
            # PASO 4: Marcar el objeto origen como "insumos descontados"
            # Esto previene descuentos duplicados en futuras operaciones
            if hasattr(origen_obj, 'insumos_descontados'):
                origen_obj.insumos_descontados = True
                origen_obj.save(update_fields=['insumos_descontados'])
            
            # Si llegamos aquí, todo fue exitoso
            return {
                'success': True,
                'insumos_descontados': insumos_descontados,
                'mensaje': f'Se descontaron {len(insumos_descontados)} insumos del inventario exitosamente.',
                'total_items': len(insumos_descontados)
            }
    
    except ValidationError:
        # Re-lanzar ValidationError tal cual
        raise
    
    except Exception as e:
        # Cualquier otro error causa rollback automático por transaction.atomic()
        # Envolver en excepción más descriptiva
        raise Exception(
            f"Error al descontar inventario: {str(e)}. "
            f"Todos los cambios fueron revertidos automáticamente."
        ) from e
