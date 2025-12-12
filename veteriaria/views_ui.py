"""
Views para la UI Preview - Sistema de Diseño Unificado
Archivo: views_ui.py

Propósito:
    Renderizar la página de vista previa de componentes UI estándar
    para el sistema de diseño unificado de Vet Santa Sofía.

Rutas:
    /ui/preview/ -> Vista previa de estándares UI
"""

from django.shortcuts import render
from django.contrib.auth.decorators import login_required


@login_required(login_url='login')
def ui_preview(request):
    """
    Vista para mostrar la página de vista previa de componentes UI estándar.
    
    Esta página muestra:
    - Botones (primarios, secundarios, peligro, neutros)
    - Inputs y formularios
    - Tablas
    - Tarjetas (Cards)
    - Modales
    - Alertas
    - Badges
    - Paleta de colores
    
    Args:
        request: HttpRequest object
        
    Returns:
        HttpResponse: Renderiza templates/ui_preview/estandares.html
    """
    context = {
        'page_title': 'Estándares UI',
        'section': 'ui_preview',
    }
    return render(request, 'ui_preview/estandares.html', context)
