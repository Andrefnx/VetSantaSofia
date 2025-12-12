# Guía Visual - Configuración de Niveles de Stock

## 🎯 Objetivo
Permitir configurar umbrales personalizados de stock para cada producto del inventario, con indicadores visuales de color.

---

## 📍 Ubicación en la Interfaz

### 1. Tabla de Inventario
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Inventario                    [➕ Nuevo Producto]       │
├──────────┬─────────┬────────┬────────┬─────────────┬────────┤
│ Producto │ Especie │ Precio │ Stock  │ Último Mov. │ Gestión│
├──────────┼─────────┼────────┼────────┼─────────────┼────────┤
│ Ibuprofeno│ Todos  │ $5000  │ [🔴 8] │ 15/01/2025  │   ⚙️  │
│ Aspirina  │ Todos  │ $3000  │ [🟠 15]│ 14/01/2025  │   ⚙️  │
│ Paracetamol│Todos  │ $4000  │ [🟢 50]│ 13/01/2025  │   ⚙️  │
└──────────┴─────────┴────────┴────────┴─────────────┴────────┘
```

### 2. Menú de Gestión (Rueda)
Al hacer clic en ⚙️:
```
┌─────────────────────┐
│ 📋 Ver Producto     │
│ ✏️ Editar           │
│ 📊 Stock            │
│ ⚙️ Niveles          │ ← NUEVO!
│ 🗑️ Eliminar         │
└─────────────────────┘
```

---

## 💻 Modal de Configuración

### Diseño del Modal
```
╔════════════════════════════════════════════╗
║  ⚙️ Configurar Niveles de Stock        ❌ ║
╠════════════════════════════════════════════╣
║                                            ║
║  Producto: Ibuprofeno 500mg                ║
║                                            ║
║  ⚠️ Stock Mínimo (Rojo)                    ║
║  ┌──────────────────────────────────────┐  ║
║  │           10                         │  ║
║  └──────────────────────────────────────┘  ║
║  Cuando el stock llegue a este nivel o     ║
║  menos, se marcará en rojo                 ║
║                                            ║
║  ⚠️ Stock Medio (Naranja)                  ║
║  ┌──────────────────────────────────────┐  ║
║  │           20                         │  ║
║  └──────────────────────────────────────┘  ║
║  Cuando el stock esté entre el mínimo y    ║
║  este nivel, se marcará en naranja         ║
║                                            ║
║  ℹ️ Stock Alto (Verde): Se marcará         ║
║  automáticamente cuando el stock supere    ║
║  el nivel medio.                           ║
║                                            ║
║     [❌ Cancelar]     [💾 Guardar]         ║
║                                            ║
╚════════════════════════════════════════════╝
```

---

## 🎨 Sistema de Colores

### Lógica de Colores
```
Stock Actual vs Umbrales Configurados:

🔴 ROJO (Bajo)
   stock_actual ≤ stock_minimo
   Ejemplo: Stock=8, Mínimo=10 → ROJO

🟠 NARANJA (Medio)
   stock_minimo < stock_actual ≤ stock_medio
   Ejemplo: Stock=15, Mínimo=10, Medio=20 → NARANJA

🟢 VERDE (Alto)
   stock_actual > stock_medio
   Ejemplo: Stock=50, Medio=20 → VERDE
```

### Ejemplo Visual
```
Configuración: Mínimo=10, Medio=20

Stock = 5   → [🔴 5]   ¡Reponer urgente!
Stock = 8   → [🔴 8]   Stock bajo
Stock = 15  → [🟠 15]  Stock por agotarse
Stock = 19  → [🟠 19]  Stock medio
Stock = 25  → [🟢 25]  Stock suficiente
Stock = 100 → [🟢 100] Stock alto
```

---

## 🔄 Flujo de Uso

### Caso de Uso: Configurar Niveles para Ibuprofeno

**Paso 1:** Usuario identifica que Ibuprofeno tiene solo 8 unidades
```
┌──────────────────────────────────────┐
│ Ibuprofeno │ Todos │ $5000 │ [🔴 8] │
└──────────────────────────────────────┘
```

**Paso 2:** Usuario hace clic en ⚙️ → "Niveles"

**Paso 3:** Modal se abre con valores actuales
```
Stock Mínimo: [10]  ← Valor predeterminado
Stock Medio:  [20]  ← Valor predeterminado
```

**Paso 4:** Usuario ajusta según necesidad
```
Stock Mínimo: [5]   ← Cambio a 5
Stock Medio:  [15]  ← Cambio a 15
```

**Paso 5:** Usuario hace clic en "Guardar"

**Paso 6:** Sistema actualiza y recarga
```
┌──────────────────────────────────────┐
│ Ibuprofeno │ Todos │ $5000 │ [🟠 8] │ ← Ahora es NARANJA
└──────────────────────────────────────┘
```

---

## 📊 Ejemplos Prácticos

### Producto: Vacuna Antirrábica
```
Consumo promedio: 2 unidades/día
Tiempo de reposición: 7 días

