# Matriz de Visibilidad por Rol - Dashboard VetSantaSofia

## Resumen Ejecutivo

Implementación de control de visibilidad modular en los dashboards de VetSantaSofia. Cada rol (Administrador, Veterinario, Recepción) ve únicamente los módulos y funcionalidades relevantes para su rol, usando condicionales Django en partials reutilizables.

---

## 📋 Arquitectura de Implementación

### Principios Seguidos
✅ **Un solo partial para los 3 roles**: No hay duplicación de bloques completos  
✅ **Condicionales basadas en `user.rol`**: Control de visibilidad directo en templates  
✅ **Sin CSS para permisos**: No se usa `display:none` para ocultar información sensible  
✅ **Estructura HTML base idéntica**: Todos los roles comparten la misma estructura base  
✅ **Sin cambios a lógica de negocio**: Ni vistas ni modelos fueron modificados  

### Archivos Modificados
- `dashboard/templates/dashboard/admin.html`
- `dashboard/templates/dashboard/veterinario.html`
- `dashboard/templates/dashboard/recepcion.html`
- `dashboard/templates/partials/dashboard/agenda.html`
- `dashboard/templates/partials/dashboard/acciones.html`
- `dashboard/templates/partials/dashboard/caja.html`
- `dashboard/templates/partials/dashboard/hospitalizaciones.html`
- `dashboard/templates/partials/dashboard/pacientes.html`

---

## 🔐 Matriz de Visibilidad por Módulo

### AGENDA

| Rol | Visibilidad | Contenido |
|-----|-------------|-----------|
| **Administrador** | ✅ Visible | Resumen (conteos y próximas 5 citas) |
| **Veterinario** | ✅ Visible | Agenda completa con detalle por hora |
| **Recepción** | ✅ Visible | Agenda completa con acciones de agendamiento |

**Implementación**: `dashboard/templates/partials/dashboard/agenda.html`
- Condicional: `{% if user.rol == 'administracion' %}`
- Admin: Solo muestra tabla resumida con conteos y próximas citas
- Vet: Tabla completa con todas las columnas y acciones clínicas
- Recepción: Tabla completa + botón "Nueva Cita" + opciones de edición

---

### ACCIONES RÁPIDAS

| Rol | Visibilidad | Acciones |
|-----|-------------|---------|
| **Administrador** | ❌ Oculto | No mostrar acciones rápidas |
| **Veterinario** | ✅ Visible | Mis Hospitalizaciones, Mis Pacientes, Ver Alertas |
| **Recepción** | ✅ Visible | Nueva Cita, Buscar Paciente, Abrir/Ir a Caja |

**Implementación**: `dashboard/templates/partials/dashboard/acciones.html`
- Condicional: `{% if user.rol == 'veterinario' %}`
- Vet: Acciones clínicas (hospitalizaciones, alertas)
- Recepción: Acciones operativas (agenda, búsqueda, caja)
- Admin: Bloque completamente oculto (se renderiza vacío)

---

### CAJA

| Rol | Visibilidad | Contenido |
|-----|-------------|----------|
| **Administrador** | ✅ Visible | Resumen de estado y totales vendidos |
| **Veterinario** | ❌ Oculto | No mostrar |
| **Recepción** | ✅ Visible | Estado + cobros pendientes + acciones operativas |

**Implementación**: `dashboard/templates/partials/dashboard/caja.html`
- Condicional: `{% if user.rol == 'administracion' %}`
- Admin: 2 filas de resumen (estado, total vendido, cobros pendientes, monto pendiente)
- Recepción: Vista detallada con lista de cobros pendientes + botones de acción
- Vet: Bloque completamente oculto

---

### HOSPITALIZACIONES

| Rol | Visibilidad | Contenido |
|-----|-------------|----------|
| **Administrador** | ✅ Visible | Listado general (máx. 10) con detalles básicos |
| **Veterinario** | ✅ Visible | Hospitalizaciones a su cargo con detalles clínicos completos |
| **Recepción** | ✅ Visible | Solo estado (paciente, días, propietario) sin acciones clínicas |

**Implementación**: `dashboard/templates/partials/dashboard/hospitalizaciones.html`
- Condicional: `{% if user.rol == 'administracion' %}`
- Admin: Cards colapsibles con información de ingreso y diagnóstico
- Vet: Cards colapsibles CON vitales (temperatura, pulso, respiración), alertas de actualización
- Recepción: Lista simple sin collapse (solo información de estado)

---

### PACIENTES

