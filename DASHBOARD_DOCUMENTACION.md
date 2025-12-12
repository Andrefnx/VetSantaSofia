# Dashboard - Sistema de Tableros por Rol

## Resumen

Se ha implementado un sistema completo de dashboards diferenciados por rol de usuario (Administrador, Recepción, Veterinario) que muestra información relevante según las funciones de cada usuario.

## Estructura Implementada

### 1. Vista Principal (`dashboard/views.py`)

La función `dashboard()` actúa como **router** que:
- Verifica autenticación del usuario
- Identifica el rol del usuario (CustomUser.rol)
- Redirige a la vista específica según rol
- Llama a la función auxiliar correspondiente para obtener datos

### 2. Funciones Auxiliares

#### `_datos_administrador(hoy)`
**Propósito**: Recopilar estadísticas globales del sistema

**Datos recopilados**:
- **Indicadores principales**:
  - Total de citas del día (todas)
  - Total de ingresos del día (ventas pagadas)
  - Total de pacientes atendidos hoy (citas completadas)
  - Total de pacientes hospitalizados (activos)

- **Agenda del día**:
  - Citas agrupadas por estado (pendiente, confirmada, en_curso, completada, cancelada, no_asistio)
  
- **Hospitalizaciones activas**:
  - Listado de pacientes hospitalizados
  - Días de hospitalización
  - Alerta si > 7 días sin registro
  
- **Estado de Caja**:
  - Estado actual (abierta/cerrada)
  - Total acumulado del día
  - Lista de cobros pendientes (ventas con estado='pendiente')
  
- **Inventario**:
  - Productos con stock bajo (stock_actual < 10)
  - Productos más usados hoy (via ConsultaInsumo)

**Template**: `dashboard/templates/dashboard/admin.html`

---

#### `_datos_recepcion(hoy, usuario)`
**Propósito**: Facilitar operaciones del día (agenda, cobros, atención)

**Datos recopilados**:
- **Agenda horaria**:
  - Vista por horas (8:00 - 20:00)
  - Indica slots libres y ocupados
  - Muestra todas las citas de cada hora
  
- **Estadísticas de agenda**:
  - Total de citas del día
  - Citas pendientes
  - Citas confirmadas
  - Citas completadas
  
- **Estado de Caja**:
  - Estado actual (abierta/cerrada)
  - Total acumulado
  - Lista de cobros pendientes
  
- **Pacientes recientes**:
  - Últimos 10 pacientes registrados
  - Opción de agendar cita rápidamente

**Template**: `dashboard/templates/dashboard/recepcion.html`

---

#### `_datos_veterinario(hoy, usuario)`
**Propósito**: Mostrar información clínica relevante del veterinario

**Datos recopilados**:
- **Indicadores**:
  - Total de citas del día (del veterinario)
  - Citas pendientes
  - Citas completadas
  - Pacientes hospitalizados asignados
  
- **Cita actual/próxima**:
  - Cita en curso (estado='en_curso')
  - Próxima cita pendiente o confirmada
  
- **Mis citas del día**:
  - Solo citas asignadas al veterinario
  - Ordenadas por hora_inicio
  
- **Mis hospitalizaciones**:
  - Hospitalizaciones donde veterinario = usuario
  - Fecha de último registro
  - Días de hospitalización
  
- **Alertas clínicas**:
  - Cobros pendientes (de sus consultas)
  - Insumos sin confirmar (ConsultaInsumo con confirmado=False)
  - Hospitalizaciones sin actualizar (>24 hrs sin RegistroDiario)

**Template**: `dashboard/templates/dashboard/veterinario.html`

---

## Templates

### `admin.html`
- **Layout**: 4 indicadores + 2 columnas (8-4)
- **Columna izquierda**: Agenda del día, Hospitalizaciones
- **Columna derecha**: Estado de caja, Alertas de inventario
- **Enlaces**: /agenda/, /hospital/, /caja/dashboard/, /inventario/

### `recepcion.html`
- **Layout**: Acciones rápidas + 2 columnas (8-4)
- **Columna izquierda**: Agenda horaria (8:00-20:00)
- **Columna derecha**: Estado de caja, Pacientes recientes
- **Características**:
  - Botones de acción rápida: Nueva cita, Buscar paciente, Abrir caja
  - Vista horaria con slots libres/ocupados
  - Botón "Agendar" en horarios libres
  - Indicadores de estado de citas
