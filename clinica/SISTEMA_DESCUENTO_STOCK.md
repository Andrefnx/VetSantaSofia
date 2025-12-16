# ✅ IMPLEMENTACIÓN COMPLETADA: Sistema de Descuento de Stock

## 🎯 OBJETIVO CUMPLIDO

Implementación del descuento de stock de insumos **SOLO al confirmar** una consulta u hospitalización.

---

## ⚡ MOMENTO EXACTO DEL DESCUENTO

### ✅ DESCUENTA:
- Al **confirmar** consulta → llamar `consulta.confirmar_y_descontar_insumos(usuario)`
- Al **finalizar** hospitalización → llamar `hospitalizacion.finalizar_y_descontar_insumos(usuario)`

### ❌ NO DESCUENTA:
- Al crear consulta/hospitalización
- Al editar
- Al guardar borrador
- Al abrir ficha
- En guardados intermedios

---

## 📊 CAMPOS AGREGADOS

### ConsultaInsumo + HospitalizacionInsumo

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `stock_descontado` | Boolean | Previene descuentos duplicados |
| `fecha_descuento` | DateTime | Registro de cuándo se descontó |

**Migración aplicada**: `clinica.0004_consultainsumo_fecha_descuento_and_more`

---

## 🔧 MÉTODOS IMPLEMENTADOS

### 1. `ConsultaInsumo.descontar_stock(usuario, dias_tratamiento=1)`

```python
# Uso:
detalle = ConsultaInsumo.objects.get(...)
resultado = detalle.descontar_stock(usuario=request.user, dias_tratamiento=3)

# Retorna:
{
    'success': True,
    'insumo': 'Antibiótico Test',
    'envases_descontados': 2,
    'stock_anterior': 5,
    'stock_actual': 3,
    'calculo_automatico': True,
    'detalle': 'Dosis total: 18ml | Contenido: 10ml | Envases: 2'
}
```

**Proceso interno**:
1. Verifica `stock_descontado=False`
2. Llama a `insumo.calcular_envases_requeridos(peso, dias)`
3. Valida stock suficiente
4. Descuenta `stock_actual -= envases_requeridos`
5. Actualiza metadata del insumo
6. Marca `stock_descontado=True`

**Protecciones**:
- ❌ Lanza `ValidationError` si ya descontado
- ❌ Lanza `ValidationError` si stock insuficiente
- ✅ Usa `transaction.atomic()` (todo o nada)
- ✅ NUNCA permite stock negativo

---

### 2. `HospitalizacionInsumo.descontar_stock(usuario, dias_tratamiento=1)`

Misma lógica que `ConsultaInsumo.descontar_stock()`.

---

### 3. `Consulta.confirmar_y_descontar_insumos(usuario, dias_tratamiento=1)`

```python
# Uso:
consulta = Consulta.objects.get(pk=123)

try:
    resultado = consulta.confirmar_y_descontar_insumos(
        usuario=request.user,
        dias_tratamiento=1
    )
    
    # Éxito
    print(f"✅ {resultado['message']}")
    print(f"Total descontado: {resultado['total_items']} insumos")
    
except ValidationError as e:
    # Stock insuficiente o ya descontado
    print(f"❌ Error: {str(e)}")
```

**Proceso**:
1. Verifica `consulta.insumos_descontados=False`
2. Para cada `ConsultaInsumo`:
   - Llama a `detalle.descontar_stock()`
3. Marca `consulta.insumos_descontados=True`
4. Todo dentro de `transaction.atomic()`

**Retorna**:
```python
{
    'success': True,
    'insumos_descontados': [
        {
            'insumo': 'Antibiótico',
            'envases_descontados': 2,
            'stock_anterior': 10,
            'stock_actual': 8,
            ...
        },
        # ... más insumos
    ],
    'total_items': 2,
    'message': '✅ 2 insumos descontados correctamente'
}
```

---

### 4. `Hospitalizacion.finalizar_y_descontar_insumos(usuario, dias_tratamiento=None)`

Similar a `Consulta.confirmar_y_descontar_insumos()` pero:
- Si `dias_tratamiento=None`, calcula automáticamente desde `fecha_ingreso` hasta `fecha_alta`
- Mínimo 1 día

```python
# Calcular días automáticamente
hosp = Hospitalizacion.objects.get(pk=456)
resultado = hosp.finalizar_y_descontar_insumos(usuario=request.user)

# O especificar días manualmente
resultado = hosp.finalizar_y_descontar_insumos(usuario=request.user, dias_tratamiento=5)
```

---

## 🔄 INTEGRACIÓN CON CALCULAR_ENVASES_REQUERIDOS()

### Reutilización completa:

```python
# En descontar_stock():
resultado = self.insumo.calcular_envases_requeridos(
    peso_paciente_kg=float(self.peso_paciente),
    dias_tratamiento=dias_tratamiento
)

envases_requeridos = resultado['envases_requeridos']

# Descontar
self.insumo.stock_actual -= envases_requeridos
```

**Beneficios**:
- ✅ Lógica centralizada
- ✅ Redondeo hacia arriba automático (ceil)
- ✅ Validación de formatos
- ✅ Cálculo automático de dosis

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Prevención de duplicados
```python
if self.stock_descontado:
    raise ValidationError("Ya descontado")
```