| Rol | Visibilidad | Contenido |
|-----|-------------|---------|
| **Administrador** | ✅ Visible | Estadísticas generales (total de pacientes activos) |
| **Veterinario** | ✅ Visible | Pacientes del día con estado de atención |
| **Recepción** | ✅ Visible | Pacientes recientes con últimas consultas |

**Implementación**: `dashboard/templates/partials/dashboard/pacientes.html`
- Condicional: `{% if user.rol == 'administracion' %}`
- Admin: Card simple con métrica de pacientes totales
- Vet: Lista de pacientes del día con badges de estado (Atendido/Pendiente)
- Recepción: Lista de pacientes recientes con última consulta

---

## 📊 Vista de Módulos por Dashboard

### 🧠 ADMINISTRADOR

```
┌─────────────────────────────────────────────────────┐
│ Dashboard Administrador                             │
├─────────────────────────────────────────────────────┤
│ Indicadores: Citas Hoy | Pendientes | Completadas │ Hospitalizados
├─────────────────────┬───────────────────────────────┤
│                     │                               │
│   Agenda (RESUMEN)  │  Hospitalizaciones (GENERAL) │
│   ✓ Conteos         │  ✓ Listado general           │
│   ✓ Próximas 5      │  ✓ Detalles básicos          │
│                     │                               │
│   Caja (ESTADO)     │                               │
│   ✓ Total vendido   │                               │
│   ✓ Resumen ingresos│                               │
│                     │                               │
│   ❌ Acciones       │  ❌ Pacientes                │
│   ❌ Clínica        │  ❌ Sin búsqueda              │
└─────────────────────┴───────────────────────────────┘
```

**Partials incluidos**: agenda, caja, hospitalizaciones  
**Partials excluidos**: acciones, pacientes

---

### 🧑‍⚕️ VETERINARIO

```
┌─────────────────────────────────────────────────────┐
│ Mi Dashboard                                        │
├─────────────────────────────────────────────────────┤
│ Indicadores: Citas Hoy | Pendientes | Completadas │ Hospitalizados
├─────────────────────┬───────────────────────────────┤
│                     │                               │
│ Cita Actual (si hay)│ Próxima Cita (si hay)        │
│                     │                               │
│ Acciones Clínicas   │ Mis Hospitalizaciones        │
│ ✓ Mis Hospitalizac. │ ✓ A su cargo (completo)      │
│ ✓ Mis Pacientes     │ ✓ Vitales y seguimiento      │
│ ✓ Alertas           │ ✓ Actualizar                 │
│                     │                               │
│ Mi Agenda (COMPLETA)│                               │
│ ✓ Todos los detalles│                               │
│ ✓ Acciones clínicas │                               │
│                     │                               │
│ Mis Pacientes Hoy   │                               │
│ ✓ Del día (listado) │                               │
│ ✓ Estado de atención│                               │
│                     │                               │
│ ❌ Caja             │                               │
│ ❌ Acciones recepción│                              │
└─────────────────────┴───────────────────────────────┘
```

**Partials incluidos**: acciones (clínicas), agenda (completa), hospitalizaciones (a cargo), pacientes (del día)  
**Partials excluidos**: caja

---

### 🧾 RECEPCIÓN

```
┌─────────────────────────────────────────────────────┐
│ Dashboard Recepción                                 │
├─────────────────────────────────────────────────────┤
│ Indicadores: Citas Hoy | Pendientes | Completadas │ Hospitalizados
├─────────────────────┬───────────────────────────────┤
│                     │                               │
│ Acciones Rápidas    │ Hospitalizaciones (ESTADO)    │
│ ✓ Nueva Cita        │ ✓ Solo información           │
│ ✓ Buscar Paciente   │ ✓ Sin detalles clínicos      │
│ ✓ Abrir/Ir a Caja   │ ✓ Sin actualizar             │
│                     │                               │
│ Agenda (COMPLETA)   │ Pacientes Recientes          │
│ ✓ Todos los detalles│ ✓ Últimas consultas         │
│ ✓ Editar citas      │ ✓ Buscar/enlazar ficha       │
│ ✓ Ver detalles      │                               │
│                     │                               │
│ Caja (OPERATIVA)    │                               │
│ ✓ Estado actual     │                               │
│ ✓ Cobros pendientes │                               │
│ ✓ Acciones de cobro │                               │
│ ✓ Venta Libre       │                               │
│                     │                               │
│ ❌ Clínica          │  ❌ Detalles de pacientes    │
│ ❌ Diagnósticos     │  ❌ Historiales detallados   │
└─────────────────────┴───────────────────────────────┘
```

**Partials incluidos**: acciones (operativas), agenda (completa), caja (operativa), hospitalizaciones (estado), pacientes (recientes)  
**Partials excluidos**: ninguno (pero cada uno está limitado por rol)

