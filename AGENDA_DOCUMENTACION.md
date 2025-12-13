# MÓDULO DE AGENDA - VETERINARIA SANTA SOFÍA

## 📋 Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────┐
│                   MÓDULO DE AGENDA                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │   Modelos        │◄───┤   Vistas API     │          │
│  │                  │    │                  │          │
│  │  • Cita          │    │  • crear_cita    │          │
│  │  • Disponibilidad│    │  • editar_cita   │          │
│  │                  │    │  • disponibilidad│          │
│  └────────┬─────────┘    └────────┬─────────┘          │
│           │                       │                     │
│           │                       │                     │
│  ┌────────▼──────────────────────▼─────────┐           │
│  │        Templates & JavaScript            │           │
│  │                                          │           │
│  │  • agenda.html (Django Template)         │           │
│  │  • agenda-sistema.js (Vanilla JS)        │           │
│  │  • agenda-sistema.css                    │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ Modelos de Datos

### 1. DisponibilidadVeterinario

**Propósito**: Gestionar bloques horarios de disponibilidad, vacaciones, licencias y ausencias de veterinarios.

**Campos**:
- `veterinario` (FK → CustomUser): Veterinario al que pertenece la disponibilidad
- `fecha` (DateField): Fecha específica
- `hora_inicio` (TimeField): Hora de inicio del bloque
- `hora_fin` (TimeField): Hora de fin del bloque
- `tipo` (CharField): disponible, vacaciones, licencia, ausencia
- `notas` (TextField): Información adicional
- `fecha_creacion`, `fecha_modificacion`: Auditoría

**Validaciones**:
- ✅ La hora de inicio debe ser menor que la hora de fin
- ✅ No puede haber solapamiento de bloques para el mismo veterinario en el mismo día
- ✅ Solo veterinarios pueden tener disponibilidad (limit_choices_to)

**Reglas de Negocio**:
- Un veterinario puede tener múltiples bloques en un día (ej: mañana y tarde)
- Dos veterinarios pueden tener la misma disponibilidad
- No es recurrente (se define día por día)
- Un administrador puede editar cualquier disponibilidad
- Un veterinario solo puede editar su propia disponibilidad

---

### 2. Cita (Actualizado)

**Propósito**: Representar una cita agendada entre un paciente y un veterinario.

**Campos Nuevos/Modificados**:
- `servicio` (FK → Servicio): Servicio asociado a la cita
- `veterinario` (FK → CustomUser): Ahora limitado a rol='veterinario'

**Campos Existentes Mantenidos**:
- `paciente`, `fecha`, `hora_inicio`, `hora_fin`
- `tipo`, `estado`, `motivo`, `notas`
- `recordatorio_enviado`

**Validaciones Agregadas**:
- ✅ La cita debe estar dentro de un bloque de disponibilidad del veterinario
- ✅ No puede haber solapamiento con otras citas del mismo veterinario
- ✅ Si se proporciona un servicio, la hora_fin se calcula automáticamente según la duración
- ✅ La hora de inicio debe ser menor que la hora de fin

**Propiedades**:
- `duracion_minutos`: Calcula la duración en minutos

---

## 🔄 Flujo de Datos

### Flujo 1: Configuración de Disponibilidad

```
1. Veterinario/Admin abre la agenda
2. Selecciona un día en el calendario
3. Click en "Disponibilidad"
4. Modal se abre con formulario
5. Completa: fecha, hora inicio, hora fin, tipo
6. POST → /agenda/disponibilidad/crear/
7. Backend valida (no solapamiento)
8. Se guarda en BD
9. Timeline se actualiza en tiempo real
```

**Permisos**:
- Veterinario: Puede crear/editar/eliminar su propia disponibilidad
- Administrador: Puede gestionar la disponibilidad de cualquier veterinario
- Recepcionista: Solo lectura

---

### Flujo 2: Agendamiento de Cita

```
1. Usuario selecciona día en calendario
2. Sistema carga disponibilidades de todos los veterinarios
3. Timeline muestra bloques disponibles/ocupados
4. Click en "Nueva Cita"
5. Modal se abre
6. Selecciona: paciente, veterinario, servicio
7. Sistema calcula hora_fin automáticamente según duración del servicio
8. POST → /agenda/citas/crear/
9. Backend valida:
   - ¿Veterinario disponible en ese horario?
   - ¿No hay solapamiento con otras citas?
10. Se guarda en BD
11. Timeline se actualiza
12. Bloque se marca como ocupado
```

