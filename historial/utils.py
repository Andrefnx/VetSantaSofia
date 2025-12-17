"""
Utilidades para el sistema de historial y trazabilidad.

Este módulo proporciona funciones helper para simplificar el registro
de eventos históricos en todo el sistema.
"""
from .models import RegistroHistorico


def registrar_creacion(entidad, objeto_id, nombre_objeto, usuario=None, datos_adicionales=None):
    """
    Registra la creación de una nueva entidad.
    
    Args:
        entidad (str): 'inventario', 'servicio' o 'paciente'
        objeto_id (int): ID del objeto creado
        nombre_objeto (str): Nombre descriptivo del objeto
        usuario (User, optional): Usuario que creó el objeto
        datos_adicionales (dict, optional): Datos adicionales del objeto
    
    Returns:
        RegistroHistorico or None
    """
    descripcion = f"Creado: {nombre_objeto}"
    
    datos_cambio = {
        'nombre': nombre_objeto,
    }
    
    if datos_adicionales:
        datos_cambio.update(datos_adicionales)
    
    return RegistroHistorico.registrar_evento(
        entidad=entidad,
        objeto_id=objeto_id,
        tipo_evento='creacion',
        descripcion=descripcion,
        usuario=usuario,
        datos_cambio=datos_cambio,
        criticidad='baja'
    )


def registrar_cambio_precio(entidad, objeto_id, nombre_objeto, precio_anterior, 
                           precio_nuevo, usuario=None):
    """
    Registra un cambio de precio.
    
    Args:
        entidad (str): 'inventario' o 'servicio'
        objeto_id (int): ID del objeto
        nombre_objeto (str): Nombre del objeto
        precio_anterior (Decimal/int): Precio anterior
        precio_nuevo (Decimal/int): Precio nuevo
        usuario (User, optional): Usuario responsable
    
    Returns:
        RegistroHistorico or None
    """
    tipo_evento = 'actualizacion_precio' if entidad == 'inventario' else 'cambio_precio_servicio'
    
    # Convertir Decimal a float para evitar problemas de serialización
    from decimal import Decimal
    precio_ant = float(precio_anterior) if precio_anterior else 0
    precio_nvo = float(precio_nuevo)
    
    # Calcular porcentaje de cambio
    if precio_ant and precio_ant > 0:
        cambio_porcentual = ((precio_nvo - precio_ant) / precio_ant) * 100
    else:
        cambio_porcentual = None
    
    descripcion = f"{nombre_objeto}: Precio ${precio_ant:,.0f} → ${precio_nvo:,.0f}"
    
    datos_cambio = {
        'campo': 'precio',
        'antes': precio_ant if precio_ant > 0 else None,
        'despues': precio_nvo,
        'cambio_porcentual': round(float(cambio_porcentual), 2) if cambio_porcentual else None,
    }
    
    return RegistroHistorico.registrar_evento(
        entidad=entidad,
        objeto_id=objeto_id,
        tipo_evento=tipo_evento,
        descripcion=descripcion,
        usuario=usuario,
        datos_cambio=datos_cambio,
        criticidad='alta'
    )


def registrar_cambio_stock(objeto_id, nombre_insumo, tipo_movimiento, 
                          stock_anterior, stock_nuevo, usuario=None):
    """
    Registra cambios en el stock de inventario.
    
    Args:
        objeto_id (int): ID del insumo
        nombre_insumo (str): Nombre del insumo
        tipo_movimiento (str): 'ingreso_stock' o 'salida_stock'
        stock_anterior (int): Stock anterior
        stock_nuevo (int): Stock nuevo
        usuario (User, optional): Usuario responsable
    
    Returns:
        RegistroHistorico or None
    """
    diferencia = stock_nuevo - stock_anterior
    
    if tipo_movimiento == 'ingreso_stock':
        descripcion = f"{nombre_insumo}: +{diferencia} unidades (Stock: {stock_anterior} → {stock_nuevo})"
    else:
        descripcion = f"{nombre_insumo}: -{abs(diferencia)} unidades (Stock: {stock_anterior} → {stock_nuevo})"
    
    datos_cambio = {
        'campo': 'stock_actual',
        'antes': stock_anterior,
        'despues': stock_nuevo,
        'diferencia': diferencia,
    }
    
    return RegistroHistorico.registrar_evento(
        entidad='inventario',
        objeto_id=objeto_id,
        tipo_evento=tipo_movimiento,
        descripcion=descripcion,
        usuario=usuario,
        datos_cambio=datos_cambio,
        criticidad='media'
    )


