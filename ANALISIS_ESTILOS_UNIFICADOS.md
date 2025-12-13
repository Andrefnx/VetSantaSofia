# 📊 ANÁLISIS EXHAUSTIVO DE ESTILOS DEL PROYECTO

Fecha: 12 de Diciembre, 2025
Versión: 1.0

---

## 🎯 RESUMEN EJECUTIVO

Se han identificado **múltiples estilos duplicados y dispersos** en el proyecto. Los archivos CSS presentan:
- **6 variables de colores** diferentes definidas en múltiples archivos
- **3 sistemas de botones** distintos (`vet-btn`, `btn-primary`, `btn-neutral`)
- **Modales sin estandarizar** aunque siguen el mismo patrón
- **Inputs y formularios** sin estilos unificados
- **Z-index hierarchy** inconsistente

---

## 📁 ESTRUCTURA CSS ACTUAL

```
static/css/
├── base/
│   ├── vet-custom.css          (240 líneas)
│   ├── buttons_guide.css       (241 líneas)
│   ├── modals_base.css         (312 líneas)
│   ├── tables_base.css         (506 líneas)
│   ├── select-custom.css       (variable)
│   ├── filters_base.css        (variable)
│   └── bootstrap.min.css       (framework base)
├── custom/
│   ├── pacientes.css           (2053 líneas) ⚠️ MUY GRANDE
│   ├── style_inventario.css
│   ├── consulta_inventario.css
│   ├── hospitalizaciones.css
│   └── lotes.css
└── kaiadmin.css                (framework template)
```

---

## 🎨 PALETA DE COLORES IDENTIFICADA

### Variables de Color Definidas Múltiples Veces:

| Variable | Archivo 1 | Archivo 2 | Archivo 3 | Color Final |
|----------|-----------|-----------|-----------|-------------|
| `--primary-color` | `#1e88e5` (vet-custom) | `#afe1af` (buttons_guide) | `#9fcf9f` (pacientes) | **`#afe1af`** ✓ |
| `--primary-hover` | `#1565c0` | `#89c57c` | `#75b167` | **`#89c57c`** ✓ |
| `--success-color` | `#43a047` | `#6b8e6b` | - | **`#6b8e6b`** ✓ |
| `--danger-color` | `#e53935` | `#dc3545` | - | **`#dc3545`** ✓ |
| `--text-dark` | `#212121` | `#103012` | - | **`#103012`** ✓ |
| `--text-light` | `#757575` | - | - | **`#757575`** ✓ |
| `--bg-light` | `#f5f5f5` | `#f8f9fa` | - | **`#f8f9fa`** ✓ |

### Colores Específicos Encontrados:

- **Verde primario**: `#afe1af` (usado en botones, headers, destacados)
- **Verde hover**: `#89c57c` (interacciones)
- **Verde musgo**: `#6b8e6b` (botones secundarios)
- **Gris**: `#999999` (botones grises, bordes)
- **Gris oscuro hover**: `#808080`, `#666666`
- **Rojo/Peligro**: `#dc3545` (eliminación, alertas)
- **Blanco/Neutro**: `#ffffff`, `#f0f0f0`

---

## 🔘 SISTEMA DE BOTONES

### Botones Primarios
```css
/* Clases encontradas */
.vet-btn-primary
.btn-primary
.btn-success-custom

/* Color: Verde #afe1af */
/* Hover: Verde oscuro #89c57c */
/* Padding: 10px 18px */
/* Border-radius: 8px */
```

### Botones Secundarios/Grises
```css
.vet-btn-grey
.btn-secondary
.btn-grey-custom

/* Color: Gris #999999 */
/* Hover: Gris oscuro #808080 */
```

### Botones Peligro
```css
.vet-btn-danger
.btn-danger
.btn-danger-custom

/* Color: Rojo #dc3545 */
/* Hover: Rojo oscuro #c82333 */
```

### Botones Neutros/White
```css
.vet-btn
.btn-neutral
.btn-white-custom

/* Color: Blanco con borde gris #999999 */
/* Hover: Gris claro #f0f0f0 */
```

### Botones Pequeños con Iconos
```css
.btn-sm-icon
.btn-icon-small

/* Padding: 0.35rem 0.6rem */
/* Border: 1px solid #cccccc */
/* Hover: Color primario */
```

---

## 📋 COMPONENTES DE TABLAS

### Estructura Identificada:
- `.table-header` / `.table-header-grid` - Contenedor con título y controles
- `.table-header-controls` - Filtros y buscadores
- `.table-actions` - Botones de acción
- `.table-action-buttons` - Contenedor flexible de botones
- `.vet-custom-select-wrapper` - Select personalizado
- `.search-bar` - Buscador de texto

### Estilos Base:
```css
/* Shadow */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

/* Border */
border-radius: 16px (headers), 8px (elementos)
border: 1.5px solid #e0e0e0

/* Padding */
1.5rem (headers), 1rem-2rem (secciones)
```

---

## 🪟 MODALES

### Clases Estandar:
```css
.vet-modal-overlay          /* Fondo semitransparente */
.vet-custom-modal           /* Modal grande (max-width: 1100px) */
.vet-modal-compact          /* Modal pequeño (max-width: 400px) */
.vet-custom-modal-title     /* Encabezado con fondo verde */
.vet-modal-body             /* Contenedor de contenido */
```

