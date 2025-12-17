"""
EJEMPLO DE INTEGRACIÓN: Sistema de Descuento de Stock
Muestra cómo integrar el descuento de insumos en las vistas
"""

from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from clinica.models import Consulta, Hospitalizacion

# =============================================================================
# EJEMPLO 1: Confirmar Consulta (Endpoint API)
# =============================================================================

@login_required
@require_http_methods(["POST"])
def confirmar_consulta_api(request, consulta_id):
    """
    Confirma una consulta y descuenta insumos del inventario.
    
    URL sugerida: /clinica/consultas/<consulta_id>/confirmar/
    Método: POST
    Body: {
        "dias_tratamiento": 1  // opcional, default 1
    }
    """
    try:
        consulta = get_object_or_404(Consulta, pk=consulta_id)
        
        # Obtener días de tratamiento
        import json
        data = json.loads(request.body) if request.body else {}
        dias_tratamiento = int(data.get('dias_tratamiento', 1))
        
        # DESCUENTO DE STOCK AQUÍ
        resultado = consulta.confirmar_y_descontar_insumos(
            usuario=request.user,
            dias_tratamiento=dias_tratamiento
        )
        
        return JsonResponse({
            'success': True,
            'message': resultado['message'],
            'total_items': resultado['total_items'],
            'detalles': resultado['insumos_descontados']
        })
        
    except ValidationError as e:
        # Stock insuficiente o ya descontado
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)
    
    except Exception as e:
        # Error inesperado
        return JsonResponse({
            'success': False,
            'error': f'Error al confirmar consulta: {str(e)}'
        }, status=500)


# =============================================================================
# EJEMPLO 2: Finalizar Hospitalización
# =============================================================================

@login_required
@require_http_methods(["POST"])
def finalizar_hospitalizacion_api(request, hospitalizacion_id):
    """
    Finaliza una hospitalización y descuenta insumos.
    
    URL sugerida: /clinica/hospitalizaciones/<hospitalizacion_id>/finalizar/
    Método: POST
    Body: {
        "dias_tratamiento": null  // opcional, se calcula automático si null
    }
    """
    try:
        hosp = get_object_or_404(Hospitalizacion, pk=hospitalizacion_id)
        
        import json
        data = json.loads(request.body) if request.body else {}
        dias_tratamiento = data.get('dias_tratamiento')  # Puede ser None
        
        # DESCUENTO DE STOCK AQUÍ
        resultado = hosp.finalizar_y_descontar_insumos(
            usuario=request.user,
            dias_tratamiento=dias_tratamiento
        )
        
        return JsonResponse({
            'success': True,
            'message': resultado['message'],
            'total_items': resultado['total_items'],
            'dias_tratamiento': resultado.get('dias_tratamiento'),
            'detalles': resultado['insumos_descontados']
        })
        
    except ValidationError as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error al finalizar hospitalización: {str(e)}'
        }, status=500)


# =============================================================================
# EJEMPLO 3: Verificar disponibilidad de stock ANTES de confirmar
# =============================================================================

