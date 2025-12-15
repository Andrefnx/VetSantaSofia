# Guía de Partials - Dashboard Modular

## 🎯 Estructura General

Todos los dashboards usan la misma estructura modular a través de partials. Cada partial está diseñado para soportar múltiples roles (Admin, Veterinario, Recepción) mediante conditionals, sin crear clases CSS duplicadas.

---

## 📦 Los 5 Partials Modulares

### 1. agenda.html - La Agenda del Día
**Ubicación**: `dashboard/templates/partials/dashboard/agenda.html`

**Uso en dashboards**:
```django
{% include 'partials/dashboard/agenda.html' with role='admin' %}
{% include 'partials/dashboard/agenda.html' with role='veterinario' %}
{% include 'partials/dashboard/agenda.html' with role='recepcion' %}
```

**Variables de contexto requeridas**:
```python
# Para Admin
citas_stats = {
    'pendientes': int,
    'confirmadas': int,
    'completadas': int,
    'canceladas': int
}
proximas_citas = QuerySet(Cita)
hoy = date

# Para Veterinario
mis_citas = QuerySet(Cita)
hoy = date

# Para Recepción
horarios = [
    {
        'hora': '09:00',
        'libre': bool,
        'citas': QuerySet(Cita)
    }
]
hoy = date
```

**Vistas**:
- **Admin**: Tabla 4 columnas (Hora, Paciente, Veterinario, Acciones) + stats
- **Veterinario**: Tabla 6 columnas (Hora, Paciente, Propietario, Tipo, Estado, Acciones) + manage-wheel
- **Recepción**: Agenda horaria con slots libres/ocupados

---

### 2. acciones.html - Acciones Rápidas
**Ubicación**: `dashboard/templates/partials/dashboard/acciones.html`

**Uso en dashboards** (SOLO RECEPCIÓN):
```django
{% include 'partials/dashboard/acciones.html' with role='recepcion' %}
```

**Variables de contexto requeridas**:
```python
caja_stats = {
    'estado': 'abierta' | 'cerrada'  # Determina si botón es "Abrir" o "Ir a Caja"
}
```

**Componentes**:
- Botón Nueva Cita (gradiente azul-púrpura)
- Botón Buscar Paciente (gradiente rosa-rojo)
- Botón Abrir Caja O Ir a Caja (gradiente azul-cian)

---

### 3. caja.html - Panel de Caja
**Ubicación**: `dashboard/templates/partials/dashboard/caja.html`

**Uso en dashboards**:
```django
{% include 'partials/dashboard/caja.html' with role='admin' show_cobros_pending_list=False %}
{% include 'partials/dashboard/caja.html' with role='recepcion' show_cobros_pending_list=True %}
```

**Variables de contexto requeridas**:
```python
caja_stats = {
    'estado': 'abierta' | 'cerrada',
    'abierta_por': str,
    'monto_inicial': float,
    'total_vendido': float,
    'cobros_pendientes': [
        {
            'factura': str,
            'paciente': str,
            'propietario': str,
            'monto': float,
            'dias_atraso': int
        }
    ]
}
```

**Parámetros opcionales**:
- `show_cobros_pending_list` (bool): Si mostrar lista de cobros pendientes (default: False)

**Vistas**:
- **Admin**: Resumen simple + botón Abrir Caja
- **Recepción**: Stats summary + lista scrolleable cobros + botones Abrir/Ir/Venta Libre

---

### 4. pacientes.html - Pacientes Recientes
**Ubicación**: `dashboard/templates/partials/dashboard/pacientes.html`

**Uso en dashboards** (SOLO RECEPCIÓN):
```django
{% include 'partials/dashboard/pacientes.html' with role='recepcion' %}
```

**Variables de contexto requeridas**:
```python
pacientes_recientes = [
    {
        'id': int,
        'nombre': str,
        'propietario': {
            'nombre_completo': str
        },
        'especie': 'perro' | 'gato' | ...,
        'ultima_cita': datetime | None
    }
]
```

**Componentes**:
- Lista scrolleable con ícono especie (perro/gato/otro)
- Datos: Nombre, Propietario, Última consulta
- Botón "Ver ficha" con link a ficha mascota

---

### 5. hospitalizaciones.html - Pacientes Hospitalizados
**Ubicación**: `dashboard/templates/partials/dashboard/hospitalizaciones.html`