---

## 🔍 Detalles Técnicos de Implementación

### Variable de Contexto Disponible

```django
{{ user.rol }}  {# Valores posibles: 'administracion', 'veterinario', 'recepcion' #}
{{ user.is_superuser }}  {# True para administradores con permisos especiales #}
```

### Patrón de Condicional Estándar

```django
{% if user.rol == 'administracion' or user.is_superuser %}
    <!-- Contenido ADMIN -->
{% elif user.rol == 'veterinario' %}
    <!-- Contenido VETERINARIO -->
{% elif user.rol == 'recepcion' %}
    <!-- Contenido RECEPCIÓN -->
{% endif %}
```

### No Duplicar Código

❌ **MAL**: Crear 3 versiones diferentes del mismo partial
```django
{# agenda-admin.html #}
{# agenda-vet.html #}
{# agenda-recepcion.html #}
```

✅ **BIEN**: Un solo partial con condicionales internas
```django
<!-- agenda.html -->
{% if user.rol == 'administracion' %}
    <!-- Vista admin -->
{% elif user.rol == 'veterinario' %}
    <!-- Vista vet -->
{% endif %}
```

### Incluir en Dashboards Principales

```django
{# dashboard/templates/dashboard/admin.html #}
{% include 'partials/dashboard/agenda.html' %}
{% include 'partials/dashboard/caja.html' %}
{% include 'partials/dashboard/hospitalizaciones.html' %}
{# acciones.html se oculta automáticamente #}
```

---

## ✅ Checklist de Validación

- [x] Agenda: 3 versiones distintas según rol
- [x] Acciones: Admin oculto, Vet clínico, Recepción operativo
- [x] Caja: Admin resumen, Vet oculto, Recepción detallado
- [x] Hospitalizaciones: Admin general, Vet completo, Recepción básico
- [x] Pacientes: Admin métricas, Vet del día, Recepción recientes
- [x] Veterinario mantiene visual intacto (Cita Actual + Próxima)
- [x] Sin duplicación de bloques HTML
- [x] Sin modificación de vistas (solo templates)
- [x] Sin uso de CSS para permisos (no display:none)
- [x] Todos los dashboards incluyen los partials correctos

---

## 🧪 Cómo Probar

### Usando Query Parameter de Testing

La vista de dashboard soporta override de rol para testing:

```
http://localhost:8000/dashboard/?as=admin
http://localhost:8000/dashboard/?as=veterinario
http://localhost:8000/dashboard/?as=recepcion
```

Valores aceptados: `admin`, `administracion`, `vet`, `veterinario`, `recepcion`

### Verificar Visibilidad

1. **Admin**: Debe ver resumen de agenda, caja, hospitalizaciones
2. **Veterinario**: Debe ver agenda completa, acciones clínicas, hospitalizaciones a cargo
3. **Recepción**: Debe ver agenda completa, acciones rápidas, caja operativa, pacientes recientes

### No Debe Verse

- Admin: Acciones rápidas, detalles clínicos
- Veterinario: Caja, acciones de recepción
- Recepción: Datos clínicos de hospitalizaciones, diagnósticos, alertas del vet

---

## 📝 Notas Importantes

1. **User.rol es crucial**: Asegúrate de que todos los usuarios tiene `rol` definido en su modelo
2. **Fallback a is_superuser**: Los superusers verán contenido de admin
3. **El usuario actual está disponible**: Django proporciona `user` automáticamente en contexto
4. **Los partials NO cargan contexto especial**: Usan lo que pasa desde las vistas (mis_citas, caja_stats, etc.)
5. **No se valida en JavaScript**: La visibilidad es server-side (segura)

---

## 📂 Estructura de Directorios

```
dashboard/templates/
├── dashboard/
│   ├── admin.html              (modificado)
│   ├── veterinario.html        (modificado)
│   └── recepcion.html          (modificado)
└── partials/
    └── dashboard/
        ├── agenda.html         (modificado con condicionales)
        ├── acciones.html       (modificado con condicionales)
        ├── caja.html           (modificado con condicionales)
        ├── hospitalizaciones.html  (modificado con condicionales)
        └── pacientes.html      (modificado con condicionales)
```

---

## 🚀 Próximos Pasos Opcionales

- Agregar control de estadísticas por rol (métricas personalizadas)
- Implementar datos específicos en las vistas para cada rol
- Agregar más granularidad en permisos (por veterinario, por sucursal, etc.)
- Dashboard dinámico que permita agregar/remover módulos por rol

---

**Última Actualización**: Diciembre 14, 2025  
**Estado**: ✅ Implementación Completada
