# ✅ CHECKLIST DE VERIFICACIÓN - MÓDULO DE AGENDA

## Pre-requisitos del Sistema

Antes de usar el módulo de agenda, verifica que existan:

### 1. Usuarios con Rol Veterinario
```bash
# Verificar en Django Admin o Shell
python manage.py shell
>>> from cuentas.models import CustomUser
>>> CustomUser.objects.filter(rol='veterinario').count()
# Debe ser > 0
```

- [ ] Existe al menos 1 usuario con `rol='veterinario'`
- [ ] Los veterinarios tienen `is_active=True`

**Si no existen**: Crear usuarios con rol "veterinario" desde el admin de Django o panel de usuarios.

---

### 2. Pacientes Activos
```bash
>>> from pacientes.models import Paciente
>>> Paciente.objects.filter(activo=True).count()
# Debe ser > 0
```

- [ ] Existen pacientes registrados
- [ ] Pacientes tienen `activo=True`

**Si no existen**: Registrar pacientes desde el módulo de pacientes.

---

### 3. Servicios Configurados
```bash
>>> from servicios.models import Servicio
>>> Servicio.objects.count()
# Debe ser > 0
```

- [ ] Existen servicios registrados
- [ ] Servicios tienen `duracion` configurada (en minutos)

**Si no existen**: Crear servicios desde el admin o módulo de servicios.

---

## Instalación del Módulo

### 1. Migraciones Aplicadas
```bash
python manage.py showmigrations agenda
```

- [ ] `[X] 0004_disponibilidadveterinario_cita_servicio_and_more` aplicada

**Si falta**: Ejecutar `python manage.py migrate`

---

### 2. Archivos Estáticos
- [ ] Existe: `agenda/static/agenda/css/agenda-sistema.css`
- [ ] Existe: `agenda/static/agenda/js/agenda-sistema.js`
- [ ] Template: `agenda/templates/agenda/agenda.html`

**Si faltan**: Revisar que los archivos se hayan creado correctamente.

---

### 3. URLs Configuradas
```python
# En veteriaria/urls.py debe existir:
path('agenda/', include('agenda.urls')),
```

- [ ] URL de agenda configurada en `urls.py` principal

**Verificar**: Acceder a `http://localhost:8000/agenda/` no debe dar 404.

---

## Verificación de Funcionalidades

### Test 1: Acceso a la Agenda
```
1. Iniciar servidor: python manage.py runserver
2. Login en el sistema
3. Ir a: http://localhost:8000/agenda/
```

- [ ] La página carga sin errores
- [ ] Se ve el calendario mensual
- [ ] Aparecen selectores de mes/año
- [ ] Botón "Hoy" funciona

**Si falla**: Revisar consola del navegador (F12) para errores JS.

---

### Test 2: Seleccionar Día
```
1. Click en un día del calendario
```

- [ ] El día se marca como seleccionado (borde azul)
- [ ] Aparece sección "Detalles del día"
- [ ] Se muestran tabs de veterinarios

**Si falla**: Verificar que existan veterinarios activos.

---

### Test 3: Configurar Disponibilidad
```
1. Seleccionar día
2. Click en "Disponibilidad"
3. Completar formulario
4. Guardar
```

- [ ] Modal se abre
- [ ] Formulario tiene todos los campos
- [ ] Selector de veterinario funciona
- [ ] Al guardar, muestra mensaje de éxito
- [ ] Timeline se actualiza

**Si falla**:
- Verificar permisos del usuario
- Revisar consola del navegador
- Verificar endpoint: `/agenda/disponibilidad/crear/`

---

### Test 4: Crear Cita
```
1. Seleccionar día con disponibilidad configurada
2. Click en "Nueva Cita"
3. Completar formulario
4. Guardar
```

- [ ] Modal se abre
- [ ] Selectores tienen opciones (pacientes, veterinarios, servicios)
- [ ] Al seleccionar servicio, calcula hora_fin automáticamente
- [ ] Al guardar, muestra mensaje de éxito
- [ ] Cita aparece en timeline

**Si falla**:
- Verificar que hay disponibilidad configurada
- Verificar endpoint: `/agenda/citas/crear/`
- Revisar validaciones en consola

---

### Test 5: Editar Cita
```
1. Click en una cita existente en el timeline
2. Modificar datos
3. Guardar
```

- [ ] Modal se abre pre-cargado con datos
- [ ] Los cambios se guardan
- [ ] Timeline se actualiza

---

### Test 6: Validaciones
```
Intentar agendar cita fuera de disponibilidad:
1. Seleccionar día SIN disponibilidad
2. Intentar crear cita
```

- [ ] Sistema muestra error: "Veterinario no disponible"

```
Intentar solapamiento de citas:
1. Crear cita en horario X
2. Intentar crear otra cita en mismo horario
```

- [ ] Sistema muestra error: "Ya existe una cita en ese horario"

---

## Verificación de Datos en Base de Datos

### Disponibilidades Creadas
```bash
python manage.py shell
>>> from agenda.models import DisponibilidadVeterinario
>>> DisponibilidadVeterinario.objects.count()
```

- [ ] Hay registros de disponibilidad

---

### Citas Creadas
```bash
>>> from agenda.models import Cita
>>> Cita.objects.count()
```

- [ ] Hay registros de citas

---

