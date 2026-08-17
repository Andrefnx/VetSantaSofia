# VetSantaSofia

Sistema de gestión veterinaria desarrollado con Django 5.2.7. Incluye autenticación por RUT, pacientes, agenda, atención clínica, inventario, servicios, caja y trazabilidad.

## Demo interactiva

**[Abrir demo de VetSantaSofia](https://andrefnx.github.io/VetSantaSofia/)**

La carpeta `demo/` contiene una versión estática para GitHub Pages. Permite recorrer los principales flujos del veterinario sin depender del backend Django ni de PostgreSQL.

La demo incluye panel general, agenda por bloques, dos veterinarios con disponibilidades independientes, citas, pacientes, ficha clínica, historial, hospitalizaciones, documentos e inventario asociado a consultas.

Credenciales:

- RUT: `22222222-2`
- Contraseña: `DemoVet2026!`

Los datos de esta demo no corresponden a pacientes reales. Los cambios se guardan sólo en `localStorage` del navegador.

## Módulos

| Módulo | Responsabilidad principal |
| --- | --- |
| `cuentas` / `login` | Usuarios, roles y autenticación por RUT |
| `dashboard` | Panel principal y navegación |
| `pacientes` | Propietarios, mascotas y antecedentes |
| `agenda` | Citas y disponibilidad veterinaria |
| `clinica` | Atención y registros clínicos |
| `inventario` | Medicamentos, insumos y stock |
| `servicios` | Catálogo de prestaciones y relación con insumos |
| `caja` | Operaciones financieras |
| `historial` | Auditoría y trazabilidad |

## Arquitectura

La aplicación sigue el flujo habitual de Django: navegador → rutas/vistas → modelos/ORM → base de datos.

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

### Relaciones principales

```mermaid
flowchart TD
    O[Propietario] --> P[Paciente]
    P --> C[Cita]
    V[Veterinario / CustomUser] --> C
    S[Servicio] --> C
    S --> SI[ServicioInsumo]
    I[Insumo] --> SI
    U[Usuario autenticado] --> T[RegistroHistorico]
    P --> T
    S --> T
    I --> T
```

- `Paciente` pertenece a un `Propietario`.
- `Cita` relaciona un paciente, un veterinario y opcionalmente un servicio.
- `ServicioInsumo` conecta servicios con los insumos que utilizan.
- `Insumo` puede registrar al usuario responsable del último movimiento.
- `RegistroHistorico` centraliza cambios de pacientes, servicios e inventario.

## Base de datos

La conexión se configura mediante `DATABASE_URL` y `dj-database-url`.

```text
Django models
    ↓
Django ORM
    ↓
DATABASE_URL
    ↓
PostgreSQL
```

Ejemplo:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

En desarrollo, si `DATABASE_URL` no está definido, la configuración permite usar SQLite. Las bases locales no se versionan.

### Migraciones

```bash
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py showmigrations
```

Los cambios de modelos, campos o relaciones deben acompañarse de su migración correspondiente.

## Autenticación y roles

El proyecto utiliza `cuentas.CustomUser` como `AUTH_USER_MODEL`. El acceso se realiza mediante RUT y el backend personalizado normaliza su formato antes de autenticar.

| Rol | Uso |
| --- | --- |
| Administración | Gestión general y acceso administrativo |
| Veterinario | Atención clínica y agenda |
| Recepción | Gestión operativa y agendamiento |

El backend estándar de Django se mantiene habilitado junto al backend de autenticación por RUT.

## Seguridad

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` y `DATABASE_URL` se leen desde variables de entorno.
- `.env` está excluido por `.gitignore` y `.env.example` no contiene secretos.
- `DEBUG` debe ser `False` fuera de desarrollo.
- La protección CSRF se mantiene mediante `CsrfViewMiddleware`.
- Las contraseñas usan el sistema de hashing de Django.
- El acceso a datos pasa por el ORM de Django en los flujos revisados.
- `SESSION_COOKIE_SECURE` y `CSRF_COOKIE_SECURE` se activan cuando `DEBUG=False`.
- `SECURE_PROXY_SSL_HEADER` permite reconocer HTTPS detrás de un proxy inverso configurado correctamente.
- WhiteNoise sirve los archivos estáticos recolectados.
- `MEDIA_ROOT` requiere almacenamiento persistente en despliegues donde se suban archivos.
- Las credenciales publicadas en commits anteriores deben considerarse comprometidas y rotarse.

### Demo de GitHub Pages

`demo/` no contiene `SECRET_KEY`, `DATABASE_URL` ni tokens y no realiza solicitudes al backend. Su estado se guarda localmente en el navegador.

### Auditoría

`historial.RegistroHistorico` almacena fecha, entidad, objeto afectado, tipo de evento, descripción, usuario, criticidad y datos del cambio en `JSONField`.

## Stack

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

`requirements.txt` define las versiones instalables del proyecto.

## Versionado

El repositorio no publica tags Git actualmente. Si se empiezan a publicar releases, se recomienda utilizar SemVer (`MAJOR.MINOR.PATCH`).

## Datos de demostración del backend

```bash
python manage.py cargar_demo
```

El comando es idempotente y crea usuarios por rol, propietarios, pacientes, servicios, inventario y citas de ejemplo.

Usuario de demostración:

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

En Windows puede usarse `copy .env.example .env`.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SECRET_KEY` | Clave secreta de Django |
| `DEBUG` | Debe ser `False` en producción |
| `ALLOWED_HOSTS` | Hosts permitidos separados por coma |
| `CSRF_TRUSTED_ORIGINS` | Orígenes HTTPS confiables |
| `DATABASE_URL` | URL de conexión a la base de datos |

## Archivos estáticos y media

```bash
python manage.py collectstatic --noinput
```

Los estáticos se recopilan en `staticfiles/`. Los archivos subidos por usuarios utilizan `MEDIA_ROOT`.

## Despliegue

La aplicación no depende de un proveedor específico. Puede ejecutarse en una VM, contenedor o plataforma compatible con Python y PostgreSQL.

```bash
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
gunicorn veteriaria.wsgi:application --bind 0.0.0.0:${PORT:-8000}
```

`./build.sh` también puede utilizarse para instalar dependencias, aplicar migraciones y recolectar estáticos.

## GitHub Pages

`.github/workflows/pages-demo.yml` publica sólo el contenido de `demo/`. La demo funciona de forma independiente al proceso WSGI.

## Validación

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py test
```

`.github/workflows/demo-checks.yml` ejecuta estas comprobaciones sobre PostgreSQL 16.

## Estructura principal

```text
agenda/       citas y disponibilidad
caja/         gestión financiera
clinica/      atención clínica
cuentas/      usuarios y autenticación
dashboard/    panel principal
demo/         demo estática de GitHub Pages
gestion/      gestión general
historial/    auditoría y trazabilidad
hospital/     componentes hospitalarios
inventario/   insumos y stock
login/        acceso
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

Los documentos históricos de análisis o despliegue pueden reflejar decisiones anteriores. Para el estado actual del proyecto deben consultarse primero `settings.py`, `requirements.txt`, las migraciones y el código.
