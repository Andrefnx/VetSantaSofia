# 💡 EJEMPLOS DE USO - MÓDULO DE AGENDA

## Casos de Uso Reales

---

## 📅 Caso 1: Configurar Horario Semanal del Veterinario

**Escenario**: Dr. Carlos trabaja de lunes a viernes, mañana y tarde, excepto miércoles tarde.

**Pasos**:

1. **Lunes - Configurar disponibilidad**
   ```
   Agenda → Click en lunes → Disponibilidad
   
   Bloque 1:
   - Hora inicio: 09:00
   - Hora fin: 13:00
   - Tipo: Disponible
   - Guardar
   
   Bloque 2:
   - Hora inicio: 15:00
   - Hora fin: 18:00
   - Tipo: Disponible
   - Guardar
   ```

2. **Repetir para martes, jueves y viernes**

3. **Miércoles - Solo mañana**
   ```
   Agenda → Click en miércoles → Disponibilidad
   
   Bloque 1:
   - Hora inicio: 09:00
   - Hora fin: 13:00
   - Tipo: Disponible
   - Guardar
   ```

**Resultado**: El veterinario tiene 4.5 días de disponibilidad configurados.

---

## 🏖️ Caso 2: Marcar Vacaciones

**Escenario**: Dra. Ana se va de vacaciones del 24 al 31 de diciembre.

**Pasos**:

```
Para cada día (24, 25, 26, 27, 28, 29, 30, 31 de diciembre):

1. Agenda → Click en el día
2. Disponibilidad
3. Completar:
   - Hora inicio: 00:00
   - Hora fin: 23:59
   - Tipo: Vacaciones
   - Notas: "Vacaciones de fin de año"
4. Guardar
```

**Resultado**: 
- ❌ No se podrán agendar citas con Dra. Ana en esas fechas
- 📅 El sistema mostrará "Vacaciones" en el timeline

---

## 🐕 Caso 3: Agendar Consulta Regular

**Escenario**: Luna (Golden Retriever) necesita consulta veterinaria.

**Pasos**:

```
1. Agenda → Click en día deseado (ej: 15 de enero)
2. Ver tabs de veterinarios
3. Seleccionar: Dr. Carlos Ramírez
4. Click en "Nueva Cita"
5. Completar formulario:
   - Paciente: Luna (Golden Retriever) - María González
   - Veterinario: Dr. Carlos Ramírez (pre-seleccionado)
   - Servicio: Consulta General (60 min)
   - Tipo: Consulta
   - Hora inicio: 10:00
   - (Hora fin se calcula automáticamente: 11:00)
   - Estado: Pendiente
   - Motivo: "Control de rutina y revisión general"
6. Guardar
```

**Resultado**:
- ✅ Cita agendada de 10:00 a 11:00
- 🔵 Bloque aparece en timeline en azul (si estado es confirmada)
- 🟠 Bloque aparece en naranja (si estado es pendiente)

---

## 💉 Caso 4: Vacunación Rápida (15 minutos)

**Escenario**: Max necesita vacuna antirrábica.

**Pasos**:

```
1. Agenda → Click en día
2. Seleccionar veterinario disponible
3. Nueva Cita
4. Completar:
   - Paciente: Max (Pastor Alemán)
   - Servicio: Vacunación (15 min)
   - Hora inicio: 09:00
   - (Hora fin: 09:15 - automático)
   - Tipo: Vacunación
   - Motivo: "Vacuna antirrábica anual"
5. Guardar
```

**Resultado**:
- ✅ Cita de solo 15 minutos
- ⏱️ Veterinario disponible desde 09:15 para otra cita

---

## 🏥 Caso 5: Cirugía Programada (2 horas)

**Escenario**: Michi necesita esterilización (120 minutos).

**Pasos**:

```
1. Agenda → Click en día programado
2. Seleccionar veterinario
3. Nueva Cita
4. Completar:
   - Paciente: Michi (Gato Persa)
   - Servicio: Esterilización (120 min)
   - Hora inicio: 14:00
   - (Hora fin: 16:00 - automático)
   - Tipo: Cirugía
   - Estado: Confirmada
   - Motivo: "Esterilización programada"
   - Notas: "Paciente en ayuno desde las 20:00 del día anterior"
5. Guardar
```

**Resultado**:
- ✅ Bloque de 2 horas reservado
- ⚠️ Sistema NO permitirá agendar otra cita del mismo veterinario entre 14:00-16:00

---

## ✏️ Caso 6: Cambiar Estado de Cita

**Escenario**: Luna llegó a su consulta, cambiar estado a "En Curso".

**Pasos**:

```
1. Agenda → Día de la cita
2. Ver timeline del veterinario
3. Click en la cita de Luna (10:00-11:00)
4. Modal se abre con datos
5. Cambiar:
   - Estado: En Curso
6. Guardar
```

**Resultado**:
- 🟢 Bloque cambia a verde en timeline
- 📊 Estado actualizado en base de datos

---

## 🔄 Caso 7: Reprogramar Cita

**Escenario**: Cliente llama para cambiar cita del 15 al 17 de enero.

**Pasos**:

