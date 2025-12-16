# 🧪 TEST DE GUARDADO DOSIS vs CONTENIDO ENVASE

## ✅ CASOS DE VALIDACIÓN

### **Caso 1: PASTILLA**
**Input UI:**
- Formato: `pastilla`
- Dosis por kg: `2` pastillas/kg
- Peso referencia: `1` kg
- Pastillas por envase: `10` pastillas

**Valores esperados en POST:**
```json
{
  "formato": "pastilla",
  "dosis_ml": 2,           // ← Dosis por kg (NO sobrescribir con cantidad_pastillas)
  "peso_kg": 1,
  "cantidad_pastillas": 10, // ← Contenido del envase
  "ml_contenedor": null,
  "unidades_pipeta": null
}
```

**Validación en DB:**
- ✅ `dosis_ml` debe ser `2` (NO `10`)
- ✅ `cantidad_pastillas` debe ser `10`
- ✅ `peso_kg` debe ser `1`

---

### **Caso 2: LÍQUIDO**
**Input UI:**
- Formato: `liquido`
- Dosis por kg: `2` ml/kg
- Peso referencia: `10` kg
- Contenido del envase: `10` ml

**Valores esperados en POST:**
```json
{
  "formato": "liquido",
  "dosis_ml": 2,           // ← Dosis por kg
  "peso_kg": 10,
  "ml_contenedor": 10,      // ← Contenido del envase
  "cantidad_pastillas": null,
  "unidades_pipeta": null
}
```

**Validación en DB:**
- ✅ `dosis_ml` debe ser `2`
- ✅ `ml_contenedor` debe ser `10`
- ✅ `peso_kg` debe ser `10`

---

### **Caso 3: PIPETA**
**Input UI:**
- Formato: `pipeta`
- Dosis por kg: `1` pipeta/kg
- Peso referencia: `5` kg
- Unidades por envase: `3` pipetas

**Valores esperados en POST:**
```json
{
  "formato": "pipeta",
  "dosis_ml": 1,           // ← Dosis por kg (reutiliza dosis_ml)
  "peso_kg": 5,
  "unidades_pipeta": 3,    // ← Contenido del envase
  "ml_contenedor": null,
  "cantidad_pastillas": null
}
```

**Validación en DB:**
- ✅ `dosis_ml` debe ser `1`
- ✅ `unidades_pipeta` debe ser `3`
- ✅ `peso_kg` debe ser `5`

---

## 🔍 VERIFICACIÓN EN CONSOLA

Al guardar cualquier producto, revisar en la consola del navegador:

```
📊 VALORES PRE-SUBMIT
  🏷️  Formato: pastilla
  💉 dosis_ml (dosis por kg): 2
  ⚖️  peso_kg (peso referencia): 1
  💧 ml_contenedor: N/A
  💊 cantidad_pastillas: 10
  💉 unidades_pipeta: N/A
```

---

## ⚠️ BUGS CORREGIDOS

### **Problema detectado:**
> En formato pastilla, el valor de `cantidad_pastillas` (10) estaba sobrescribiendo `dosis_ml`, resultando en "10 pastillas por 1 kg" en lugar de "2 pastillas por 1 kg".

### **Causa raíz:**
- El JS no estaba guardando `dosis_ml` para formatos pastilla/pipeta
- Solo guardaba el campo de contenido del envase

### **Solución aplicada:**
1. ✅ Actualizar `guardarProducto()` para SIEMPRE incluir `dosis_ml` en todos los formatos
2. ✅ Mapeo correcto según formato:
   - `dosis_ml` = dosis por kg (común para todos)
   - `ml_contenedor` / `cantidad_pastillas` / `unidades_pipeta` = contenido del envase (específico)
3. ✅ Limpieza selectiva: solo limpiar campos de envase que NO aplican al formato actual
4. ✅ Preservar `dosis_ml` y `peso_kg` al cambiar de formato (valores comunes)
5. ✅ Logs agrupados para debugging en consola

---

## 📁 ARCHIVOS MODIFICADOS

1. **static/js/inventario/crud_inventario.js** (líneas 750-808)
   - Función `guardarProducto()` actualizada con switch completo
   - Logs de depuración agrupados

2. **static/js/inventario/dosis_calculator.js** (líneas 65-130)
   - Función `actualizarCamposDosis()` con limpieza selectiva
   - Preservación de valores comunes
   - Nueva función `limpiarCampo()`

---

## 🎯 RESULTADO ESPERADO

✅ **ANTES**: "2 pastillas/kg + envase 10" → guardaba como "10 pastillas/kg"
✅ **AHORA**: "2 pastillas/kg + envase 10" → guarda correctamente "2 pastillas/kg" + "10 pastillas por envase"