### Relaciones Correctas
```bash
>>> cita = Cita.objects.first()
>>> cita.paciente  # Debe retornar Paciente
>>> cita.veterinario  # Debe retornar CustomUser
>>> cita.servicio  # Debe retornar Servicio o None
```

- [ ] Las relaciones FK funcionan correctamente

---

## Verificación de Permisos

### Como Veterinario
```
1. Login como veterinario
2. Ir a agenda
3. Intentar crear disponibilidad
```

- [ ] Puede crear su propia disponibilidad
- [ ] Solo ve su nombre en selector de veterinario (al crear)

---

### Como Recepcionista
```
1. Login como recepcionista
2. Ir a agenda
3. Intentar crear cita
```

- [ ] Puede crear citas
- [ ] NO puede crear disponibilidad (botón no visible o error 403)

---

### Como Administrador
```
1. Login como admin
2. Ir a agenda
3. Crear disponibilidad
```

- [ ] Puede crear disponibilidad para CUALQUIER veterinario
- [ ] Ve todos los veterinarios en selector

---

## Verificación de Admin

```
Ir a: http://localhost:8000/admin/
```

- [ ] Modelo "DisponibilidadVeterinario" aparece en admin
- [ ] Modelo "Cita" aparece con nuevo campo "servicio"
- [ ] Se pueden crear/editar registros desde admin

---

## Verificación de Estilos

### Desktop
```
Abrir en navegador de escritorio
```

- [ ] Calendario se ve bien estructurado
- [ ] Colores coherentes (#0096d6)
- [ ] Modales centrados
- [ ] Timeline legible

---

### Móvil
```
Abrir en móvil o usar DevTools > Toggle device toolbar
```

- [ ] Calendario responsive
- [ ] Modales full-screen en móvil
- [ ] Timeline vertical funcional

---

## Verificación de JavaScript

### Consola del Navegador (F12)
```
Al cargar /agenda/
```

- [ ] No hay errores en consola
- [ ] Mensaje: "Iniciando agenda veterinaria..."

---

### Funciones Globales
```javascript
// En consola del navegador:
typeof abrirModalCita
typeof abrirModalDisponibilidad
```

- [ ] Retorna "function" (no "undefined")

---

## Verificación de APIs

### Test Manual de Endpoints

#### 1. Disponibilidad del mes
```bash
curl http://localhost:8000/agenda/disponibilidad/mes/2025/1/
```
- [ ] Retorna JSON con disponibilidades

#### 2. Citas del día
```bash
curl http://localhost:8000/agenda/citas/2025/1/15/
```
- [ ] Retorna JSON con citas

#### 3. Crear disponibilidad (requiere auth)
```bash
# Con token CSRF y session cookie
```
- [ ] POST funciona y retorna success

---

## Comandos Útiles

### Inicializar Datos de Ejemplo
```bash
python manage.py inicializar_agenda
```

- [ ] Comando se ejecuta sin errores
- [ ] Crea disponibilidad para próximos 7 días
- [ ] Crea citas de ejemplo

---

### Limpiar Datos de Prueba
```bash
python manage.py shell
>>> from agenda.models import DisponibilidadVeterinario, Cita
>>> DisponibilidadVeterinario.objects.all().delete()
>>> Cita.objects.filter(estado='pendiente').delete()
```

---

## Solución de Problemas Comunes

### ❌ Error: "No module named 'agenda.models'"
**Solución**: Verificar que `agenda` esté en `INSTALLED_APPS`

### ❌ Template no carga estilos
**Solución**: 
```bash
python manage.py collectstatic
```

### ❌ JavaScript no funciona
**Solución**:
1. Abrir DevTools (F12)
2. Revisar errores en Console
3. Verificar que `agenda-sistema.js` cargue en Network

### ❌ "CSRF token missing"
**Solución**: Verificar que el template tenga `{% csrf_token %}` en formularios

### ❌ "No such table: agenda_disponibilidadveterinario"
**Solución**:
```bash
python manage.py migrate agenda
```

---

## Checklist de Producción

Antes de pasar a producción:

- [ ] Todas las migraciones aplicadas
- [ ] Archivos estáticos recolectados (`collectstatic`)
- [ ] Datos de ejemplo eliminados
- [ ] Permisos configurados correctamente
- [ ] URLs sin `/admin/` expuestas públicamente
- [ ] DEBUG = False en producción
- [ ] ALLOWED_HOSTS configurado
- [ ] Base de datos de producción configurada
- [ ] Backup de base de datos antes de desplegar

---

## Métricas de Éxito

El módulo está funcionando correctamente si:

✅ Veterinarios pueden configurar su disponibilidad  
✅ Recepcionistas pueden agendar citas  
✅ Sistema valida y previene solapamientos  
✅ Timeline muestra citas en tiempo real  
✅ Modales abren y guardan datos  
✅ No hay errores 404/500 en uso normal  
✅ Interfaz responsive funciona en móviles  

---

## Documentación de Referencia

📚 **AGENDA_DOCUMENTACION.md** - Documentación técnica completa  
📖 **AGENDA_README.md** - Guía de inicio rápido  
💡 **AGENDA_EJEMPLOS.md** - Casos de uso prácticos  
📊 **AGENDA_RESUMEN.md** - Resumen ejecutivo  

---

**✅ Si todos los checks están completos, el módulo está listo para usar.**