### 2. Validación de stock
```python
if self.insumo.stock_actual < envases_requeridos:
    raise ValidationError(f"Stock insuficiente: ...")
```

### 3. Transacción atómica
```python
with transaction.atomic():
    # Descontar stock
    # Marcar como descontado
    # Si falla algo, TODO se revierte
```

### 4. Stock nunca negativo
```python
# Validación ANTES de descontar
if stock_actual < envases_requeridos:
    raise ValidationError(...)

# NUNCA hace: stock_actual -= X sin validar
```

---

## 📝 EJEMPLO DE USO COMPLETO

### En la vista de confirmar consulta:

```python
@login_required
def confirmar_consulta(request, consulta_id):
    """Vista para confirmar una consulta y descontar insumos"""
    
    if request.method == 'POST':
        consulta = get_object_or_404(Consulta, pk=consulta_id)
        
        try:
            # DESCUENTO DE STOCK AQUÍ
            resultado = consulta.confirmar_y_descontar_insumos(
                usuario=request.user,
                dias_tratamiento=request.POST.get('dias_tratamiento', 1)
            )
            
            return JsonResponse({
                'success': True,
                'message': resultado['message'],
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
                'error': f'Error inesperado: {str(e)}'
            }, status=500)
```

### En JavaScript (frontend):

```javascript
function confirmarConsulta(consultaId) {
    const dias = $('#dias_tratamiento').val() || 1;
    
    $.ajax({
        url: `/clinica/consultas/${consultaId}/confirmar/`,
        method: 'POST',
        data: {
            'dias_tratamiento': dias,
            'csrfmiddlewaretoken': getCookie('csrftoken')
        },
        success: function(response) {
            if (response.success) {
                alert(response.message);
                
                // Mostrar detalles
                response.detalles.forEach(item => {
                    console.log(`${item.insumo}: ${item.envases_descontados} envases`);
                });
                
                // Recargar lista
                location.reload();
            }
        },
        error: function(xhr) {
            const error = xhr.responseJSON?.error || 'Error desconocido';
            alert(`❌ Error: ${error}`);
        }
    });
}
```

---

## 🚦 FLUJO COMPLETO

```
1. Usuario abre ficha de consulta
   ├─ NO descuenta stock
   └─ Solo visualiza

2. Usuario registra insumos
   ├─ ConsultaInsumo se crea con stock_descontado=False
   └─ NO descuenta stock

3. Usuario confirma consulta
   ├─ Llama a consulta.confirmar_y_descontar_insumos()
   ├─ Para cada insumo:
   │  ├─ Verifica stock_descontado=False
   │  ├─ Calcula envases con calcular_envases_requeridos()
   │  ├─ Valida stock suficiente
   │  ├─ Descuenta: stock_actual -= envases
   │  └─ Marca stock_descontado=True
   └─ Marca consulta.insumos_descontados=True

4. Si usuario intenta confirmar nuevamente
   └─ ValidationError: "Ya descontado"
```

---

## 📦 ARCHIVOS MODIFICADOS

### Models:
- **clinica/models.py**
  - Campos agregados: `stock_descontado`, `fecha_descuento`
  - Métodos: `descontar_stock()`, `confirmar_y_descontar_insumos()`, `finalizar_y_descontar_insumos()`

### Migrations:
- **clinica/migrations/0004_consultainsumo_fecha_descuento_and_more.py**
  - Aplica campos nuevos a BD

### Inventario (sin cambios):
- **inventario/models.py**
  - Método `calcular_envases_requeridos()` ya existía
  - Se reutiliza sin modificación

---

## ✅ VALIDACIÓN

### Casos cubiertos:

| Caso | Resultado |
|------|-----------|
| Confirmar con stock suficiente | ✅ Descuenta correctamente |
| Confirmar con stock insuficiente | ❌ ValidationError, NO descuenta |
| Confirmar dos veces | ❌ ValidationError "Ya descontado" |
| Consulta sin insumos | ✅ Solo marca como procesada |
| Hospitalización 5 días | ✅ Calcula envases × días |
| Stock negativo | ❌ NUNCA ocurre (validación previa) |

---

## 🎓 REGLAS CUMPLIDAS

- ✅ NO modificar el cálculo de envases existente
- ✅ NO descontar stock en guardados intermedios
- ✅ NO duplicar descuentos
- ✅ NO permitir stock negativo
- ✅ NO romper caja ni auditoría
- ✅ Reutilizar calcular_envases_requeridos()
- ✅ Descuento SOLO al confirmar/finalizar
- ✅ Transaction.atomic() obligatorio
- ✅ Campo stock_descontado para control

---

## 📚 PRÓXIMOS PASOS

### Fase 1: Integrar en vistas
1. Agregar endpoint `/clinica/consultas/<id>/confirmar/`
2. Agregar endpoint `/clinica/hospitalizaciones/<id>/finalizar/`
3. Actualizar frontend para llamar endpoints

### Fase 2: UI
1. Botón "Confirmar Consulta" en ficha
2. Mostrar alerta si stock insuficiente
3. Mostrar confirmación de descuento exitoso

### Fase 3: Reportes
1. Historial de descuentos por consulta
2. Auditoría de movimientos de inventario
3. Alertas de stock bajo

---

**Fecha**: 16 de diciembre de 2025  
**Estado**: ✅ Implementado y migrado  
**Reglas cumplidas**: 7/7  
**Listo para**: Integración en vistas  
