# 🗓️ Módulo de Agenda - Inicio Rápido

## ✅ Instalación Completada

El módulo de agenda ha sido instalado exitosamente en tu sistema.

## 🚀 Primeros Pasos

### 1. Inicializar con Datos de Ejemplo (Opcional)

```bash
python manage.py inicializar_agenda
```

Este comando creará:
- Disponibilidad para todos los veterinarios durante los próximos 7 días
- Algunas citas de ejemplo

### 2. Acceder a la Agenda

Una vez que el servidor esté corriendo:

```bash
python manage.py runserver
```

Accede a: **http://localhost:8000/agenda/**

## 📖 Cómo Usar

### Para Veterinarios

#### Configurar tu Disponibilidad
1. Entra a **Agenda**
2. Haz click en el día que quieres configurar
3. Click en **"Disponibilidad"**
4. Completa:
   - Horario (ej: 09:00 - 13:00)
   - Tipo: Disponible
5. Guarda

#### Marcar Vacaciones/Licencias
1. Selecciona el día
2. Click en **"Disponibilidad"**
3. Tipo: **Vacaciones** (o Licencia/Ausencia)
4. Guarda

### Para Recepcionistas

#### Agendar una Cita
1. Selecciona el día en el calendario
2. Elige el veterinario (aparecerán tabs)
3. Click en **"Nueva Cita"**
4. Completa:
   - **Paciente**: Busca en la lista
   - **Servicio**: Selecciona (la duración se calcula automáticamente)
   - **Hora**: Elige un horario disponible (verde en el timeline)
5. Guarda

#### Editar una Cita
1. Haz click en la cita en el timeline
2. Modifica lo necesario
3. Guarda

## 🎨 Interfaz

### Calendario Mensual
- **Verde claro**: Días con citas
- **Azul claro**: Día actual
- **Azul fuerte**: Día seleccionado

### Timeline del Día
- **Verde**: Disponible para agendar
- **Azul**: Cita confirmada
- **Naranja**: Cita pendiente
- **Gris**: Cita completada
- **Amarillo**: Vacaciones/Licencias

## ⚠️ Validaciones del Sistema

El sistema NO permitirá:
- ❌ Agendar fuera de la disponibilidad del veterinario
- ❌ Doble agendamiento del mismo veterinario
- ❌ Bloques horarios que se solapen

## 🔐 Permisos

| Rol | Ver Agenda | Agendar | Config. Disponibilidad |
|-----|-----------|---------|----------------------|
| **Veterinario** | ✅ | ✅ | ✅ (Propia) |
| **Recepcionista** | ✅ | ✅ | ❌ |
| **Administrador** | ✅ | ✅ | ✅ (Todas) |

## 📱 Características

✅ Calendario interactivo mensual  
✅ Timeline por veterinario  
✅ Cálculo automático de duración según servicio  
✅ Validación de disponibilidad en tiempo real  
✅ Gestión de vacaciones y licencias  
✅ Estados de cita (pendiente, confirmada, completada, etc.)  
✅ Responsive (funciona en móviles)  

## 🆘 Problemas Comunes

### "No puedo agendar una cita"
**Solución**: Verifica que el veterinario tenga disponibilidad configurada para ese día.

### "El timeline está vacío"
**Solución**: Configura la disponibilidad del veterinario primero.

### "Error al guardar"
**Solución**: Revisa que:
- El horario esté dentro de la disponibilidad
- No se solape con otra cita
- Todos los campos requeridos estén completos

## 📚 Documentación Completa

Para más detalles técnicos, arquitectura y flujos del sistema, consulta:

**[AGENDA_DOCUMENTACION.md](AGENDA_DOCUMENTACION.md)**

---

## 🎯 ¿Qué sigue?

Extensiones opcionales que puedes implementar:
- [ ] Integración con ficha del paciente
- [ ] Notificaciones por email/SMS
- [ ] Recordatorios automáticos
- [ ] Exportar agenda a PDF
- [ ] Vista semanal

---

**¡Listo para usar! 🎉**
