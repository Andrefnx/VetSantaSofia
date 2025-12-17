# Guía de Validación Centralizada de Insumos

## 📋 Resumen

Se ha implementado un módulo centralizado de validación (`ValidadorInsumos`) para prevenir dobles descuentos de inventario y errores de usuario en las operaciones médicas.

## 🎯 Objetivo

Evitar que:
- Los insumos se descuenten múltiples veces del inventario
- Usuarios hagan múltiples clicks en botones submit
- Se procesen formularios ya enviados
- Se pierda el estado real de las operaciones

## 📦 Componentes

### 1. Módulo Validador
**Ubicación:** `static/js/utils/validator_insumos.js`

**Funcionalidades principales:**
- ✅ Validación de estado `insumos_descontados`
- ✅ Bloqueo de botones durante procesamiento
- ✅ Protección contra múltiples envíos de formularios
- ✅ Alertas visuales consistentes
- ✅ Control de estado de UI

### 2. Integración en Consultas
**Archivo:** `static/js/pacientes/historial_medico.js`

**Flujo:**
1. Usuario completa formulario de consulta
2. Presiona submit → Validador verifica que no se haya enviado antes
3. Botón se bloquea con spinner
4. Request enviado al backend
5. Al recibir respuesta:
   - ✅ Éxito: Botón muestra "Completado" por 2 segundos
   - ❌ Error: Botón se restaura, formulario se resetea

### 3. Integración en Hospitalizaciones/Cirugías
**Archivo:** `static/js/pacientes/hospitalizaciones.js`

**Operaciones protegidas:**
- `guardarCirugia()` - Registro de cirugías
- `guardarAlta()` - Alta médica de hospitalizaciones

**Mismo flujo que consultas**

## 🔧 API del Validador

### Funciones Principales

#### `validarAccion(options)`
Verifica si una acción puede ejecutarse.

```javascript
const validacion = ValidadorInsumos.validarAccion({
    data: consultaData,  // Objeto con insumos_descontados flag
    tipo: 'consulta',    // 'consulta', 'cirugia', 'alta'
    button: submitBtn    // Botón que dispara la acción
});

if (!validacion.valido) {
    ValidadorInsumos.mostrarAlerta(validacion.mensaje, validacion.tipo);
    return;
}
```

#### `bloquearBoton(button, textoOriginal)`
Bloquea un botón durante procesamiento.

```javascript
const submitBtn = form.querySelector('button[type="submit"]');
ValidadorInsumos.bloquearBoton(submitBtn);
// Botón muestra: [spinner] Procesando...
```

#### `desbloquearBoton(button, exito)`
Desbloquea un botón después del procesamiento.

```javascript
// Éxito - muestra checkmark por 2 segundos
ValidadorInsumos.desbloquearBoton(submitBtn, true);

// Error - restaura inmediatamente
ValidadorInsumos.desbloquearBoton(submitBtn, false);
```

#### `marcarFormularioEnviado(form)`
Marca un formulario como enviado (protección adicional).

```javascript
ValidadorInsumos.marcarFormularioEnviado(form);
```

#### `formularioYaEnviado(form)`
Verifica si un formulario ya fue enviado.

```javascript
if (ValidadorInsumos.formularioYaEnviado(form)) {
    alert('Ya procesado');
    return;
}
```

#### `resetearFormulario(form)`
Resetea el estado de un formulario (después de error).

```javascript
ValidadorInsumos.resetearFormulario(form);
```

#### `ejecutarConValidacion(options)`
Wrapper completo para ejecutar acción con validación automática.

```javascript
const resultado = await ValidadorInsumos.ejecutarConValidacion({
    data: { insumos_descontados: false },
    tipo: 'consulta',
    button: submitBtn,
    form: form,
    accion: async () => {
        // Tu código aquí
        const response = await fetch(...);
        return await response.json();
    }
});
```

#### `crearBadgeEstado(descontados)`
Crea badge HTML para mostrar estado de insumos.

```javascript
const badgeHTML = ValidadorInsumos.crearBadgeEstado(true);
// Retorna: <div class="alert alert-success">✅ Insumos descontados...</div>
```

#### `yaDescontados(data)`
Verifica si los insumos ya fueron descontados.

```javascript
if (ValidadorInsumos.yaDescontados(consultaData)) {
    // Los insumos YA fueron descontados
}
```

## 📝 Patrón de Implementación

### Para cualquier formulario que afecte inventario:

```javascript
const form = document.getElementById('miFormulario');
form.onsubmit = async function(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    
    // 1. VALIDAR si ya fue enviado
    if (ValidadorInsumos && ValidadorInsumos.formularioYaEnviado(form)) {
        ValidadorInsumos.mostrarAlerta('Ya procesado', 'ya_procesando');
        return;
    }
    
    // 2. BLOQUEAR UI
    if (ValidadorInsumos && submitButton) {
        ValidadorInsumos.bloquearBoton(submitButton);
        ValidadorInsumos.marcarFormularioEnviado(form);
    }
    
    try {
        // 3. EJECUTAR acción
        const response = await fetch(...);
        const data = await response.json();
        
        if (data.success) {
            // 4a. ÉXITO - desbloquear
            if (ValidadorInsumos && submitButton) {
                ValidadorInsumos.desbloquearBoton(submitButton, true);
            }
            // ... resto del código de éxito
        } else {
            // 4b. ERROR - desbloquear y resetear
            if (ValidadorInsumos) {
                if (submitButton) ValidadorInsumos.desbloquearBoton(submitButton, false);
                ValidadorInsumos.resetearFormulario(form);
            }
            alert('Error: ' + data.error);
        }
    } catch (error) {
        // 4c. ERROR RED - desbloquear y resetear
        if (ValidadorInsumos) {
            if (submitButton) ValidadorInsumos.desbloquearBoton(submitButton, false);
            ValidadorInsumos.resetearFormulario(form);
        }
        alert('Error de red');
    }
};
```

## 🔒 Validación Backend

El validador NO reemplaza la validación del backend. El backend debe:

1. **Verificar el flag `insumos_descontados`** antes de procesar
2. **Usar transacciones** para garantizar atomicidad
3. **Retornar el flag** en las respuestas JSON

### Ejemplo en Django views:

```python
def crear_consulta(request, paciente_id):
    consulta = Consulta.objects.get(id=consulta_id)
    
    # ✅ VALIDAR antes de descontar
    if consulta.insumos_descontados:
        return JsonResponse({
            'success': False,
            'error': 'Los insumos ya fueron descontados'
        })
    
    # Procesar descuento...
    with transaction.atomic():
        # Descontar insumos
        # ...
        consulta.insumos_descontados = True
        consulta.save()
    
    return JsonResponse({
        'success': True,
        'insumos_descontados': True
    })
```

## 🎨 Estados Visuales

### Botón Normal
```html
<button type="submit">Guardar Consulta</button>
```

### Botón Procesando
```html
<button type="submit" disabled style="opacity: 0.6; cursor: not-allowed;">
    [spinner] Procesando...
</button>
```

### Botón Completado (2 segundos)
```html
<button type="submit" style="opacity: 1;">
    ✅ Completado
</button>
```

## 🚀 Cómo Usar en Nuevos Módulos

1. **Incluir el script** en tu template HTML:
```html
<script src="{% static 'js/utils/validator_insumos.js' %}"></script>
```

2. **Aplicar el patrón** de implementación en tu JS

3. **Verificar disponibilidad** con `if (window.ValidadorInsumos)`

## ⚠️ Consideraciones

- El validador está disponible globalmente como `window.ValidadorInsumos`
- Siempre verificar disponibilidad antes de usar
- Los formularios deben tener `id` único para protección de re-envío
- Los botones submit deben tener `type="submit"` para ser encontrados
- El módulo NO bloquea F5 o navegación del browser

## 🧪 Testing

Para probar que funciona:

1. Crear una consulta nueva
2. Hacer click en "Guardar"
3. Intentar hacer click nuevamente → Debe mostrarse alerta
4. Verificar que el botón muestra spinner durante procesamiento
5. Verificar que después de éxito muestra "Completado"

## 📊 Métricas de Protección

El validador protege contra:
- ✅ Doble submit (misma sesión)
- ✅ Click spam en botones
- ✅ Re-procesamiento de operaciones completadas
- ✅ Estados inconsistentes de UI
- ❌ F5 / Refresh (requiere validación backend)
- ❌ Múltiples tabs/ventanas (requiere validación backend)

## 📚 Archivos Modificados

1. **Creados:**
   - `static/js/utils/validator_insumos.js`
   - `staticfiles/js/utils/validator_insumos.js`

2. **Modificados:**
   - `static/js/pacientes/historial_medico.js`
   - `static/js/pacientes/hospitalizaciones.js`
   - `clinica/templates/consulta/ficha_mascota.html`
   - `staticfiles/js/pacientes/historial_medico.js`
   - `staticfiles/js/pacientes/hospitalizaciones.js`

## 🔄 Mantenimiento

Al agregar nuevas operaciones que afecten inventario:
1. Aplicar el patrón de implementación
2. Probar flujos de éxito y error
3. Verificar que los botones se comportan correctamente
4. Sincronizar cambios a `staticfiles/`

---

**Última actualización:** 2025-12-15  
**Autor:** Sistema de Validación Centralizada VetSantaSofia