- **Enlaces**: /agenda/agendar/, /caja/abrir/, /caja/dashboard/, /pacientes/

### `veterinario.html`
- **Layout**: 4 indicadores + destacado cita actual + 2 columnas (8-4)
- **Columna izquierda**: Cita actual/próxima, Mi agenda del día
- **Columna derecha**: Mis hospitalizaciones, Alertas clínicas
- **Características**:
  - Destacado de cita en curso o próxima
  - Botones de acción: Iniciar consulta, Ver ficha
  - Alertas clínicas: cobros pendientes, insumos sin confirmar, hospitalizaciones sin actualizar
- **Enlaces**: /clinica/nueva_consulta/, /pacientes/, /hospital/

---

## Características Implementadas

### 1. **Solo Lectura**
- Todas las funciones auxiliares solo **consultan** datos
- No realizan modificaciones (INSERT, UPDATE, DELETE)
- Los botones/enlaces redirigen a las vistas correspondientes para acciones

### 2. **Filtrado por Rol**
- Administrador: ve **todo el sistema**
- Recepción: ve **operaciones del día** (todas las citas, caja)
- Veterinario: ve solo **sus citas y hospitalizaciones**

### 3. **Manejo de Errores**
- Todas las queries usan `try-except` para evitar errores si faltan relaciones
- Valores por defecto cuando no hay datos

### 4. **Rendimiento**
- Uso de `select_related()` y `prefetch_related()` para optimizar queries
- Uso de `annotate()` y `aggregate()` para cálculos en DB
- Filtrado en DB en lugar de Python

### 5. **Diseño Responsive**
- Uso de clases Bootstrap (col-sm, col-md)
- Cards de KaiAdmin
- Iconos de Font Awesome

---

## Uso

### Acceso
```
URL: /dashboard/
```

El sistema detecta automáticamente el rol del usuario logeado y carga la vista correspondiente:
- `user.rol == 'administracion'` → `admin.html`
- `user.rol == 'recepcion'` → `recepcion.html`
- `user.rol == 'veterinario'` → `veterinario.html`

### Dependencias
- `django.contrib.auth.decorators.login_required`
- `django.utils import timezone`
- `django.db.models import Q, Count, Sum`
- Modelos: Cita, Paciente, Hospitalizacion, Insumo, SesionCaja, Venta, DetalleVenta, ConsultaInsumo, RegistroDiario

### Permisos
- Requiere autenticación (`@login_required`)
- No requiere permisos adicionales
- El filtrado por rol es automático

---

## Mantenimiento

### Agregar nuevos indicadores
1. Editar función auxiliar correspondiente en `views.py`
2. Agregar query necesaria
3. Incluir en el contexto retornado
4. Actualizar template correspondiente

### Modificar diseño
- Los templates usan clases de **KaiAdmin** y **Bootstrap 5.3**
- Estructura: `card` > `card-header` > `card-body`
- Iconos: Font Awesome 6.4

### Agregar nuevo rol
1. Agregar nueva función auxiliar `_datos_NUEVO_ROL()`
2. Agregar condición en `dashboard()`
3. Crear template `NUEVO_ROL.html`

---

## Notas Importantes

1. **No se modificaron modelos existentes**
2. **No se modificaron rutas existentes**
3. **No se eliminó lógica previa** (las vistas de componentes se mantienen)
4. **No se usaron librerías externas** de dashboards
5. **El código es compatible con el sistema existente**

---

## Testing

Para probar el dashboard:

1. **Crear usuarios de prueba** con diferentes roles:
```python
from cuentas.models import CustomUser

# Administrador
admin = CustomUser.objects.create_user(
    username='admin_test',
    rol='administracion',
    password='test123'
)

# Recepcionista
recep = CustomUser.objects.create_user(
    username='recep_test',
    rol='recepcion',
    password='test123'
)

# Veterinario
vet = CustomUser.objects.create_user(
    username='vet_test',
    rol='veterinario',
    password='test123'
)
```

2. **Login con cada usuario** y acceder a `/dashboard/`
3. **Verificar** que cada rol vea su vista correspondiente
4. **Verificar** que los datos mostrados sean correctos y filtrados por rol

---

## Soporte

Si se necesitan modificaciones:
- Los templates están en `dashboard/templates/dashboard/`
- Las vistas están en `dashboard/views.py`
- Los estilos se heredan de `partials/base.html`