### Propiedades Base:
```css
/* Z-index */
--z-modal-backdrop: 999998
--z-modal: 999999

/* Animación */
Transición suave (0.35s cubic-bezier)
Escala inicial: 0.98

/* Header */
Fondo: rgb(132, 190, 132) - Verde musgo
Color: Blanco
Padding: 18px 28px
Font-size: 1.4rem-1.5rem
```

---

## 📝 INPUTS Y FORMULARIOS

### Selectores Personalizados:
```css
.vet-custom-select
.vet-custom-select-wrapper
.vet-custom-select-dropdown

/* Estilos */
Background: white
Border: 1.5px solid #e0e0e0
Border-radius: 8px
Padding: 8px 12px
```

### Inputs Estándar:
```css
/* Propiedades encontradas */
font-size: 0.9rem
padding: 8px 12px o 10px 14px
border: 1.5px solid var(--border-color)
border-radius: 8px
```

### Validación en Focus:
```css
border-color: var(--primary-color) #afe1af
box-shadow: 0 0 0 3px rgba(175, 225, 175, 0.25)
```

---

## 🎯 ESPACIADOS IDENTIFICADOS

### Margins y Paddings:
```css
/* Gaps */
gap: 1.5rem (headers)
gap: 1rem (secciones)
gap: 12px (botones dentro)
gap: 8px (iconos y texto)

/* Padding */
2rem (container-fluid)
1.5rem (headers)
1.2rem (secciones)
18px 28px (modal headers)
24px 28px (modal body)

/* Margin-bottom */
h1: 1.5rem
h2: 1.25rem
h3: 1rem
h4: 0.75rem
```

---

## 🔤 TIPOGRAFÍA

### Tamaños:
```css
h1: 1.8rem (font-weight: 1000)
h2: 1.5rem (font-weight: 600)
h3: 1.25rem (font-weight: 600)
h4: 1.1rem (font-weight: 600)
body/p: 0.9rem (por defecto)
small/label: 0.85rem
```

### Font-weights:
- Bold text: 600-1000
- Normal: 400-500
- Light: no especificado (usa defecto)

---

## ⚡ PROBLEMAS IDENTIFICADOS

### 1. Duplicación de Variables
- Mismas variables de color definidas en 3+ archivos
- Valores ligeramente diferentes (inconsistencia)

### 2. Múltiples Sistemas de Clases
- `vet-btn-*` vs `btn-*` coexisten
- No hay nomenclatura consistente
- Algunos estilos son `!important` excesivamente

### 3. Ausencia de Componentes Base
- No hay CSS unificado para badges
- Alerts sin estandarizar
- Cards sin estructura CSS clara

### 4. Archivos CSS Muy Grandes
- `pacientes.css`: 2053 líneas (debería separarse)
- Contiene estilos específicos de módulo mezclados

### 5. Z-index Inconsistente
- Sidebar: 200
- Navbar: 100
- Modales: 999998-999999
- Popover: 10, 1000 (inconsistente)

---

## 📦 COMPONENTES A ESTANDARIZAR

### ✅ Botones
- [ ] Sistema único de clases
- [ ] Tamaños (normal, small, large)
- [ ] Variantes (primary, secondary, danger, success)
- [ ] Estados (normal, hover, active, disabled)
- [ ] Con iconos

### ✅ Inputs
- [ ] Text input
- [ ] Email input
- [ ] Tel input
- [ ] Number input
- [ ] Select dropdown
- [ ] Textarea
- [ ] Inline forms

### ✅ Tablas
- [ ] Contenedor y header
- [ ] Filas con hover
- [ ] Alternancia de color
- [ ] Iconos de gestión
- [ ] Estados responsivos

### ✅ Cards
- [ ] Card básica
- [ ] Card con acciones
- [ ] Card de datos (ficha)
- [ ] Card de caja

### ✅ Modales
- [ ] Modal estándar
- [ ] Modal compacto
- [ ] Modal de confirmación
- [ ] Modal de edición

### ✅ Alerts y Badges
- [ ] Alert success
- [ ] Alert warning
- [ ] Alert danger
- [ ] Alert info
- [ ] Badge primario
- [ ] Badge secundario

### ✅ Textos
- [ ] Headings (h1-h6)
- [ ] Párrafos
- [ ] Labels
- [ ] Textos secundarios
- [ ] Links

---

## 🚀 PRÓXIMOS PASOS

1. ✅ **Crear `estilos_generales.css`**
   - Definir `:root` con variables únicas
   - Componentizar botones, inputs, tablas, modales
   - Establecer espaciados y tipografía base

2. ✅ **Crear `estandares.html`**
   - Página de vista previa de componentes
   - Mostrar todas las variantes
   - Facilitar revisión visual

3. ✅ **Crear `views_ui.py`**
   - Función para renderizar estandares.html
   - URL accesible desde Django

4. ✅ **Documentar integración**
   - Cómo agregar la ruta en urls.py
   - Cómo importar CSS en templates

---

## 📊 ESTADO

- **Análisis**: ✅ COMPLETO
- **Preparación de archivos**: ⏳ EN PROGRESO
- **Creación de estilos_generales.css**: ⏳ PENDIENTE
- **Creación de estandares.html**: ⏳ PENDIENTE
- **Creación de views_ui.py**: ⏳ PENDIENTE