**Validaciones en Backend**:
```python
# En Cita.clean()
1. Verificar que hora_inicio < hora_fin
2. Buscar disponibilidades del veterinario para esa fecha
3. Verificar que la cita esté dentro de algún bloque disponible
4. Verificar que no haya solapamiento con otras citas activas
```

---

### Flujo 3: Edición desde Timeline

```
1. Usuario hace click en una cita en el timeline
2. Modal se abre pre-cargado con datos de la cita
3. Usuario modifica (fecha, hora, estado, notas)
4. POST → /agenda/citas/editar/{id}/
5. Backend re-valida disponibilidad
6. Se actualiza en BD
7. Timeline se refresca
```

---

### Flujo 4: Sincronización con Servicios

```
1. En modal de cita, usuario selecciona servicio
2. JavaScript lee `data-duracion` del option seleccionado
3. Calcula hora_fin = hora_inicio + duracion (en minutos)
4. Muestra en UI: "Duración: 60 min (finaliza a las 10:30)"
5. Al guardar, backend:
   - Si hay servicio y no hay hora_fin, calcula automáticamente
   - Valida que el bloque completo esté disponible
```

**Ejemplo**:
```javascript
// agenda-sistema.js
function calcularHoraFin() {
    const duracion = servicioSelect.options[selectedIndex].dataset.duracion;
    const horaInicio = horaInicioInput.value; // "09:00"
    
    // Suma duración
    const fecha = new Date();
    fecha.setHours(horas, minutos + parseInt(duracion), 0);
    const horaFin = fecha.toTimeString().substring(0, 5); // "10:00"
    
    horaFinInput.value = horaFin;
}
```

---

## 🔌 API Endpoints

### Disponibilidad

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/agenda/disponibilidad/mes/{year}/{month}/` | Disponibilidades del mes |
| GET | `/agenda/disponibilidad/dia/{year}/{month}/{day}/` | Disponibilidades del día |
| POST | `/agenda/disponibilidad/crear/` | Crear nueva disponibilidad |
| POST | `/agenda/disponibilidad/editar/{id}/` | Editar disponibilidad |
| POST | `/agenda/disponibilidad/eliminar/{id}/` | Eliminar disponibilidad |

### Citas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/agenda/citas/{year}/{month}/{day}/` | Citas del día |
| POST | `/agenda/citas/crear/` | Crear nueva cita |
| POST | `/agenda/citas/editar/{id}/` | Editar cita |
| POST | `/agenda/citas/eliminar/{id}/` | Eliminar cita |

