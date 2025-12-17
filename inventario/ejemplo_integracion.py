"""
EJEMPLO DE INTEGRACIÓN: calcular_envases_requeridos()

Este archivo muestra cómo integrar el cálculo de envases en las vistas existentes.
NO es parte del código productivo - solo documentación de integración.
"""

# =============================================================================
# EJEMPLO 1: Usar en vista de consulta (ficha del paciente)
# =============================================================================

def ejemplo_vista_consulta(request, paciente_id):
    """
    Ejemplo de cómo calcular envases requeridos en la ficha de consulta
    """
    from inventario.models import Insumo
    from pacientes.models import Paciente
    
    # Obtener paciente
    paciente = Paciente.objects.get(idPaciente=paciente_id)
    peso_paciente = paciente.peso  # en kg
    
    # Obtener insumo seleccionado
    insumo_id = request.POST.get('insumo_id')
    insumo = Insumo.objects.get(idInventario=insumo_id)
    
    # Días de tratamiento (puede venir del formulario o ser default 1)
    dias_tratamiento = int(request.POST.get('dias_tratamiento', 1))
    
    # CALCULAR ENVASES REQUERIDOS
    resultado = insumo.calcular_envases_requeridos(
        peso_paciente_kg=peso_paciente,
        dias_tratamiento=dias_tratamiento
    )
    
    # Verificar si hay stock suficiente
    stock_disponible = insumo.stock_actual
    envases_requeridos = resultado['envases_requeridos']
    hay_stock_suficiente = stock_disponible >= envases_requeridos
    
    # Preparar respuesta
    contexto = {
        'insumo': insumo,
        'envases_requeridos': envases_requeridos,
        'stock_disponible': stock_disponible,
        'hay_stock_suficiente': hay_stock_suficiente,
        'calculo_automatico': resultado['calculo_automatico'],
        'detalle_calculo': resultado['detalle'],
        'dosis_total': resultado['dosis_calculada'],
    }
    
    return contexto


# =============================================================================
# EJEMPLO 2: API endpoint para calcular envases (AJAX)
# =============================================================================

def ejemplo_api_calcular_envases(request):
    """
    Endpoint AJAX para calcular envases requeridos desde el frontend
    """
    from django.http import JsonResponse
    from inventario.models import Insumo
    
    if request.method == 'POST':
        insumo_id = request.POST.get('insumo_id')
        peso_paciente = float(request.POST.get('peso_paciente', 0))
        dias_tratamiento = int(request.POST.get('dias_tratamiento', 1))
        
        try:
            insumo = Insumo.objects.get(idInventario=insumo_id)
            
            resultado = insumo.calcular_envases_requeridos(
                peso_paciente_kg=peso_paciente,
                dias_tratamiento=dias_tratamiento
            )
            
            return JsonResponse({
                'success': True,
                'envases_requeridos': resultado['envases_requeridos'],
                'stock_disponible': insumo.stock_actual,
                'hay_stock_suficiente': insumo.stock_actual >= resultado['envases_requeridos'],
                'calculo_automatico': resultado['calculo_automatico'],
                'detalle': resultado['detalle'],
                'dosis_calculada': resultado['dosis_calculada'],
                'contenido_envase': resultado['contenido_envase'],
            })
        
        except Insumo.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Insumo no encontrado'
            }, status=404)
        
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


# =============================================================================
# EJEMPLO 3: Template - Mostrar información de envases
# =============================================================================

"""
En el template HTML (ej: ficha_consulta.html):

<div class="calculo-envases">
    <h5>Cálculo de Envases</h5>
    
    <div class="row">
        <div class="col-md-6">
            <label>Peso del Paciente (kg):</label>
            <input type="number" id="peso_paciente" value="{{ paciente.peso }}" step="0.1">
        </div>
        <div class="col-md-6">
            <label>Días de Tratamiento:</label>
            <input type="number" id="dias_tratamiento" value="1" min="1">
        </div>
    </div>
    
    <button onclick="calcularEnvases()">Calcular Envases</button>
    
    <div id="resultado_calculo" style="display: none;">
        <div class="alert alert-info">
            <strong>Envases requeridos:</strong> <span id="envases_requeridos"></span><br>
            <strong>Stock disponible:</strong> <span id="stock_disponible"></span><br>
            <strong>Estado:</strong> <span id="estado_stock"></span><br>
            <small id="detalle_calculo"></small>
        </div>
    </div>
</div>

<script>
function calcularEnvases() {
    const insumoId = $('#insumo_select').val();
    const pesoPaciente = $('#peso_paciente').val();
    const diasTratamiento = $('#dias_tratamiento').val();
    
    $.ajax({
        url: '{% url "inventario:calcular_envases" %}',
        method: 'POST',
        data: {
            'insumo_id': insumoId,
            'peso_paciente': pesoPaciente,
            'dias_tratamiento': diasTratamiento,
            'csrfmiddlewaretoken': '{{ csrf_token }}'
        },
        success: function(response) {
            if (response.success) {
                $('#envases_requeridos').text(response.envases_requeridos);
                $('#stock_disponible').text(response.stock_disponible);
                $('#detalle_calculo').text(response.detalle);
                
                if (response.hay_stock_suficiente) {
                    $('#estado_stock').html('<span class="badge bg-success">Stock suficiente</span>');
                } else {
                    $('#estado_stock').html('<span class="badge bg-danger">Stock insuficiente</span>');
                }
                
                $('#resultado_calculo').show();
            } else {
                alert('Error: ' + response.error);
            }
        },
        error: function() {
            alert('Error al calcular envases');
        }
    });
}
</script>
"""


