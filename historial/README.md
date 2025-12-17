# Sistema de Auditoría y Trazabilidad

## 📋 Descripción

Módulo centralizado para registrar y auditar cambios en las entidades principales del sistema: **Inventario**, **Servicios** y **Pacientes**.

## 🏗️ Arquitectura

### Arquitectura Híbrida

El sistema utiliza una **arquitectura híbrida** que combina:

1. **Campos rápidos** en cada modelo (para consultas eficientes):
   - `ultimo_movimiento`
   - `tipo_ultimo_movimiento`
   - `usuario_ultima_modificacion`

2. **Modelo central** `RegistroHistorico` (para auditoría completa):
   - Historial completo de eventos
   - Datos estructurados en JSON
   - Trazabilidad de quién, cuándo, qué cambió

## 📊 Modelo: RegistroHistorico

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `fecha_evento` | DateTimeField | Timestamp del evento |
| `entidad` | CharField | Tipo de entidad ('inventario', 'servicio', 'paciente') |
| `objeto_id` | PositiveIntegerField | ID del registro afectado |
| `tipo_evento` | CharField | Clasificación del evento |
| `descripcion` | TextField | Descripción legible para usuarios |
| `datos_cambio` | JSONField | Estructura con valores anteriores/nuevos |
| `usuario` | ForeignKey(User) | Usuario responsable (nullable) |
| `criticidad` | CharField | Nivel: baja, media, alta, crítica |

### Tipos de Eventos

#### Eventos Comunes
- `creacion` - Creación de registro
- `modificacion_informacion` - Cambios en datos descriptivos
- `activacion` - Activación de registro
- `desactivacion` - Desactivación de registro

#### Eventos de Inventario
- `ingreso_stock` - Aumento de stock
- `salida_stock` - Disminución de stock
- `actualizacion_precio` - Cambio de precio

#### Eventos de Servicios
- `cambio_precio_servicio` - Cambio de precio
- `cambio_duracion` - Cambio de duración
- `cambio_categoria` - Cambio de categoría

#### Eventos de Pacientes
- `cambio_propietario` - Transferencia de custodia
- `actualizacion_peso` - Actualización de peso
- `actualizacion_antecedentes` - Cambios en antecedentes médicos
- `modificacion_datos_basicos` - Cambios en datos generales

## 🚀 Uso

### Registrar Eventos Manualmente

```python
from historial.models import RegistroHistorico

# Método básico
evento = RegistroHistorico.registrar_evento(
    entidad='servicio',
    objeto_id=10,
    tipo_evento='creacion',
    descripcion='Servicio "Vacunación Antirrábica" creado',
    usuario=request.user,
    datos_cambio={'precio': 15000},
    criticidad='baja'
)
```

### Usar Funciones Helper

```python
from historial.utils import (
    registrar_creacion,
    registrar_cambio_precio,
    registrar_cambio_stock,
    registrar_cambio_propietario,
    registrar_actualizacion_peso,
    registrar_actualizacion_antecedentes,
    registrar_cambio_estado,
    registrar_modificacion_informacion,
)

# Registrar creación
registrar_creacion(
    entidad='servicio',
    objeto_id=servicio.idServicio,
    nombre_objeto=servicio.nombre,
    usuario=request.user
)

# Registrar cambio de precio
registrar_cambio_precio(
    entidad='servicio',
    objeto_id=servicio.idServicio,
    nombre_objeto=servicio.nombre,
    precio_anterior=15000,
    precio_nuevo=18000,
    usuario=request.user
)

# Registrar cambio de stock
registrar_cambio_stock(
    objeto_id=insumo.idInventario,
    nombre_insumo=insumo.medicamento,
    tipo_movimiento='ingreso_stock',
    stock_anterior=10,
    stock_nuevo=50,
    usuario=request.user
)

# Registrar cambio de propietario
registrar_cambio_propietario(
    paciente_id=paciente.id,
    nombre_paciente=paciente.nombre,
    propietario_anterior=propietario_viejo,
    propietario_nuevo=propietario_nuevo,
    usuario=request.user
)
```

