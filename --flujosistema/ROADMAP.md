# Hoja de Ruta - Dashboard Modular

## 📋 Guía para Futuros Cambios

Después de la refactorización de dashboards en partials modulares, cualquier cambio debe seguir este proceso:

---

## 🎯 ESCENARIOS COMUNES

### Escenario 1: "Necesito agregar un campo a la Agenda"

**Opción A: El campo es para todos los roles**
1. Editar: `dashboard/templates/partials/dashboard/agenda.html`
2. Agregar columna en tabla/horaria
3. Actualizar context en `dashboard/views.py` si necesita nueva variable
4. Test: Verificar que se muestra en admin.html, veterinario.html, recepcion.html

**Opción B: El campo es solo para un rol**
1. Editar: `dashboard/templates/partials/dashboard/agenda.html`
2. Agregar condicional:
   ```django
   {% if role == 'admin' %}
       <td>{{ nuevo_campo }}</td>
   {% endif %}
   ```
3. Agregar variable a context solo en vista correspondiente

---

### Escenario 2: "Necesito cambiar estilos del componente X"

**Pasos**:
1. Editar: `static/css/custom/dashboard_vet.css`
2. ✅ USAR clases existentes (vet-card, vet-btn, etc)
3. ❌ NO CREAR nuevas clases (Mantener reutilización)
4. Test: Verificar en todos los dashboards que usan el componente

**Ejemplo CORRECTO**:
```css
.vet-card {
    /* Editar estilos existentes */
}

.vd-hosp-card {
    /* Editar estilos existentes */
}
```

**Ejemplo INCORRECTO**:
```css
.card-admin-especial {  /* ❌ Nueva clase */
    ...
}
```

---

### Escenario 3: "Necesito agregar un nuevo partial para X componente"

**Pasos**:
1. Crear: `dashboard/templates/partials/dashboard/mi_componente.html`
2. Usar patrón role-aware:
   ```django
   {% if role == 'admin' %}
       <!-- Vista admin -->
   {% elif role == 'recepcion' %}
       <!-- Vista recepción -->
   {% else %}
       <!-- Vista default (veterinario) -->
   {% endif %}
   ```
3. Incluir en dashboards:
   ```django
   {% include 'partials/dashboard/mi_componente.html' with role='admin' %}
   ```
4. Actualizar `PARTIALS_GUIDE.md`
5. Test en los 3 dashboards

---

### Escenario 4: "Necesito agregar un nuevo rol (por ej: asistente)"

**Pasos**:
1. En cada partial que use el nuevo rol:
   ```django
   {% elif role == 'asistente' %}
       <!-- Vista para asistente -->
   {% endif %}
   ```
2. Crear nuevo dashboard (ó reutilizar existente):
   ```django
   {% include 'partials/dashboard/agenda.html' with role='asistente' %}
   ```
3. Agregar nueva vista en `dashboard/views.py`:
   ```python
   def asistente_dashboard(request):
       context = {...}
       return render(request, 'dashboard/asistente.html', context)
   ```
4. Agregar URL en `dashboard/urls.py`
5. Test en nuevo dashboard

---

### Escenario 5: "Un partial está muy complejo, quiero dividirlo"

**Opción A: Sub-partials**
```
dashboard/templates/partials/dashboard/
├── agenda.html (main)
├── _agenda_admin.html (sub)
├── _agenda_vet.html (sub)
└── _agenda_recepcion.html (sub)
```

Usar includes dentro de agenda.html:
```django
{% if role == 'admin' %}
    {% include 'partials/dashboard/_agenda_admin.html' %}
{% endif %}
```

**Opción B: Mantener como está**
- Si es legible, mantenerlo así
- Los conditionals son claros
- Mejor para debugging

---

## 📝 CHECKLIST PARA CUALQUIER CAMBIO

Before making ANY change to dashboards:

- [ ] ¿El cambio afecta 1 partial o 3+ archivos?
  - Si 1 partial → edita el partial
  - Si 3+ archivos → probablemente duplicación, refactoriza a partial

- [ ] ¿Necesito crear nueva clase CSS?
  - Si sí → Revisa si ya existe en dashboard_vet.css
  - Si no existe → Pregunta: ¿puedo reutilizar clase existente?

- [ ] ¿El cambio es específico de un rol?
  - Si sí → Usa condicional `{% if role == '...' %}`
  - Si no → Aplica a todos en el partial

- [ ] ¿He actualizado documentación?
  - Sí → Actualiza PARTIALS_GUIDE.md si cambió variables de contexto
  - Sí → Actualiza este documento si es nuevo patrón