def registrar_cambio_propietario(paciente_id, nombre_paciente, propietario_anterior, 
                                propietario_nuevo, usuario=None):
    """
    Registra el cambio de propietario de un paciente.
    
    Args:
        paciente_id (int): ID del paciente
        nombre_paciente (str): Nombre del paciente
        propietario_anterior (Propietario): Propietario anterior
        propietario_nuevo (Propietario): Nuevo propietario
        usuario (User, optional): Usuario responsable
    
    Returns:
        RegistroHistorico or None
    """
    descripcion = (
        f"{nombre_paciente}: Transferido de {propietario_anterior.nombre_completo} "
        f"a {propietario_nuevo.nombre_completo}"
    )
    
    datos_cambio = {
        'campo': 'propietario',
        'antes': {
            'id': propietario_anterior.id,
            'nombre': propietario_anterior.nombre_completo,
            'telefono': propietario_anterior.telefono,
        },
        'despues': {
            'id': propietario_nuevo.id,
            'nombre': propietario_nuevo.nombre_completo,
            'telefono': propietario_nuevo.telefono,
        },
    }
    
    return RegistroHistorico.registrar_evento(
        entidad='paciente',
        objeto_id=paciente_id,
        tipo_evento='cambio_propietario',
        descripcion=descripcion,
        usuario=usuario,
        datos_cambio=datos_cambio,
        criticidad='alta'
    )


def registrar_actualizacion_peso(paciente_id, nombre_paciente, peso_anterior, 
                                peso_nuevo, usuario=None):
    """
    Registra la actualización del peso de un paciente.
    
    Args:
        paciente_id (int): ID del paciente
        nombre_paciente (str): Nombre del paciente
        peso_anterior (Decimal): Peso anterior
        peso_nuevo (Decimal): Peso nuevo
        usuario (User, optional): Usuario responsable
    
    Returns:
        RegistroHistorico or None
    """
    if peso_anterior:
        # Convertir a Decimal para evitar problemas de tipos
        from decimal import Decimal
        peso_ant = Decimal(str(peso_anterior)) if not isinstance(peso_anterior, Decimal) else peso_anterior
        peso_nvo = Decimal(str(peso_nuevo)) if not isinstance(peso_nuevo, Decimal) else peso_nuevo
        diferencia = peso_nvo - peso_ant
        if diferencia > 0:
            descripcion = f"{nombre_paciente}: Aumentó {diferencia}kg ({peso_anterior}kg → {peso_nuevo}kg)"
        else:
            descripcion = f"{nombre_paciente}: Disminuyó {abs(diferencia)}kg ({peso_anterior}kg → {peso_nuevo}kg)"
    else:
        descripcion = f"{nombre_paciente}: Peso inicial registrado: {peso_nuevo}kg"
    
    datos_cambio = {
        'campo': 'ultimo_peso',
        'antes': float(peso_anterior) if peso_anterior else None,
        'despues': float(peso_nuevo),
        'diferencia': float(diferencia) if peso_anterior else None,
    }
    
    return RegistroHistorico.registrar_evento(
        entidad='paciente',
        objeto_id=paciente_id,
        tipo_evento='actualizacion_peso',
        descripcion=descripcion,
        usuario=usuario,
        datos_cambio=datos_cambio,
        criticidad='media'
    )


def registrar_actualizacion_antecedentes(paciente_id, nombre_paciente, campo_modificado, 
                                        valor_anterior, valor_nuevo, usuario=None):
    """
    Registra cambios en antecedentes médicos críticos.
    
    Args:
        paciente_id (int): ID del paciente
        nombre_paciente (str): Nombre del paciente
        campo_modificado (str): Campo que cambió (alergias, enfermedades_cronicas, etc)
        valor_anterior (str): Valor anterior
        valor_nuevo (str): Valor nuevo
        usuario (User, optional): Usuario responsable
    
    Returns:
        RegistroHistorico or None
    """
    campos_nombres = {
        'alergias': 'Alergias',
        'enfermedades_cronicas': 'Enfermedades Crónicas',
        'medicamentos_actuales': 'Medicamentos Actuales',
        'cirugia_previa': 'Cirugías Previas',
    }
    
    nombre_campo = campos_nombres.get(campo_modificado, campo_modificado)
    descripcion = f"{nombre_paciente}: Actualización de {nombre_campo}"
    
    datos_cambio = {
        'campo': campo_modificado,
        'antes': valor_anterior,
        'despues': valor_nuevo,
    }
    
    return RegistroHistorico.registrar_evento(
        entidad='paciente',
        objeto_id=paciente_id,
        tipo_evento='actualizacion_antecedentes',
        descripcion=descripcion,
        usuario=usuario,
        datos_cambio=datos_cambio,
        criticidad='critica'
    )


