"""
Utilidades para generar texto legible del historial.
"""


def generar_texto_legible(evento):
    """
    Genera texto legible a partir de un evento de historial.
    
    Args:
        evento: Instancia de RegistroHistorico
    
    Returns:
        str: Texto legible del cambio
    """
    # Si ya tiene descripción, usarla
    if evento.descripcion:
        return evento.descripcion
    
    # Si no, generar desde datos_cambio
    datos = evento.datos_cambio or {}
    tipo = evento.tipo_evento
    
    # Eventos de stock
    if tipo == 'ingreso_stock':
        diferencia = datos.get('diferencia', 0)
        return f"Ingreso de {diferencia} unidades al inventario"
    
    elif tipo == 'salida_stock':
        diferencia = abs(datos.get('diferencia', 0))
        return f"Salida de {diferencia} unidades del inventario"
    
    # Eventos de precio
    elif tipo in ['actualizacion_precio', 'cambio_precio_servicio']:
        antes = datos.get('antes')
        despues = datos.get('despues')
        if antes and despues:
            return f"Precio actualizado de ${antes:,.0f} a ${despues:,.0f}"
        return "Precio actualizado"
    
    # Eventos de propietario
    elif tipo == 'cambio_propietario':
        antes = datos.get('antes', {})
        despues = datos.get('despues', {})
        nombre_ant = antes.get('nombre', 'Desconocido') if isinstance(antes, dict) else 'Desconocido'
        nombre_nvo = despues.get('nombre', 'Desconocido') if isinstance(despues, dict) else 'Desconocido'
        return f"Transferido de {nombre_ant} a {nombre_nvo}"
    
    # Eventos de peso
    elif tipo == 'actualizacion_peso':
        antes = datos.get('antes')
        despues = datos.get('despues')
        if antes and despues:
            diferencia = despues - antes
            if diferencia > 0:
                return f"Peso aumentó {diferencia:.1f}kg ({antes}kg → {despues}kg)"
            else:
                return f"Peso disminuyó {abs(diferencia):.1f}kg ({antes}kg → {despues}kg)"
        return f"Peso registrado: {despues}kg"
    
    # Eventos de antecedentes
    elif tipo == 'actualizacion_antecedentes':
        campo = datos.get('campo', 'antecedente médico')
        campo_legible = campo.replace('_', ' ').capitalize()
        
        # Obtener valores
        antes = datos.get('antes', '').strip() if datos.get('antes') else ''
        despues = datos.get('despues', '').strip() if datos.get('despues') else ''
        
        # Truncar valores largos para el historial
        def truncar(texto, max_len=60):
            if len(texto) > max_len:
                return texto[:max_len] + '...'
            return texto
        
        # Si antes tenía valor y ahora está vacío = eliminado
        if antes and not despues:
            return f"{campo_legible}: Eliminado (antes: '{truncar(antes)}')"
        # Si antes estaba vacío y ahora tiene valor = agregado
        elif not antes and despues:
            return f"{campo_legible}: '{truncar(despues)}'"
        # Si ambos tienen valor = actualizado
        else:
            return f"{campo_legible}: '{truncar(antes)}' → '{truncar(despues)}'"
    
    # Eventos de información general
    elif tipo == 'modificacion_informacion':
        campos = datos.get('campos_modificados', [])
        if len(campos) == 1:
            return f"Campo modificado: {campos[0]}"
        elif len(campos) > 1:
            campos_texto = ", ".join(campos)
            return f"Campos modificados: {campos_texto}"
        return "Información actualizada"
    
    # Eventos de estado
    elif tipo == 'activacion':
        return "Registro activado"
    
    elif tipo == 'desactivacion':
        return "Registro desactivado"
    
    # Eventos de creación
    elif tipo == 'creacion':
        return "Registro creado"
    
    # Eventos de categoría
    elif tipo == 'cambio_categoria':
        antes = datos.get('antes')
        despues = datos.get('despues')
        if antes and despues:
            return f"Categoría cambiada de '{antes}' a '{despues}'"
        return "Categoría actualizada"
    
    # Eventos de duración
    elif tipo == 'cambio_duracion':
        antes = datos.get('antes')
        despues = datos.get('despues')
        if antes and despues:
            return f"Duración cambiada de {antes} a {despues} minutos"
        return "Duración actualizada"
    
    # Por defecto
    return evento.get_tipo_evento_display()


def obtener_icono_emoji(tipo_evento):
    """
    Obtiene el emoji correspondiente al tipo de evento.
    
    Args:
        tipo_evento: Tipo de evento
    
    Returns:
        str: Emoji Unicode
    """
    iconos = {
        'creacion': '🆕',
        'modificacion_informacion': '✏️',
        'activacion': '✅',
        'desactivacion': '🔒',
        'ingreso_stock': '➕',
        'salida_stock': '➖',
        'actualizacion_precio': '💲',
        'cambio_precio_servicio': '💲',
        'cambio_duracion': '⏱️',
        'cambio_categoria': '🏷️',
        'cambio_propietario': '🔁',
        'actualizacion_peso': '⚖️',
        'actualizacion_antecedentes': '📋',
        'modificacion_datos_basicos': '👤',
    }
    return iconos.get(tipo_evento, '📝')


def obtener_badge_criticidad(criticidad):
    """
    Obtiene la clase CSS de Bootstrap para el badge de criticidad.
    
    Args:
        criticidad: Nivel de criticidad
    
    Returns:
        str: Clase CSS
    """
    clases = {
        'baja': 'badge-secondary',
        'media': 'badge-info',
        'alta': 'badge-warning',
        'critica': 'badge-danger',
    }
    return clases.get(criticidad, 'badge-secondary')