```
Opción A - Editar existente:
1. Agenda → 15 de enero
2. Click en cita
3. Modal se abre
4. Cambiar fecha: 17 de enero
5. Verificar disponibilidad en nueva fecha
6. Guardar

Opción B - Eliminar y recrear:
1. Agenda → 15 de enero
2. Click en cita → Eliminar
3. Ir a 17 de enero
4. Nueva Cita con los mismos datos
```

**Resultado**:
- ✅ Cita movida al 17 de enero
- 🔓 15 de enero queda disponible nuevamente

---

## ❌ Caso 8: Cliente No Asiste

**Escenario**: Luna no llegó a su cita.

**Pasos**:

```
1. Agenda → Día de la cita
2. Click en cita de Luna
3. Modal se abre
4. Cambiar:
   - Estado: No Asistió
   - Notas: "Cliente no asistió, no avisó"
5. Guardar
```

**Resultado**:
- 📝 Cita marcada como "No Asistió"
- 📊 Datos guardados para historial
- 🔓 Horario se libera para futuras citas

---

## 🚨 Caso 9: Emergencia sin Disponibilidad

**Escenario**: Llega emergencia pero el veterinario no tiene disponibilidad configurada.

**Solución Rápida**:

```
1. Agenda → Click en día de hoy
2. Disponibilidad (crear rápido)
   - Hora inicio: Hora actual (ej: 11:00)
   - Hora fin: Hora estimada de finalización (ej: 13:00)
   - Tipo: Disponible
   - Guardar
3. Nueva Cita
   - Tipo: Emergencia
   - Estado: En Curso
   - Resto de datos
   - Guardar
```

**Resultado**:
- ✅ Emergencia atendida y registrada
- 📋 Sistema mantiene historial

---

## 📊 Caso 10: Ver Agenda del Día

**Escenario**: Recepcionista necesita ver todas las citas del día.

**Pasos**:

```
1. Agenda → Click en día actual (o botón "Hoy")
2. Sistema muestra tabs de todos los veterinarios
3. Click en cada tab para ver:
   - Bloques disponibles (verde)
   - Citas agendadas (colores según estado)
   - Vacaciones/licencias (amarillo)
```

**Resultado**:
- 👁️ Vista completa del día por veterinario
- 📞 Información para atender llamadas de clientes
- 📋 Preparación de consultas

---

## 🔍 Caso 11: Buscar Horario Disponible

**Escenario**: Cliente pregunta por disponibilidad en la semana.

**Pasos**:

```
1. Agenda → Navegar por días de la semana
2. Para cada día:
   - Click en día
   - Ver timeline de veterinario preferido
   - Buscar bloques verdes (disponibles)
3. Ofrecer opciones al cliente
4. Agendar en horario elegido
```

**Tips**:
- 🟢 Verde = Disponible
- 🔵 Azul = Ocupado
- ⚪ Gris = Sin disponibilidad configurada

---

## 📱 Caso 12: Uso en Móvil

**Escenario**: Veterinario revisa agenda desde su celular.

**Pasos**:

```
1. Abrir navegador móvil
2. Ir a: tudominio.com/agenda/
3. Login con credenciales
4. Interfaz se adapta automáticamente
5. Calendario más compacto
6. Timeline vertical
7. Modales full-screen en móvil
```

**Resultado**:
- 📱 Agenda funcional en dispositivos móviles
- ✅ Todas las funciones disponibles

---

## 💼 Caso 13: Administrador Gestiona Todos

**Escenario**: Administrador necesita configurar disponibilidad de todos los veterinarios.

**Pasos**:

```
Para cada veterinario:

1. Agenda → Seleccionar día
2. Disponibilidad
3. En selector "Veterinario":
   - Admin puede ver TODOS los veterinarios
   - Seleccionar el veterinario a configurar
4. Configurar horarios
5. Guardar
```

**Permisos**:
- ✅ Admin: Ve y edita todos los veterinarios
- ⚠️ Veterinario: Solo ve su propia disponibilidad

---

## 🎯 Mejores Prácticas

### Para Veterinarios:
1. ✅ Configurar disponibilidad al inicio de cada mes
2. ✅ Marcar vacaciones con anticipación
3. ✅ Actualizar estados de citas en tiempo real

### Para Recepcionistas:
1. ✅ Verificar disponibilidad antes de agendar por teléfono
2. ✅ Confirmar citas el día anterior (cambiar estado a "Confirmada")
3. ✅ Agregar notas importantes en cada cita

### Para Administradores:
1. ✅ Revisar disponibilidad de todos semanalmente
2. ✅ Configurar horarios de nuevos veterinarios
3. ✅ Gestionar cambios de último minuto

---

## ⚠️ Errores Comunes y Soluciones

### Error: "Veterinario no disponible"
**Causa**: No hay disponibilidad configurada  
**Solución**: Configurar disponibilidad para ese día

### Error: "Ya existe una cita en ese horario"
**Causa**: Solapamiento de citas  
**Solución**: Elegir otro horario o veterinario

### Timeline vacío
**Causa**: No hay disponibilidad configurada  
**Solución**: Crear bloques de disponibilidad

### No aparece opción de editar disponibilidad
**Causa**: Usuario sin permisos  
**Solución**: Contactar administrador para permisos

---

**¡Listo para usar! 🎉**

Con estos ejemplos, el personal de la clínica puede comenzar a usar el sistema de manera efectiva desde el primer día.
