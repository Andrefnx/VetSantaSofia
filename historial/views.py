"""
Vistas para el sistema de historial genérico.
"""
from django.shortcuts import render
from django.core.paginator import Paginator
from django.http import Http404
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from collections import defaultdict

from .models import RegistroHistorico


@login_required
def historial_detalle(request, entidad, objeto_id):
    """
    Vista genérica para mostrar el historial completo de cualquier entidad.
    Detecta si es una petición AJAX de la ficha de paciente y retorna template parcial.
    
    Args:
        entidad: 'inventario', 'servicio' o 'paciente'
        objeto_id: ID del objeto
    
    Returns:
        Página con timeline completo y paginación (o template parcial si es AJAX)
    """
    # Validar entidad
    entidades_validas = dict(RegistroHistorico.ENTIDAD_CHOICES)
    if entidad not in entidades_validas:
        raise Http404("Entidad no válida")
    
    # Obtener historial
    eventos = RegistroHistorico.objects.filter(
        entidad=entidad,
        objeto_id=objeto_id
    ).select_related('usuario').order_by('-fecha_evento')
    
    # Para pacientes en AJAX desde ficha_mascota, usar template parcial con paginación simple
    if entidad == 'paciente' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        # Paginación simple para AJAX
        paginator = Paginator(eventos, 20)  # 20 eventos por página
        page_number = request.GET.get('page', 1)
        page_obj = paginator.get_page(page_number)
        
        context = {
            'eventos': page_obj.object_list,
            'page_obj': page_obj,
            'objeto_id': objeto_id,
            'total_eventos': eventos.count(),
        }
        
        return render(request, 'historial/partials/historial_completo_paciente.html', context)
    
    # Para páginas completas o cuando no hay eventos
    if not eventos.exists():
        raise Http404("No se encontró historial para este objeto")
    
    # Agrupar eventos por fecha (para UI más clara)
    eventos_agrupados = agrupar_por_fecha(eventos)
    
    # Paginación
    paginator = Paginator(list(eventos_agrupados.items()), 10)  # 10 días por página
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Obtener nombre del objeto según entidad
    nombre_objeto = obtener_nombre_objeto(entidad, objeto_id)
    
    # Estadísticas rápidas
    stats = {
        'total_eventos': eventos.count(),
        'por_tipo': eventos.values('tipo_evento').annotate(
            count=Count('tipo_evento')
        ).order_by('-count')[:5],
        'por_usuario': eventos.filter(usuario__isnull=False).values(
            'usuario__nombre', 'usuario__apellido'
        ).annotate(count=Count('usuario')).order_by('-count')[:3],
    }
    
    context = {
        'entidad': entidad,
        'entidad_display': entidades_validas[entidad],
        'objeto_id': objeto_id,
        'nombre_objeto': nombre_objeto,
        'page_obj': page_obj,
        'stats': stats,
        'total_eventos': eventos.count(),
    }
    
    return render(request, 'historial/historial_detalle.html', context)


@login_required
def historial_resumen(request, entidad, objeto_id):
    """
    Vista AJAX para obtener últimos 5 eventos (para modales).
    
    Returns:
        HTML parcial con los últimos eventos
    """
    # Validar entidad
    entidades_validas = dict(RegistroHistorico.ENTIDAD_CHOICES)
    if entidad not in entidades_validas:
        raise Http404("Entidad no válida")
    
    # Obtener últimos 5 eventos
    eventos = RegistroHistorico.objects.filter(
        entidad=entidad,
        objeto_id=objeto_id
    ).select_related('usuario').order_by('-fecha_evento')[:5]
    
    context = {
        'eventos': eventos,
        'entidad': entidad,
        'objeto_id': objeto_id,
        'mostrar_mas': RegistroHistorico.objects.filter(
            entidad=entidad,
            objeto_id=objeto_id
        ).count() > 5,
    }
    
    return render(request, 'historial/partials/historial_resumen.html', context)


# ===========================
# FUNCIONES AUXILIARES
# ===========================

def agrupar_por_fecha(eventos):
    """
    Agrupa eventos por fecha (sin hora) para mejor visualización.
    
    Args:
        eventos: QuerySet de RegistroHistorico
    
    Returns:
        OrderedDict: {fecha: [eventos]}
    """
    grupos = defaultdict(list)
    
    for evento in eventos:
        # Obtener fecha sin hora
        fecha = evento.fecha_evento.date()
        grupos[fecha].append(evento)
    
    # Ordenar por fecha descendente
    return dict(sorted(grupos.items(), key=lambda x: x[0], reverse=True))


def obtener_nombre_objeto(entidad, objeto_id):
    """
    Obtiene el nombre legible del objeto según su entidad.
    
    Args:
        entidad: 'inventario', 'servicio' o 'paciente'
        objeto_id: ID del objeto
    
    Returns:
        str: Nombre del objeto o "Objeto no encontrado"
    """
    try:
        if entidad == 'inventario':
            from inventario.models import Insumo
            obj = Insumo.objects.get(pk=objeto_id)
            return f"{obj.medicamento} ({obj.marca})" if obj.marca else obj.medicamento
        
        elif entidad == 'servicio':
            from servicios.models import Servicio
            obj = Servicio.objects.get(pk=objeto_id)
            return obj.nombre
        
        elif entidad == 'paciente':
            from pacientes.models import Paciente
            obj = Paciente.objects.get(pk=objeto_id)
            return f"{obj.nombre} ({obj.get_especie_display()})"
        
    except Exception:
        pass
    
    return "Objeto no encontrado"