# =============================================================================
# EJEMPLO 4: Usar en serializer/API REST (si usa Django REST Framework)
# =============================================================================

"""
from rest_framework import serializers
from inventario.models import Insumo

class InsumoSerializer(serializers.ModelSerializer):
    # Método personalizado para incluir cálculo de envases
    def get_envases_requeridos(self, obj):
        # Obtener peso del contexto (pasado desde la vista)
        peso_paciente = self.context.get('peso_paciente', 0)
        dias_tratamiento = self.context.get('dias_tratamiento', 1)
        
        if peso_paciente > 0:
            resultado = obj.calcular_envases_requeridos(
                peso_paciente_kg=peso_paciente,
                dias_tratamiento=dias_tratamiento
            )
            return resultado
        return None
    
    class Meta:
        model = Insumo
        fields = ['idInventario', 'medicamento', 'stock_actual', 'formato']
"""


# =============================================================================
# EJEMPLO 5: Validación antes de descontar stock
# =============================================================================

def ejemplo_validar_antes_descontar_stock(insumo, paciente, dias_tratamiento=1):
    """
    Validar que hay stock suficiente ANTES de procesar la consulta
    """
    # Calcular envases requeridos
    resultado = insumo.calcular_envases_requeridos(
        peso_paciente_kg=paciente.peso,
        dias_tratamiento=dias_tratamiento
    )
    
    envases_requeridos = resultado['envases_requeridos']
    
    # Validar stock
    if insumo.stock_actual < envases_requeridos:
        return {
            'puede_usar': False,
            'error': f'Stock insuficiente. Requiere {envases_requeridos} envases, disponibles: {insumo.stock_actual}',
            'resultado': resultado
        }
    
    return {
        'puede_usar': True,
        'envases_requeridos': envases_requeridos,
        'resultado': resultado
    }


# =============================================================================
# EJEMPLO 6: Generar reporte de insumos necesarios para múltiples pacientes
# =============================================================================

def ejemplo_reporte_insumos_necesarios(consultas_pendientes):
    """
    Generar reporte de insumos necesarios para un conjunto de consultas
    """
    from collections import defaultdict
    
    reporte = defaultdict(lambda: {
        'envases_totales': 0,
        'stock_actual': 0,
        'detalles': []
    })
    
    for consulta in consultas_pendientes:
        insumo = consulta.insumo
        paciente = consulta.paciente
        dias = consulta.dias_tratamiento or 1
        
        resultado = insumo.calcular_envases_requeridos(
            peso_paciente_kg=paciente.peso,
            dias_tratamiento=dias
        )
        
        # Acumular por insumo
        reporte[insumo.idInventario]['envases_totales'] += resultado['envases_requeridos']
        reporte[insumo.idInventario]['stock_actual'] = insumo.stock_actual
        reporte[insumo.idInventario]['detalles'].append({
            'paciente': paciente.nombre,
            'envases': resultado['envases_requeridos']
        })
    
    # Identificar insumos con stock insuficiente
    alertas = []
    for insumo_id, datos in reporte.items():
        if datos['stock_actual'] < datos['envases_totales']:
            alertas.append({
                'insumo_id': insumo_id,
                'faltante': datos['envases_totales'] - datos['stock_actual']
            })
    
    return {
        'reporte': dict(reporte),
        'alertas': alertas
    }


# =============================================================================
# RESUMEN DE INTEGRACIÓN
# =============================================================================

"""
PUNTOS CLAVE:

1. La función calcular_envases_requeridos() está en el modelo Insumo
2. NO modifica el stock - solo calcula
3. Retorna un diccionario con:
   - envases_requeridos: int (siempre entero, redondeado hacia arriba)
   - calculo_automatico: bool (True si se pudo calcular)
   - detalle: str (descripción del cálculo)
   - dosis_calculada: float (dosis total calculada)
   - contenido_envase: float (contenido de 1 envase)

4. Usar ANTES de descontar stock para validar disponibilidad
5. El descuento real se hace en otro momento (ej: al guardar la consulta)

6. MAPEO DE CAMPOS:
   - liquido/inyectable → ml_contenedor (ML)
   - pastilla → cantidad_pastillas (unidades)
   - pipeta → unidades_pipeta (unidades)
   - polvo/crema/otro → ml_contenedor (genérico)

7. stock_actual = número de ENVASES (no unidades sueltas)
"""
