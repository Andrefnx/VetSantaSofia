# 📊 IMPLEMENTACIÓN COMPLETADA: Cálculo de Envases Requeridos

## ✅ OBJETIVO CUMPLIDO

Implementación del cálculo de envases requeridos usando **SOLO los campos existentes** del modelo Inventario, sin crear campos nuevos ni migraciones.

---

## 📋 CAMPOS EXISTENTES UTILIZADOS

### Modelo: `Insumo` (inventario/models.py)

| Campo | Tipo | Uso en el Cálculo |
|-------|------|-------------------|
| `formato` | CharField | Define el tipo de producto (liquido, pastilla, pipeta, etc.) |
| `dosis_ml` | Decimal | Dosis en ml para líquidos/inyectables |
| `ml_contenedor` | Decimal | **Contenido del envase** para líquidos/inyectables |
| `cantidad_pastillas` | Integer | **Contenido del envase** para pastillas (número de pastillas) |
| `unidades_pipeta` | Integer | **Contenido del envase** para pipetas (número de pipetas) |
| `peso_kg` | Decimal | Peso de referencia para calcular dosis proporcional |
| `stock_actual` | Integer | **Número de ENVASES completos** en inventario |

**IMPORTANTE**: No se crearon campos nuevos. Se reutilizó la estructura existente.

---

## 🎯 FUNCIÓN IMPLEMENTADA

### `Insumo.calcular_envases_requeridos(peso_paciente_kg, dias_tratamiento=1)`

**Ubicación**: `inventario/models.py` (líneas 127-261)

**Parámetros**:
- `peso_paciente_kg` (float): Peso del paciente en kilogramos
- `dias_tratamiento` (int): Días de duración del tratamiento (default: 1)

**Retorna** (dict):
```python
{
    'envases_requeridos': int,     # SIEMPRE entero (ceil)
    'calculo_automatico': bool,     # True si se calculó automáticamente
    'detalle': str,                 # Descripción del cálculo
    'dosis_calculada': float,       # Dosis total calculada
    'contenido_envase': float,      # Contenido de 1 envase
}
```

---

## 🔍 MAPEO: FORMATO → CAMPO CONTENEDOR

| Formato | Campo Contenedor | Unidad | Ejemplo |
|---------|------------------|--------|---------|
| `liquido` | `ml_contenedor` | ML | Frasco de 100ml |
| `inyectable` | `ml_contenedor` | ML | Ampolla de 10ml |
| `pastilla` | `cantidad_pastillas` | Unidades | Blister de 10 pastillas |
| `pipeta` | `unidades_pipeta` | Unidades | Caja con 3 pipetas |
| `polvo` | `ml_contenedor` | Genérico* | Frasco de 50g |
| `crema` | `ml_contenedor` | Genérico* | Tubo de 30g |
| `otro` | `ml_contenedor` | Genérico* | Sin unidad específica |

\* **Nota**: Para polvo, crema y otros, se usa `ml_contenedor` como "contenido genérico" aunque no represente mililitros.

---

## 🧮 LÓGICA DE CÁLCULO

### Paso 1: Determinar contenido del envase
```python
# Según formato:
if formato in ['liquido', 'inyectable']:
    contenido_envase = ml_contenedor
elif formato == 'pastilla':
    contenido_envase = cantidad_pastillas
elif formato == 'pipeta':
    contenido_envase = unidades_pipeta
elif formato in ['polvo', 'crema', 'otro']:
    contenido_envase = ml_contenedor  # genérico
```

### Paso 2: Calcular dosis total requerida
```python
# Para líquidos/inyectables:
if dosis_ml and peso_kg:
    factor_peso = peso_paciente / peso_kg
    dosis_diaria = dosis_ml * factor_peso
else:
    dosis_diaria = dosis_ml  # dosis fija

dosis_total = dosis_diaria * dias_tratamiento
```

### Paso 3: Calcular envases (SIEMPRE redondear hacia arriba)
```python
import math

envases_calculados = dosis_total / contenido_envase
envases_requeridos = math.ceil(envases_calculados)  # Redondear hacia arriba
```

### Comportamiento con datos insuficientes
```python
if not formato or not contenido_envase or not dosis_ml:
    return {
        'envases_requeridos': 1,  # Por defecto: 1 envase
        'calculo_automatico': False,
        'detalle': 'Requiere cálculo manual'
    }
```

---

## ✅ VALIDACIÓN COMPLETADA

### Archivo: `test_calcular_envases.py`

Todas las pruebas pasaron exitosamente:

| Prueba | Escenario | Resultado |
|--------|-----------|-----------|
| **Prueba 1** | Líquido: 60kg, 2ml/10kg, envase 10ml | ✅ 2 envases |
| **Prueba 2** | Pastillas: 12kg, envase 10 pastillas | ✅ 1 envase |
| **Prueba 3** | Inyectable: 5kg, 0.5ml/kg, envase 5ml | ✅ 1 envase |
| **Prueba 4** | Pipeta: 8kg (rango 5-10kg), caja 3 pipetas | ✅ 1 envase |
| **Prueba 5** | Tratamiento 3 días: 30kg, 1ml/5kg, envase 10ml | ✅ 2 envases |
| **Prueba 6** | Sin dosis definida | ✅ 1 envase (manual) |

**Resultado**: 6/6 pruebas exitosas ✅

---