def registrar_cambio_estado(entidad, objeto_id, nombre_objeto, activo, usuario=None):
    """
    Registra la activación o desactivación de una entidad.
    
    Args:
        entidad (str): 'servicio' o 'paciente'
        objeto_id (int): ID del objeto
        nombre_objeto (str): Nombre del objeto
        activo (bool): True si se activó, False si se desactivó
        usuario (User, optional): Usuario responsable
    
    Returns:
        RegistroHistorico or None
    """
    tipo_evento = 'activacion' if activo else 'desactivacion'
    accion = 'Activado' if activo else 'Desactivado'
    descripcion = f"{nombre_objeto}: {accion}"
    
    datos_cambio = {
        'campo': 'activo',
        'despues': activo,
    }
    
    return RegistroHistorico.registrar_evento(
        entidad=entidad,
        objeto_id=objeto_id,
        tipo_evento=tipo_evento,
        descripcion=descripcion,
        usuario=usuario,
        datos_cambio=datos_cambio,
        criticidad='media'
    )


def registrar_modificacion_informacion(entidad, objeto_id, nombre_objeto, 
                                      campos_modificados, usuario=None, valores_anteriores=None, valores_nuevos=None):
    """
    Registra modificaciones generales de información.
    
    Args:
        entidad (str): 'inventario', 'servicio' o 'paciente'
        objeto_id (int): ID del objeto
        nombre_objeto (str): Nombre del objeto
        campos_modificados (list): Lista de nombres de campos modificados
        usuario (User, optional): Usuario responsable
        valores_anteriores (dict, optional): Valores anteriores de los campos {campo: valor}
        valores_nuevos (dict, optional): Valores nuevos de los campos {campo: valor}
    
    Returns:
        RegistroHistorico or None
    """
    if len(campos_modificados) == 1:
        campo = campos_modificados[0]
        # Si tenemos los valores, mostrarlos
        if valores_anteriores and valores_nuevos and campo in valores_anteriores and campo in valores_nuevos:
            val_ant = valores_anteriores[campo] or "(vacío)"
            val_nvo = valores_nuevos[campo] or "(vacío)"
            descripcion = f"{nombre_objeto}: {campo}: '{val_ant}' → '{val_nvo}'"
        else:
            descripcion = f"{nombre_objeto}: Modificado campo '{campo}'"
    else:
        # Listar todos los campos modificados con sus valores
        if valores_anteriores and valores_nuevos:
            cambios_texto = []
            for campo in campos_modificados:
                if campo in valores_anteriores and campo in valores_nuevos:
                    val_ant = valores_anteriores[campo] or "(vacío)"
                    val_nvo = valores_nuevos[campo] or "(vacío)"
                    cambios_texto.append(f"{campo}: '{val_ant}' → '{val_nvo}'")
                else:
                    cambios_texto.append(campo)
            descripcion = f"{nombre_objeto}: {' | '.join(cambios_texto)}"
        else:
            campos_formateados = "', '".join(campos_modificados)
            descripcion = f"{nombre_objeto}: Modificados campos: '{campos_formateados}'"
    
    datos_cambio = {
        'campos_modificados': campos_modificados,
    }
    if valores_anteriores:
        datos_cambio['valores_anteriores'] = valores_anteriores
    if valores_nuevos:
        datos_cambio['valores_nuevos'] = valores_nuevos
    
    return RegistroHistorico.registrar_evento(
        entidad=entidad,
        objeto_id=objeto_id,
        tipo_evento='modificacion_informacion',
        descripcion=descripcion,
        usuario=usuario,
        datos_cambio=datos_cambio,
        criticidad='baja'
    )