- [ ] ¿He testeado en los 3 dashboards?
  - Sí → Admin, Veterinario, Recepción ✅
  - Sí → Visual appearance intacta

---

## 🔍 AUDITORÍA DE CAMBIOS

Antes de mergear a main:

```bash
# 1. Verificar que no hay nuevas clases CSS
grep "^\\." dashboard/templates/partials/dashboard/*.html
# Resultado esperado: Solo clases existentes

# 2. Verificar que todos los partials se usan
grep -r "{% include 'partials/dashboard/" dashboard/templates/dashboard/
# Resultado esperado: Cada partial se incluye al menos una vez

# 3. Verificar que no hay duplicación en dashboards
wc -l dashboard/templates/dashboard/*.html
# Resultado esperado: admin.html <150, veterinario.html <120, recepcion.html <30

# 4. Verificar context variables en views
grep "context\[" dashboard/views.py
# Resultado esperado: Todas las variables están disponibles
```

---

## 🚨 ERRORES COMUNES

| Error | Causa | Solución |
|-------|-------|----------|
| Partial no se renderiza | Falta variable en context | Agregar a `context = {...}` en views.py |
| Estilos no se aplican | Clase CSS no existe | Verificar en dashboard_vet.css |
| Condicional no funciona | Typo en rol | Verificar: `role == 'admin'` (sin espacios) |
| Duplicación aparece | Código en 2+ dashboards | Mover a partial, reemplazar con include |
| Performance lento | Demasiados includes anidados | Máximo 2 niveles: partial → sub-partial |

---

## 📊 MÉTRICAS A MANTENER

Después de cada cambio, verifica:

| Métrica | Antes | Después | Aceptable |
|---------|-------|---------|-----------|
| Líneas total dashboards | 265 | ? | < 400 |
| Partials | 5 | ? | < 10 |
| Clases CSS nuevas | 0 | ? | = 0 |
| Duplicación HTML | 0% | ? | < 5% |

---

## 🧪 PLAN DE TEST PARA CAMBIOS

### Test Visual
```
1. Admin Dashboard
   - [ ] Componente visible y correctamente posicionado
   - [ ] Estilos aplicados correctamente
   - [ ] Datos mostrados correctamente
   - [ ] Acciones funcionales (botones, links)

2. Veterinario Dashboard
   - [ ] Componente visible y correctamente posicionado
   - [ ] Estilos aplicados correctamente
   - [ ] Datos mostrados correctamente
   - [ ] Manage-wheel funciona (si aplica)

3. Recepción Dashboard
   - [ ] Componente visible y correctamente posicionado
   - [ ] Estilos aplicados correctamente
   - [ ] Datos mostrados correctamente
   - [ ] Acciones funcionales
```

### Test Funcional
```
1. Context variables
   - [ ] Todas las variables de contexto disponibles
   - [ ] No hay errores de template
   - [ ] Condicionales funcionan correctamente

2. CSS & Layout
   - [ ] Responsive en mobile (<768px)
   - [ ] Responsive en tablet (768px-1024px)
   - [ ] Responsive en desktop (>1024px)

3. Performance
   - [ ] Tiempo de carga igual o mejor
   - [ ] No hay memory leaks en JS
   - [ ] No hay errores de consola
```

---

## 📞 COMUNICACIÓN DE CAMBIOS

Después de hacer un cambio importante:

```markdown
## Cambio: [Título del cambio]

### Qué cambió:
- Edité partial X
- Agregué condicional para rol Y
- Actualicé documentación

### Por qué:
[Explicación breve]

### Impacto:
- Admin dashboard: [impacto]
- Veterinario dashboard: [impacto]
- Recepción dashboard: [impacto]

### Testing:
- [x] Visual en los 3 dashboards
- [x] Funcional (context, JS, etc)
- [x] Performance no cambió
- [x] Documentación actualizada
```

---

## 📚 DOCUMENTACIÓN A MANTENER ACTUALIZADA

Después de CADA cambio:

- [ ] `PARTIALS_GUIDE.md` - Si cambió estructura o variables
- [ ] `REFACTORING_VALIDATION.md` - Si cambió validaciones
- [ ] Docstrings en partial - Si cambió comportamiento
- [ ] README - Si hay cambios que afecten deployment

---

## 🎓 RECUERDA

1. **One source of truth**: Cada componente vive en UN lugar
2. **Role-aware, CSS-agnostic**: Usa conditionals, no nuevas clases
3. **Keep it simple**: Si es muy complejo, refactoriza
4. **Document as you go**: Cambios sin documentación = deuda técnica
5. **Test early**: Test en desarrollo, no en producción

---

**Version**: 1.0  
**Last Updated**: 2024  
**Responsible**: Development Team  
