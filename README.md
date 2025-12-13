# VetSantaSofia

Sistema de gestión veterinaria con módulos integrados para administración, pacientes, inventario, servicios y agenda.

## 🚀 Inicio Rápido

### Activar Entorno Virtual
```bash
.\venv\Scripts\activate
```

### Ejecutar Servidor
```bash
python manage.py runserver
```

### Acceder al Sistema
- **URL**: http://localhost:8000/
- **Admin**: http://localhost:8000/admin/
- **Agenda**: http://localhost:8000/agenda/

---

## 📦 Módulos del Sistema

### 1. Gestión de Pacientes
- Registro de mascotas y propietarios
- Historial médico
- Fichas clínicas

### 2. Inventario
- Control de insumos y medicamentos
- Alertas de stock
- Movimientos

### 3. Servicios
- Catálogo de servicios veterinarios
- Precios y duraciones
- Asociación con insumos

### 4. 🗓️ **AGENDA** (Nuevo)
Sistema completo de gestión de citas y disponibilidad de veterinarios.

**Características**:
- ✅ Calendario mensual interactivo
- ✅ Gestión de disponibilidad por veterinario
- ✅ Timeline visual por día
- ✅ Agendamiento con validaciones
- ✅ Sincronización con servicios
- ✅ Gestión de vacaciones/licencias
- ✅ Sin librerías externas

**Documentación**:
- 📖 [Inicio Rápido](AGENDA_README.md)
- 📚 [Documentación Técnica](AGENDA_DOCUMENTACION.md)
- 💡 [Ejemplos de Uso](AGENDA_EJEMPLOS.md)
- ✅ [Checklist de Verificación](AGENDA_CHECKLIST.md)
- 📊 [Resumen Ejecutivo](AGENDA_RESUMEN.md)

**Inicializar Agenda**:
```bash
python manage.py inicializar_agenda
```

---

## 🛠️ Instalación y Configuración

### Requisitos
- Python 3.8+
- Django 4.x
- SQLite (desarrollo) / PostgreSQL (producción)

### Migraciones
```bash
python manage.py makemigrations
python manage.py migrate
```

### Crear Superusuario
```bash
python manage.py createsuperuser
```

---

## 👥 Roles del Sistema

| Rol | Permisos |
|-----|----------|
| **Administrador** | Acceso total, gestiona usuarios y configuración |
| **Veterinario** | Atención de pacientes, agenda propia |
| **Recepcionista** | Agendamiento, gestión de citas |

---

## 📁 Estructura del Proyecto

```
VetSantaSofia/
├── agenda/              # 🗓️ Sistema de citas y disponibilidad
├── caja/                # 💰 Gestión financiera
├── clinica/             # 🏥 Módulo clínico
├── cuentas/             # 👤 Autenticación y usuarios
├── dashboard/           # 📊 Panel principal
├── gestion/             # 📋 Gestión general
├── hospital/            # 🏥 Gestión hospitalaria
├── inventario/          # 📦 Control de inventario
├── pacientes/           # 🐾 Registro de pacientes
├── servicios/           # 💉 Catálogo de servicios
├── templates/           # 🎨 Templates globales
├── static/              # 🎨 Archivos estáticos
└── media/               # 📁 Archivos multimedia
```

---

## 🔧 Comandos Útiles

### Desarrollo
```bash
# Ejecutar tests
python manage.py test

# Shell interactivo
python manage.py shell

# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Recolectar archivos estáticos
python manage.py collectstatic
```

### Agenda
```bash
# Inicializar datos de ejemplo
python manage.py inicializar_agenda

# Ver migraciones de agenda
python manage.py showmigrations agenda
```

---

## 📝 Notas de Desarrollo

### Últimas Actualizaciones

#### v1.1 - Módulo de Agenda (Diciembre 2025)
- ✅ Implementado sistema completo de agenda
- ✅ Modelos: DisponibilidadVeterinario y Cita (actualizado)
- ✅ API REST para disponibilidad y citas
- ✅ Frontend con JavaScript vanilla
- ✅ Validaciones de negocio
- ✅ Documentación completa

---

## 🐛 Solución de Problemas

### Error: ModuleNotFoundError
```bash
# Verificar entorno virtual activado
.\venv\Scripts\activate

# Reinstalar dependencias
pip install -r requirements.txt
```

### Error: No such table
```bash
python manage.py migrate
```

### Agenda no carga
```bash
# Verificar migraciones
python manage.py showmigrations agenda

# Aplicar si falta
python manage.py migrate agenda
```

---

## 📚 Recursos

- [Django Documentation](https://docs.djangoproject.com/)
- [Bootstrap 5](https://getbootstrap.com/)
- [Font Awesome](https://fontawesome.com/)

---

## 📄 Licencia

Proyecto privado - VetSantaSofia

---

**Desarrollado con ❤️ para VetSantaSofia**