**Uso en dashboards**:
```django
{% include 'partials/dashboard/hospitalizaciones.html' with role='admin' %}
{% include 'partials/dashboard/hospitalizaciones.html' with role='veterinario' %}
```

**Variables de contexto requeridas**:
```python
# Para Admin
hospitalizaciones_activas = [
    {
        'id': int,
        'paciente': {
            'id': int,
            'nombre': str,
            'propietario': {
                'nombre_completo': str,
                'telefono': str,
                'email': str
            }
        },
        'veterinario': {
            'nombre': str,
            'apellido': str
        },
        'dias_hospitalizacion': int
    }
]

# Para Veterinario
mis_hospitalizaciones = [
    {
        'id': int,
        'paciente': {
            'id': int,
            'nombre': str,
            'especie': str,
            'propietario': {
                'nombre_completo': str
            }
        },
        'veterinario': {
            'nombre': str,
            'apellido': str
        },
        'fecha_ingreso': datetime,
        'dias_hospitalizacion': int,
        'diagnostico': str,
        'tratamiento': str,
        'temperatura': float,
        'pulso': int,
        'frecuencia_respiratoria': int,
        'dias_sin_actualizar': int
    }
]
```

**Vistas**:
- **Admin**: Tabla simplificada (Paciente, Veterinario, Contacto, Días)
- **Veterinario**: Componentes expandibles con vitales, diagnóstico, tratamiento

---

## 🎨 Patrones CSS Utilizados

### Ninguna clase CSS nueva fue creada. Todos los partials usan clases existentes:

```
Container principal:
  .card .vet-card .card-round

Headers:
  .card-header
  .card-head-row
  .card-title

Botones:
  .vet-btn
  .vet-btn-sm
  .vet-btn-block

Tablas:
  .table .table-hover
  .table-warning (highlight en_curso)
  .table-success (highlight completada)

Badges:
  .badge .badge-lg
  .badge-success, .badge-danger, .badge-info, .badge-warning, .badge-secondary

Listas:
  .list-group .list-group-item
  .rd-pacientes-scroll (Recepción)
  .rd-cobros-scroll (Recepción)

Hospitalizaciones Vet:
  .vd-hosp-card
  .vd-hosp-header, .vd-hosp-body, .vd-hosp-footer
  .vd-hosp-vitales, .vd-hosp-days
```

---

## 🔄 Flujo de Datos

```
View (dashboard/views.py)
  ↓ (context)
Dashboard HTML (admin.html / veterinario.html / recepcion.html)
  ↓ ({% include %})
Partial (agenda.html / acciones.html / caja.html / pacientes.html / hospitalizaciones.html)
  ↓ ({% if role == ... %})
Condicionales Django
  ↓ (render)
HTML con clases CSS existentes
  ↓ (dashboard_vet.css)
Estilos unificados
```

---

## 💡 Reglas de Oro

1. **Role Parameter es obligatorio**: Siempre pasar `role='admin'|'veterinario'|'recepcion'`
2. **NO crear clases CSS nuevas**: Usar solo clases de `dashboard_vet.css`
3. **Django Conditionals**: Cambios visuales se hacen con `{% if role == ... %}`, no con CSS
4. **Context Variables**: Las variables de contexto deben coincidir con los nombres esperados
5. **Reusability**: Los partials son la fuente única de verdad para cada componente

---

## 🧪 Testing (Verificar Visualmente)

Para validar que los partials se renderizan correctamente:

1. **Admin Dashboard**:
   - Verify: Tabla agenda muestra columna Veterinario
   - Verify: Stats de citas (pendientes, confirmadas, etc.)
   - Verify: Hospitalizaciones en tabla
   - Verify: Caja sin lista de cobros

2. **Veterinario Dashboard**:
   - Verify: Tabla agenda SIN columna Veterinario
   - Verify: Manage-wheel en acciones
   - Verify: Cita Actual y Próxima Cita alerts
   - Verify: Hospitalizaciones expandibles

3. **Recepción Dashboard**:
   - Verify: Acciones Rápidas con gradientes
   - Verify: Agenda horaria
   - Verify: Caja con cobros pendientes
   - Verify: Pacientes recientes

---

## 📚 Referencias Relacionadas

- `dashboard/templates/partials/dashboard_base.html` - Base template
- `static/css/custom/dashboard_vet.css` - Estilos unificados
- `REFACTORING_VALIDATION.md` - Documentación completa del refactoring

---

**Última actualización**: 2024
**Versión de partials**: 1.0