### Utilidades

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/agenda/slots/{vet_id}/{year}/{month}/{day}/` | Slots disponibles de 15 min |

---

## 🎨 Frontend

### Estructura de Archivos

```
agenda/
├── templates/
│   └── agenda/
│       ├── agenda.html          ← Template principal
│       └── agenda_old.html      ← Respaldo
├── static/
│   └── agenda/
│       ├── css/
│       │   ├── agenda.css       ← Antigua (plantilla prototipo)
│       │   └── agenda-sistema.css ← Nueva (integrada)
│       └── js/
│           ├── agenda.js        ← Antiguo (plantilla prototipo)
│           └── agenda-sistema.js ← Nuevo (integrado)
```

### Características del Frontend

✅ **Sin librerías externas** - JavaScript puro (Vanilla JS)
✅ **Hereda de base.html** - Mantiene navegación y estilos del sistema
✅ **Responsive** - Adaptable a móviles
✅ **Interactivo** - Calendario mensual clickeable
✅ **Modales** - Usando Bootstrap modals del sistema
✅ **Timeline visual** - Vista detallada por veterinario

---

## 🔐 Permisos y Roles

### Veterinario
- ✅ Ver agenda completa
- ✅ Gestionar su propia disponibilidad
- ✅ Crear/editar citas
- ❌ No puede ver disponibilidad de otros (solo en agenda general)

### Recepcionista
- ✅ Ver agenda completa
- ✅ Crear/editar citas
- ❌ No puede gestionar disponibilidad

### Administrador
- ✅ Acceso total
- ✅ Gestionar disponibilidad de cualquier veterinario
- ✅ Ver/editar todas las citas

---

## 🚀 Implementación Progresiva

### Fase 1: ✅ COMPLETADA
- [x] Modelos creados
- [x] Migraciones aplicadas
- [x] Vistas API implementadas
- [x] Template integrado
- [x] JavaScript funcional
- [x] CSS adaptado

### Fase 2: Pendiente (Opcional)
- [ ] Integración con ficha del paciente
- [ ] Modal de agenda desde ficha (pre-selecciona paciente)
- [ ] Notificaciones por email/SMS
- [ ] Recordatorios automáticos
- [ ] Exportar agenda a PDF
- [ ] Vista semanal alternativa

---

## 📝 Uso del Sistema

### Para Veterinarios

1. **Configurar Disponibilidad**:
   ```
   Agenda → Seleccionar día → Disponibilidad
   Tipo: Disponible
   Horario: 09:00 - 13:00
   ```

2. **Marcar Vacaciones**:
   ```
   Agenda → Seleccionar día → Disponibilidad
   Tipo: Vacaciones
   Fecha: 24/12/2025
   ```

3. **Ver Agenda del Día**:
   ```
   Agenda → Click en día → Timeline muestra bloques
   Verde: Disponible
   Azul: Cita confirmada
   Gris: Completada
   ```

### Para Recepcionistas

1. **Agendar Cita**:
   ```
   Agenda → Día → Nueva Cita
   Paciente: Luna (Golden Retriever)
   Veterinario: Dr. Carlos Ramírez
   Servicio: Consulta General (60 min)
   Hora: 10:00 (auto-calcula fin: 11:00)
   ```

2. **Editar Cita**:
   ```
   Agenda → Click en cita → Editar
   Estado: Completada
   Notas: "Paciente presentó mejoría"
   ```

---

## 🐛 Solución de Problemas

### Error: "Veterinario no disponible"
**Causa**: No hay bloque de disponibilidad configurado  
**Solución**: Configurar disponibilidad para ese día

### Error: "Solapamiento de citas"
**Causa**: Ya existe una cita en ese horario  
**Solución**: Elegir otro horario o veterinario

### Timeline no se actualiza
**Causa**: Error en JavaScript o conexión  
**Solución**: Revisar consola del navegador (F12)

---

## 🔧 Mantenimiento

### Agregar Nuevo Tipo de Disponibilidad

```python
# agenda/models.py
TIPO_CHOICES = [
    ('disponible', 'Disponible'),
    ('vacaciones', 'Vacaciones'),
    ('licencia', 'Licencia'),
    ('ausencia', 'Ausencia'),
    ('capacitacion', 'Capacitación'),  ← NUEVO
]
```

### Agregar Nuevo Estado de Cita

```python
# agenda/models.py
ESTADO_CHOICES = [
    # ... existentes ...
    ('reprogramada', 'Reprogramada'),  ← NUEVO
]
```

### Cambiar Duración de Slots

```javascript
// agenda-sistema.js
// Línea ~280
for (let hora = inicio; hora <= fin; hora++) {
    // Cambiar de 30 a 15 minutos:
    // Modificar lógica de generación de slots
}
```

---

## 📚 Referencias

- **Django Docs**: https://docs.djangoproject.com/
- **Bootstrap 5**: https://getbootstrap.com/docs/5.3/
- **Font Awesome**: https://fontawesome.com/icons

---

## ✅ Checklist de Implementación

- [x] Modelo DisponibilidadVeterinario creado
- [x] Modelo Cita actualizado con servicio
- [x] Validaciones de negocio implementadas
- [x] Vistas API para disponibilidad
- [x] Vistas API para citas
- [x] Template integrado con base.html
- [x] JavaScript sin librerías externas
- [x] CSS coherente con el sistema
- [x] Migraciones generadas y aplicadas
- [x] Admin registrado
- [x] URLs configuradas
- [ ] Tests unitarios (opcional)
- [ ] Documentación de usuario (opcional)

---

## 🎯 Conclusión

El módulo de agenda está completamente integrado al sistema existente, respetando:

✅ **No rompe funcionalidades** - Modelos extendidos, no reescritos  
✅ **No cambia nombres** - Variables y campos existentes mantenidos  
✅ **Coherente con Django** - Patrón MVT respetado  
✅ **Sin librerías externas** - JavaScript puro  
✅ **Estilo visual coherente** - Hereda de base.html  
✅ **Modales para interacción** - No vistas nuevas  

El sistema está listo para uso inmediato y puede extenderse progresivamente según necesidades futuras.