@login_required
@require_http_methods(["GET"])
def verificar_stock_consulta(request, consulta_id):
    """
    Verifica si hay stock suficiente para confirmar la consulta.
    
    URL sugerida: /clinica/consultas/<consulta_id>/verificar-stock/
    Método: GET
    Query params: ?dias_tratamiento=1
    """
    try:
        consulta = get_object_or_404(Consulta, pk=consulta_id)
        dias_tratamiento = int(request.GET.get('dias_tratamiento', 1))
        
        # Si ya confirmada
        if consulta.insumos_descontados:
            return JsonResponse({
                'success': True,
                'confirmada': True,
                'message': 'Consulta ya confirmada previamente'
            })
        
        # Verificar cada insumo
        insumos_detalle = consulta.insumos_detalle.all()
        verificacion = []
        hay_problemas = False
        
        for detalle in insumos_detalle:
            resultado = detalle.insumo.calcular_envases_requeridos(
                peso_paciente_kg=float(detalle.peso_paciente),
                dias_tratamiento=dias_tratamiento
            )
            
            envases_requeridos = resultado['envases_requeridos']
            stock_disponible = detalle.insumo.stock_actual
            
            suficiente = stock_disponible >= envases_requeridos
            
            if not suficiente:
                hay_problemas = True
            
            verificacion.append({
                'insumo': detalle.insumo.medicamento,
                'envases_requeridos': envases_requeridos,
                'stock_disponible': stock_disponible,
                'suficiente': suficiente,
                'faltante': max(0, envases_requeridos - stock_disponible)
            })
        
        return JsonResponse({
            'success': True,
            'confirmada': False,
            'puede_confirmar': not hay_problemas,
            'insumos': verificacion
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


# =============================================================================
# EJEMPLO 4: URLs (clinica/urls.py)
# =============================================================================

"""
Agregar a clinica/urls.py:

from django.urls import path
from . import views_descuento  # Este archivo

urlpatterns = [
    # ... otras URLs ...
    
    # Descuento de stock
    path('consultas/<int:consulta_id>/confirmar/', 
         views_descuento.confirmar_consulta_api, 
         name='confirmar_consulta'),
    
    path('consultas/<int:consulta_id>/verificar-stock/', 
         views_descuento.verificar_stock_consulta, 
         name='verificar_stock_consulta'),
    
    path('hospitalizaciones/<int:hospitalizacion_id>/finalizar/', 
         views_descuento.finalizar_hospitalizacion_api, 
         name='finalizar_hospitalizacion'),
]
"""


# =============================================================================
# EJEMPLO 5: JavaScript Frontend
# =============================================================================

"""
// En clinica/static/js/consultas.js

function verificarStockConsulta(consultaId, diasTratamiento = 1) {
    return $.ajax({
        url: `/clinica/consultas/${consultaId}/verificar-stock/`,
        method: 'GET',
        data: { dias_tratamiento: diasTratamiento }
    });
}

function confirmarConsulta(consultaId, diasTratamiento = 1) {
    // Primero verificar stock
    verificarStockConsulta(consultaId, diasTratamiento)
        .then(response => {
            if (response.confirmada) {
                alert('✅ Esta consulta ya fue confirmada previamente');
                return;
            }
            
            if (!response.puede_confirmar) {
                // Mostrar problemas de stock
                let mensaje = '⚠️ Stock insuficiente para:\\n\\n';
                response.insumos.forEach(item => {
                    if (!item.suficiente) {
                        mensaje += `• ${item.insumo}: Faltan ${item.faltante} envases\\n`;
                    }
                });
                alert(mensaje);
                return;
            }
            
            // Stock OK, confirmar
            if (confirm('¿Confirmar esta consulta? Se descontará el stock de inventario.')) {
                $.ajax({
                    url: `/clinica/consultas/${consultaId}/confirmar/`,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        dias_tratamiento: diasTratamiento
                    }),
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    success: function(result) {
                        alert(result.message);
                        
                        // Mostrar resumen
                        console.log('Insumos descontados:');
                        result.detalles.forEach(item => {
                            console.log(`- ${item.insumo}: ${item.envases_descontados} envases`);
                        });
                        
                        // Recargar o actualizar UI
                        location.reload();
                    },
                    error: function(xhr) {
                        const error = xhr.responseJSON?.error || 'Error desconocido';
                        alert(`❌ Error: ${error}`);
                    }
                });
            }
        })
        .catch(error => {
            alert('Error al verificar stock');
            console.error(error);
        });
}

// Uso en HTML:
// <button onclick="confirmarConsulta(123, 1)">Confirmar Consulta</button>
"""


# =============================================================================
# EJEMPLO 6: Integrar en vista existente de guardar consulta
# =============================================================================

def guardar_y_confirmar_consulta(request, paciente_id):
    """
    Ejemplo de cómo integrar el descuento en una vista existente.
    Esta función guarda la consulta Y opcionalmente la confirma.
    """
    if request.method == 'POST':
        import json
        data = json.loads(request.body)
        
        # ... código existente para guardar consulta ...
        consulta = Consulta.objects.create(...)
        
        # Si el usuario quiere confirmar inmediatamente
        confirmar_ahora = data.get('confirmar_ahora', False)
        
        if confirmar_ahora:
            try:
                dias = data.get('dias_tratamiento', 1)
                resultado = consulta.confirmar_y_descontar_insumos(
                    usuario=request.user,
                    dias_tratamiento=dias
                )
                
                return JsonResponse({
                    'success': True,
                    'consulta_id': consulta.pk,
                    'confirmada': True,
                    'descuento': resultado
                })
                
            except ValidationError as e:
                # Stock insuficiente - revertir creación de consulta
                consulta.delete()
                
                return JsonResponse({
                    'success': False,
                    'error': f'No se pudo confirmar: {str(e)}'
                }, status=400)
        
        # Solo guardada, sin confirmar
        return JsonResponse({
            'success': True,
            'consulta_id': consulta.pk,
            'confirmada': False,
            'message': 'Consulta guardada. Confirma para descontar stock.'
        })


# =============================================================================
# RESUMEN DE INTEGRACIÓN
# =============================================================================

"""
PASOS PARA INTEGRAR:

1. BACKEND (Django):
   ✓ Modelos ya tienen métodos confirmar_y_descontar_insumos()
   ✓ Crear endpoints en urls.py
   ✓ Implementar vistas (ejemplos arriba)

2. FRONTEND (JavaScript):
   ✓ Agregar botón "Confirmar Consulta" en ficha
   ✓ Llamar a verificar-stock antes de confirmar
   ✓ Mostrar alertas si stock insuficiente
   ✓ Confirmar con AJAX POST

3. UI/UX:
   ✓ Badge en consulta: "Pendiente" / "Confirmada"
   ✓ Deshabilitar botón si ya confirmada
   ✓ Mostrar resumen de descuento exitoso
   ✓ Alertas de stock bajo

4. TESTING:
   ✓ Probar con stock suficiente
   ✓ Probar con stock insuficiente
   ✓ Probar doble confirmación (debe fallar)
   ✓ Probar rollback si falla un insumo
"""