## 📝 EJEMPLOS DE USO

### Ejemplo 1: Vista de consulta
```python
def vista_consulta(request, paciente_id):
    paciente = Paciente.objects.get(idPaciente=paciente_id)
    insumo = Insumo.objects.get(idInventario=insumo_id)
    
    resultado = insumo.calcular_envases_requeridos(
        peso_paciente_kg=paciente.peso,
        dias_tratamiento=3
    )
    
    if insumo.stock_actual >= resultado['envases_requeridos']:
        # Hay stock suficiente
        pass
    else:
        # Stock insuficiente
        pass
```

### Ejemplo 2: API AJAX
```python
def api_calcular_envases(request):
    insumo = Insumo.objects.get(idInventario=request.POST['insumo_id'])
    peso = float(request.POST['peso_paciente'])
    dias = int(request.POST['dias_tratamiento'])
    
    resultado = insumo.calcular_envases_requeridos(peso, dias)
    
    return JsonResponse({
        'envases_requeridos': resultado['envases_requeridos'],
        'stock_disponible': insumo.stock_actual,
        'hay_stock': insumo.stock_actual >= resultado['envases_requeridos']
    })
```

Ver archivo completo: `inventario/ejemplo_integracion.py`

---

## 🎯 RESTRICCIONES CUMPLIDAS

- ✅ NO se crearon campos nuevos
- ✅ NO se crearon migraciones
- ✅ NO se modificó la estructura del modelo
- ✅ NO se descuenta stock (solo cálculo)
- ✅ NO se cambió el flujo actual de consulta
- ✅ Se reutilizó lógica existente (get_dosis_display)

---

## 📊 INTERPRETACIÓN DE CAMPOS

### `stock_actual`
- **Representa**: Número de ENVASES completos
- **NO representa**: Unidades sueltas (ml, pastillas, pipetas)

### Ejemplo:
```python
# Producto: Antibiótico Líquido
# ml_contenedor = 100ml (1 envase = 100ml)
# stock_actual = 5

# Esto significa: 5 frascos de 100ml cada uno
# Total disponible: 500ml (5 envases × 100ml)
```

---

## 🔄 FLUJO DE INTEGRACIÓN

```
1. Usuario selecciona insumo en consulta
   ↓
2. Sistema obtiene peso del paciente
   ↓
3. Usuario define días de tratamiento (opcional)
   ↓
4. Llamar: insumo.calcular_envases_requeridos()
   ↓
5. Mostrar: envases requeridos vs stock disponible
   ↓
6. Usuario confirma uso del insumo
   ↓
7. Sistema descuenta stock (en otro método)
```

**IMPORTANTE**: El cálculo NO descuenta stock. Solo informa cuántos envases se necesitan.

---

## 📂 ARCHIVOS CREADOS/MODIFICADOS

### Modificados:
1. **`inventario/models.py`**
   - Agregada función: `calcular_envases_requeridos()`
   - Líneas: 127-261

### Creados (documentación):
2. **`test_calcular_envases.py`**
   - Script de validación (6 pruebas)
   - Estado: ✅ Todas pasaron

3. **`inventario/ejemplo_integracion.py`**
   - 6 ejemplos de integración
   - Incluye código para vistas, API, templates

---

## 🚀 PRÓXIMOS PASOS SUGERIDOS

### Fase 1: Integración en UI
1. Agregar endpoint API: `inventario/urls.py`
   ```python
   path('calcular-envases/', views.calcular_envases_ajax, name='calcular_envases')
   ```

2. Crear vista: `inventario/views.py`
   ```python
   def calcular_envases_ajax(request):
       # Ver ejemplo en ejemplo_integracion.py
   ```

3. Agregar JavaScript en template de consulta
   - Función para calcular envases en tiempo real
   - Mostrar alerta si stock insuficiente

### Fase 2: Validación en Backend
1. Validar stock antes de procesar consulta
2. Mostrar advertencia si stock es bajo
3. Bloquear si stock es insuficiente

### Fase 3: Reportes
1. Reporte de insumos más usados
2. Predicción de reposición basado en consultas históricas
3. Alertas de stock bajo considerando demanda

---

## 📖 DOCUMENTACIÓN COMPLETA

- **Modelo**: [inventario/models.py](inventario/models.py) (líneas 127-261)
- **Validación**: [test_calcular_envases.py](test_calcular_envases.py)
- **Ejemplos**: [inventario/ejemplo_integracion.py](inventario/ejemplo_integracion.py)
- **Este documento**: [inventario/IMPLEMENTACION_CALCULO_ENVASES.md](inventario/IMPLEMENTACION_CALCULO_ENVASES.md)

---

## 🎓 LECCIONES APRENDIDAS

1. **Reutilizar siempre**: Los campos existentes permitieron modelar envases sin crear nuevos campos
2. **Redondear hacia arriba**: `math.ceil()` garantiza que nunca falte producto
3. **Cálculo vs Ejecución**: Separar el cálculo del descuento real de stock
4. **Validación temprana**: Detectar datos insuficientes y requerir cálculo manual
5. **Flexibilidad**: Usar campos genéricos (ml_contenedor) para formatos sin campo específico

---

**Fecha de implementación**: 16 de diciembre de 2025  
**Estado**: ✅ Completado y validado  
**Reglas cumplidas**: 6/6  
**Pruebas pasadas**: 6/6  