Cálculo recomendado:
- Stock Mínimo  = 7 días × 2 unidades = 14 unidades
- Stock Medio   = 14 días × 2 unidades = 28 unidades
- Stock Óptimo  = 30+ unidades (verde)
```

### Producto: Pipetas Antipulgas
```
Venta estacional: Mayor en verano
Stock actual: 10 cajas

Configuración sugerida:
- Temporada baja:  Mínimo=5,  Medio=10
- Temporada alta:  Mínimo=15, Medio=30
```

---

## ⚠️ Validaciones del Sistema

### Validación 1: Valores Requeridos
```
❌ Error: "Por favor, ingresa ambos valores"
Causa: Algún campo vacío
```

### Validación 2: Orden Correcto
```
❌ Error: "El stock mínimo debe ser menor al stock medio"
Causa: Mínimo=20, Medio=10 (orden invertido)
✅ Correcto: Mínimo=10, Medio=20
```

### Validación 3: Números Positivos
```
❌ Error: Input no acepta negativos
Causa: El campo tiene min="0"
```

---

## 🎯 Casos de Uso Recomendados

### 1. Productos de Rotación Alta
```
Ejemplo: Alimento balanceado
Stock Mínimo:  50 unidades
Stock Medio:   100 unidades
Stock Óptimo:  150+ unidades
```

### 2. Productos de Emergencia
```
Ejemplo: Suero fisiológico
Stock Mínimo:  20 unidades
Stock Medio:   40 unidades
Stock Óptimo:  50+ unidades
```

### 3. Productos de Baja Rotación
```
Ejemplo: Medicamento especializado
Stock Mínimo:  2 unidades
Stock Medio:   5 unidades
Stock Óptimo:  10+ unidades
```

---

## 🔧 Personalización por Tipo

### Medicamentos Inyectables
```
Caducidad: 6 meses
Uso: Frecuente

Mínimo: 10 | Medio: 20 | Óptimo: 30
```

### Alimentos
```
Caducidad: 12 meses
Uso: Muy frecuente

Mínimo: 50 | Medio: 100 | Óptimo: 200
```

### Accesorios
```
Caducidad: Sin caducidad
Uso: Variable

Mínimo: 5 | Medio: 10 | Óptimo: 20
```

---

## 📱 Responsividad

El modal se adapta a diferentes tamaños de pantalla:

**Escritorio (>1200px)**
```
╔════════════════════════════════════╗
║     Modal amplio y centrado        ║
╚════════════════════════════════════╝
```

**Tablet (768px - 1200px)**
```
╔══════════════════════════╗
║  Modal mediano           ║
╚══════════════════════════╝
```

**Móvil (<768px)**
```
╔════════════════╗
║  Modal full    ║
║  width         ║
╚════════════════╝
```

---

## 💡 Tips de Uso

1. **Establece niveles realistas**: Basa los umbrales en tu consumo histórico
2. **Revisa periódicamente**: Ajusta los niveles según la temporada
3. **Documenta cambios**: Lleva un registro de por qué ajustaste los niveles
4. **Productos críticos**: Establece umbrales más altos para productos esenciales
5. **Margen de seguridad**: Siempre deja un margen extra para imprevistos

---

## 🚀 Atajos de Teclado (Futuro)

```
Ctrl + L = Abrir modal de niveles del producto seleccionado
ESC      = Cerrar modal
Enter    = Guardar cambios
```

---

## 📋 Checklist de Implementación

- [✅] Modelo actualizado con campos stock_minimo y stock_medio
- [✅] Migración aplicada correctamente
- [✅] Template con modal y botón "Niveles"
- [✅] JavaScript para abrir modal y guardar datos
- [✅] Backend API para actualizar niveles
- [✅] Validaciones frontend y backend
- [✅] Indicadores de color dinámicos
- [✅] Estilos CSS integrados
- [✅] Documentación completa
- [✅] Testing manual completado

---

**Fecha de Implementación:** Enero 2025  
**Versión:** 1.0  
**Estado:** ✅ Implementado y Funcional
