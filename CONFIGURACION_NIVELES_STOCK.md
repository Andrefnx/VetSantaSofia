# Configuración de Niveles de Stock - Sistema de Inventario

## 📋 Resumen
Se implementó un sistema de configuración de niveles de stock personalizable para el módulo de inventario. Ahora puedes definir los umbrales de stock mínimo y medio para cada producto, y el sistema mostrará automáticamente colores indicadores (rojo, naranja, verde).

## 🎯 Funcionalidad Implementada

### 1. Modelo de Datos
**Archivo:** `inventario/models.py`

Se agregaron dos nuevos campos al modelo `Insumo`:
- `stock_minimo`: Umbral de stock bajo (predeterminado: 10)
- `stock_medio`: Umbral de stock medio (predeterminado: 20)

**Métodos agregados:**
```python
def get_stock_nivel(self):
    """Retorna 'bajo', 'medio' o 'alto' según los niveles configurados"""
    
def get_stock_color(self):
    """Retorna el color hexadecimal según el nivel de stock"""
```

**Migración:** `inventario/migrations/0007_insumo_stock_medio_insumo_stock_minimo.py`

### 2. Interfaz de Usuario
**Archivo:** `inventario/templates/inventario/inventario.html`

#### Botón "Niveles" en menú de gestión
Se agregó un nuevo botón en la rueda de gestión de cada producto:
```html
<button onclick="openConfigNivelesModal(this)">
    <i class="fas fa-sliders-h"></i> Niveles
</button>
```

#### Modal de Configuración
Se creó un modal completo con:
- Campo para Stock Mínimo (Rojo) con icono de alerta
- Campo para Stock Medio (Naranja) con icono de advertencia
- Información sobre Stock Alto (Verde) - calculado automáticamente
- Botones de Cancelar y Guardar

#### Indicadores de Stock Dinámicos
Los badges de stock ahora usan colores dinámicos según el nivel configurado:
- 🔴 Rojo: Stock actual ≤ stock_minimo
- 🟠 Naranja: Stock actual entre stock_minimo y stock_medio
- 🟢 Verde: Stock actual > stock_medio

### 3. Lógica de Frontend
**Archivo:** `static/js/inventario/crud_inventario.js`

#### Funciones Implementadas:

**`openConfigNivelesModal(btn)`**
- Obtiene el ID del producto desde la fila de la tabla
- Carga los valores actuales de stock_minimo y stock_medio
- Muestra el modal con los datos poblados

**`guardarNivelesStock()`**
- Valida que ambos valores estén ingresados
- Valida que stock_minimo < stock_medio
- Envía los datos al backend vía AJAX
- Recarga la página para actualizar los colores

**`closeVetModal(modalId)`**
- Cierra el modal agregando la clase 'hide'

**`getCookie(name)`**
- Obtiene el token CSRF para peticiones POST

### 4. Backend API
**Archivo:** `inventario/views.py`

#### Vista: `actualizar_niveles_stock(request, insumo_id)`
- Método: POST
- Requiere autenticación (`@login_required`)
- Recibe: `stock_minimo` y `stock_medio` en JSON
- Validaciones:
  - Verifica que ambos valores existan
  - Valida que stock_minimo < stock_medio
- Actualiza el modelo Insumo
- Retorna respuesta JSON con éxito/error

#### Actualización de `detalle_insumo()`
Se agregaron los campos de stock a la respuesta JSON:
```python
'stock_minimo': float(insumo.stock_minimo) if insumo.stock_minimo else 10,
'stock_medio': float(insumo.stock_medio) if insumo.stock_medio else 20,
```

### 5. Rutas
**Archivo:** `inventario/urls.py`

Nueva ruta agregada:
```python
path('<int:insumo_id>/actualizar-niveles/', views.actualizar_niveles_stock, name='actualizar_niveles_stock'),
```

## 🚀 Cómo Usar

1. **Acceder al Inventario**
   - Navega a la sección de Inventario

2. **Configurar Niveles**
   - Haz clic en el botón de gestión (⚙️) de cualquier producto
   - Selecciona "Niveles" en el menú
   - Ingresa el valor de Stock Mínimo (ej: 5)
   - Ingresa el valor de Stock Medio (ej: 15)
   - Haz clic en "Guardar"

3. **Ver Indicadores**
   - Los badges de stock cambiarán de color automáticamente según los niveles configurados
   - 🔴 Rojo = necesitas reponer urgente
   - 🟠 Naranja = stock está por agotarse
   - 🟢 Verde = stock suficiente

## 🎨 Estilos Utilizados

El modal usa las clases CSS existentes del sistema:
- `.vet-modal-overlay` - Overlay del modal
- `.vet-modal` - Contenedor del modal
- `.vet-modal-header` - Encabezado con título y botón cerrar
- `.vet-modal-body` - Cuerpo del modal con formulario
- `.vet-btn-grey` - Botones grises estándar
- `.vet-btn-grey.success` - Botón de guardar (verde al hover)
- `.vet-badge` - Badges de stock con colores dinámicos

## 📊 Flujo de Datos

```
Usuario hace clic en "Niveles"
        ↓
openConfigNivelesModal() obtiene ID del producto
        ↓
Fetch a /inventario/{id}/detalle/
        ↓
Modal se puebla con valores actuales
        ↓
Usuario edita y hace clic en "Guardar"
        ↓
guardarNivelesStock() valida datos
        ↓
POST a /inventario/{id}/actualizar-niveles/
        ↓
Backend actualiza modelo Insumo
        ↓
Página se recarga mostrando nuevos colores
```

## ✅ Validaciones Implementadas

1. **Frontend:**
   - Campos requeridos no pueden estar vacíos
   - Stock mínimo debe ser menor que stock medio
   - Solo acepta números positivos (input type="number" min="0")

2. **Backend:**
   - Verifica autenticación del usuario
   - Valida que los valores existan
   - Valida que stock_minimo < stock_medio
   - Manejo de errores con try-catch

## 🧪 Testing

Para probar la funcionalidad:

1. Crea un producto con stock actual de 5
2. Configura stock_minimo = 10, stock_medio = 20
3. Verifica que el badge sea rojo 🔴
4. Actualiza el stock a 15
5. Verifica que el badge sea naranja 🟠
6. Actualiza el stock a 25
7. Verifica que el badge sea verde 🟢

## 📝 Notas Técnicas

- Los valores predeterminados son: stock_minimo=10, stock_medio=20
- Los campos son de tipo Decimal para precisión
- La página se recarga después de guardar para actualizar los colores
- El modal usa el mismo sistema de gestión de ruedas que otros módulos
- Compatible con el sistema de permisos existente (@login_required)

## 🔄 Posibles Mejoras Futuras

1. Actualizar colores sin recargar la página (AJAX dinámico)
2. Configuración masiva de niveles para múltiples productos
3. Alertas automáticas cuando un producto llegue a stock bajo
4. Historial de cambios en niveles de stock
5. Sugerencias automáticas de niveles basadas en consumo histórico