### Consultar Historial

```python
from historial.models import RegistroHistorico

# Obtener historial completo
historial = RegistroHistorico.obtener_historial('paciente', paciente_id)

# Limitar resultados
ultimos_10 = RegistroHistorico.obtener_historial('servicio', servicio_id, limit=10)

# Filtrar por criticidad
eventos_criticos = RegistroHistorico.objects.filter(
    entidad='paciente',
    objeto_id=paciente_id,
    criticidad='critica'
)
```

## 🎯 Reglas Importantes

### ✅ HACER
- Registrar eventos desde **signals** (no desde vistas)
- Capturar excepciones al registrar (usar `registrar_evento()`)
- Usar criticidad apropiada según impacto
- Incluir `datos_cambio` con valores anteriores/nuevos
- Mantener descripciones claras y legibles

### ❌ NO HACER
- NO editar registros históricos (append-only)
- NO registrar desde vistas manualmente
- NO fallar la operación principal si falla el registro
- NO eliminar registros (salvo casos extremos con supervisión)
- NO usar GenericForeignKey (usar entidad + objeto_id)

## 📈 Estructura de datos_cambio

**FORMATO ESTANDARIZADO:** Todos los campos usan `"antes"` y `"despues"`

### Ejemplo: Cambio de Precio
```json
{
  "campo": "precio",
  "antes": 15000,
  "despues": 18000,
  "cambio_porcentual": 20.0
}
```

### Ejemplo: Cambio de Propietario
```json
{
  "campo": "propietario",
  "antes": {
    "id": 5,
    "nombre": "Juan Pérez",
    "telefono": "+56912345678"
  },
  "despues": {
    "id": 12,
    "nombre": "María González",
    "telefono": "+56987654321"
  }
}
```

### Ejemplo: Actualización de Antecedentes
```json
{
  "campo": "alergias",
  "antes": "Ninguna conocida",
  "despues": "Alergia a penicilina"
}
```

## 🎨 Helpers de Presentación

### Obtener Icono
```python
evento = RegistroHistorico.objects.first()
icono = evento.get_icono()  # Retorna clase Font Awesome
# Ejemplo: 'fa-dollar-sign' para actualizacion_precio
```

### Obtener Color de Criticidad
```python
color_class = evento.get_color_criticidad()
# Retorna: 'text-secondary', 'text-info', 'text-warning', 'text-danger'
```

## 🔍 Admin

El modelo está registrado en el Django Admin con las siguientes restricciones:

- ✅ **Solo lectura**: No se pueden editar registros
- ❌ **No agregar**: No se pueden crear registros manualmente
- ❌ **No eliminar**: Solo superusuarios pueden eliminar (casos extremos)

## 🔄 Próximos Pasos

### Fase 2: Signals
- Crear signals para Inventario
- Crear signals para Servicios
- Crear signals para Pacientes

### Fase 3: UI/Frontend
- Componente Timeline reutilizable
- Integración en modales de detalle
- Tab "Historial" en fichas

### Fase 4: Reportes
- Dashboard de eventos por entidad
- Alertas de eventos críticos
- Exportación de auditoría

## 📝 Notas Técnicas

- **Base de datos**: Tabla `registro_historico`
- **Índices**: Optimizados para búsquedas por entidad, fecha y criticidad
- **Ordering**: Descendente por `fecha_evento`
- **Timezone**: Usa `django.utils.timezone.now()`
- **JSON**: Compatible con PostgreSQL JSONField y SQLite JSON1

## 🛡️ Seguridad

- Los registros son **append-only** (solo agregar, nunca editar)
- Captura de excepciones para no interrumpir operaciones principales
- Logging de errores en registro de eventos
- Usuario nullable para soportar cambios automáticos del sistema
