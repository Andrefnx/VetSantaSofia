# VetSantaSofia

Sistema de gestión veterinaria desarrollado con Django 5.2.7. Integra autenticación por RUT, pacientes, agenda, atención clínica, inventario, servicios, caja y trazabilidad.

## Demo interactiva

**[Abrir demo navegable de VetSantaSofia](https://andrefnx.github.io/VetSantaSofia/)**

La carpeta `demo/` contiene una experiencia estática separada del backend Django y pensada para GitHub Pages. Replica los flujos principales del rol veterinario sin conectarse a PostgreSQL ni a servicios externos.

Incluye:

- acceso con un usuario veterinario ficticio;
- panel general con métricas y próximas consultas;
- agenda por bloques con citas disponibles, ocupadas y completadas;
- creación de citas ficticias desde bloques disponibles;
- listado y búsqueda de pacientes;
- ficha clínica de cada paciente;
- timeline clínico con consultas, controles, vacunas y exámenes;
- registro de evoluciones ficticias;
- persistencia local con `localStorage` y botón para restablecer los datos iniciales.

Credenciales de la demo web:

- RUT: `22222222-2`
- Contraseña: `DemoVet2026!`

> La demo es únicamente una representación interactiva del producto. No ejecuta Django, no usa credenciales reales y no tiene acceso a la base de datos del sistema. Los cambios realizados en ella permanecen sólo en el navegador del visitante.

## Módulos funcionales

| Módulo | Responsabilidad principal |
| --- | --- |
| `cuentas` / `login` | Usuarios, roles y autenticación por RUT |
| `dashboard` | Panel principal y navegación |
| `pacientes` | Propietarios, mascotas y antecedentes |
| `agenda` | Citas y disponibilidad veterinaria |
| `clinica` | Atención y registros clínicos |
| `inventario` | Medicamentos, insumos y stock |
| `servicios` | Catálogo de prestaciones y relación con insumos |
| `caja` | Operaciones financieras del sistema |
| `historial` | Auditoría y trazabilidad de cambios |

## Arquitectura técnica

La aplicación sigue la arquitectura estándar de Django: navegador → rutas/vistas → capa de modelos/ORM → base de datos. Los módulos comparten relaciones mediante claves foráneas y el usuario autenticado.

```mermaid
flowchart LR
    U[Usuario / Navegador] --> W[Gunicorn / WSGI]
    W --> D[Django]
    D --> A[Autenticación y permisos]
    D --> P[Pacientes]
    D --> G[Agenda]
    D --> C[Clínica]
    D --> I[Inventario]
    D --> S[Servicios]
    D --> K[Caja]
    P --> DB[(Base de datos)]
    G --> DB
    C --> DB
    I --> DB
    S --> DB
    K --> DB
    A --> DB
    D --> H[Historial / auditoría]
    H --> DB
    D --> ST[WhiteNoise / staticfiles]
```

### Flujo de datos principal

```mermaid
flowchart TD
    O[Propietario] --> P[Paciente]
    P --> C[Cita]
    V[Veterinario / CustomUser] --> C
    S[Servicio] --> C
    S --> SI[ServicioInsumo]
    I[Insumo] --> SI
    U[Usuario autenticado] --> T[Trazabilidad]
    P --> T
    S --> T
    I --> T
```

Las conexiones relevantes actualmente implementadas incluyen:

- `Paciente` pertenece a un `Propietario`.
- `Cita` relaciona `Paciente`, `CustomUser` con rol veterinario y, opcionalmente, un `Servicio`.
- `ServicioInsumo` relaciona un servicio del catálogo con uno o más registros de `Insumo`.
- `Insumo` puede registrar el usuario responsable de su último movimiento.
- `Paciente` y `Servicio` incluyen campos de última modificación para trazabilidad rápida.
- `RegistroHistorico` mantiene una auditoría central para pacientes, servicios e inventario mediante entidad, ID del objeto, tipo de evento, usuario, criticidad y datos de cambio en JSON.

## Persistencia y conexiones de datos

La configuración de base de datos se obtiene desde `DATABASE_URL` mediante `dj-database-url`.

```text
Django models
    ↓
Django ORM
    ↓
DATABASE_URL
    ↓
PostgreSQL en despliegue persistente
```

Ejemplo de configuración:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

Para desarrollo local, si `DATABASE_URL` no está definido, la configuración actual permite usar SQLite como fallback. Los archivos de base local no se versionan.

### Migraciones

```bash
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py showmigrations
```

No se deben modificar nombres de modelos, campos o relaciones sin una migración explícita y una necesidad funcional comprobada.

## Autenticación y roles

El proyecto utiliza `cuentas.CustomUser` como `AUTH_USER_MODEL`. El identificador de acceso es el RUT y el backend personalizado normaliza su formato antes de autenticar.

| Rol | Uso |
| --- | --- |
| Administración | Gestión general y acceso administrativo |
| Veterinario | Atención clínica y agenda |
| Recepción | Gestión operativa y agendamiento |

La aplicación mantiene además el backend estándar de Django como respaldo de autenticación.

## Seguridad

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` y `DATABASE_URL` se obtienen mediante variables de entorno.
- `.env` está excluido por `.gitignore`; `.env.example` contiene sólo placeholders.
- `DEBUG` debe ser `False` fuera de desarrollo.
- Django mantiene protección CSRF mediante `CsrfViewMiddleware`.
- La autenticación usa el sistema de hashing de contraseñas de Django; no se guardan contraseñas en texto plano.
- El acceso a datos utiliza el ORM de Django en los flujos revisados.
- `SESSION_COOKIE_SECURE` y `CSRF_COOKIE_SECURE` se activan cuando `DEBUG=False`.
- `SECURE_PROXY_SSL_HEADER` permite reconocer HTTPS detrás de un proxy inverso correctamente configurado.
- WhiteNoise sirve los archivos estáticos recolectados; los archivos de usuario bajo `MEDIA_ROOT` requieren persistencia apropiada.
- Cualquier credencial publicada en commits anteriores debe considerarse comprometida y rotarse.

### Seguridad de la demo web

La demo de GitHub Pages se encuentra aislada en `demo/`: no contiene `SECRET_KEY`, `DATABASE_URL`, tokens ni solicitudes hacia el backend. Los datos ficticios se definen en JavaScript y cualquier modificación se persiste únicamente mediante `localStorage` del navegador.

### Auditoría y trazabilidad

`historial.RegistroHistorico` funciona como registro central de auditoría y almacena fecha, entidad, objeto afectado, tipo de evento, descripción, usuario responsable, criticidad y datos estructurados del cambio en `JSONField`.

## Stack y versiones técnicas

| Componente | Versión/configuración actual |
| --- | --- |
| Python | 3.12 recomendado |
| Django | 5.2.7 |
| Gunicorn | 23.0.0 |
| WhiteNoise | 6.11.0 |
| PostgreSQL driver | psycopg2-binary 2.9.11 |
| `dj-database-url` | 3.0.1 |
| Jazzmin | 3.0.1 |
| django-extensions | 4.1 |

`requirements.txt` es la fuente de verdad para las versiones de dependencias instalables.

## Versionado del proyecto

El repositorio actualmente **no publica tags Git**, por lo que no se debe inferir una versión de release únicamente desde documentos históricos. Para futuros releases se recomienda SemVer (`MAJOR.MINOR.PATCH`).

## Datos demo del backend

```bash
python manage.py cargar_demo
```

El comando es idempotente y crea datos ficticios para usuarios por rol, propietarios, pacientes, servicios, inventario y citas.

Usuario navegable de demostración:

- RUT: `22222222-2`
- Contraseña: `DemoVet2026!`
- Rol: Veterinario

## Instalación local

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py cargar_demo
python manage.py runserver
```

En Windows: `copy .env.example .env`.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SECRET_KEY` | Clave secreta de Django |
| `DEBUG` | Debe ser `False` en producción |
| `ALLOWED_HOSTS` | Hosts permitidos separados por coma |
| `CSRF_TRUSTED_ORIGINS` | Orígenes HTTPS confiables |
| `DATABASE_URL` | URL de conexión a la base de datos |

## Archivos estáticos y media

WhiteNoise sirve los archivos generados por:

```bash
python manage.py collectstatic --noinput
```

Los estáticos se recopilan en `staticfiles/`. El contenido subido por usuarios utiliza `MEDIA_ROOT`.

## Despliegue portable

La aplicación no depende de un proveedor concreto. Puede ejecutarse en una VM, un contenedor o una plataforma que admita Python y PostgreSQL.

```bash
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
gunicorn veteriaria.wsgi:application --bind 0.0.0.0:${PORT:-8000}
```

También puede utilizar `./build.sh` para instalación, migraciones y estáticos.

## Publicación de la demo en GitHub Pages

El workflow `.github/workflows/pages-demo.yml` publica exclusivamente el contenido de `demo/`. Tras fusionar cambios a `main`, GitHub Actions construye el artefacto de Pages y lo despliega en la URL del proyecto.

La demo no forma parte del proceso WSGI y puede funcionar aunque el backend Django no esté desplegado.

## Validación y pruebas

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py test
```

El repositorio incluye `.github/workflows/demo-checks.yml` para ejecutar estas comprobaciones sobre PostgreSQL 16.

## Estructura principal

```text
agenda/       citas y disponibilidad
caja/         gestión financiera
clinica/      atención clínica
cuentas/      usuarios y autenticación
dashboard/    panel principal
demo/         demo web estática para GitHub Pages
gestion/      gestión general
historial/    auditoría y trazabilidad
hospital/     componentes hospitalarios
inventario/   insumos y stock
login/        flujo de acceso
pacientes/    propietarios y pacientes
servicios/    catálogo de servicios
static/       archivos estáticos
templates/    plantillas globales
veteriaria/   configuración del proyecto
```

## Comandos útiles

```bash
python manage.py runserver
python manage.py check
python manage.py showmigrations
python manage.py migrate
python manage.py test
python manage.py cargar_demo
python manage.py collectstatic --noinput
python manage.py shell
```

## Estado de la documentación

Este README documenta la configuración actual preparada para despliegue portable. Los documentos históricos ubicados en carpetas de análisis o deployment pueden reflejar decisiones anteriores y no deben prevalecer sobre `settings.py`, `requirements.txt`, las migraciones y el código actual.
