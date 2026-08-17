# VetSantaSofia

Sistema de gestión veterinaria desarrollado con Django 5.2.7. Integra autenticación por RUT, pacientes, agenda, atención clínica, inventario, servicios, caja y trazabilidad.

## Demo visual

La siguiente demo se renderiza directamente en GitHub con capturas versionadas en el repositorio.

### Vista principal

[![Vista principal de VetSantaSofia](---evidencia/2.png)](---evidencia/2.png)

### Flujo del sistema

[![Vista de módulos de VetSantaSofia](---evidencia/3.png)](---evidencia/3.png)

> Esta es una demo visual. Los formularios, autenticación, base de datos y operaciones de negocio requieren ejecutar la aplicación Django.

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

El esquema de datos se administra con migraciones de Django:

```bash
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py showmigrations
```

No se deben modificar nombres de modelos, campos o relaciones sin una migración explícita y una necesidad funcional comprobada.

## Autenticación y roles

El proyecto utiliza `cuentas.CustomUser` como `AUTH_USER_MODEL`. El identificador de acceso es el RUT y el backend personalizado normaliza su formato antes de autenticar.

Roles definidos actualmente:

| Rol | Uso |
| --- | --- |
| Administración | Gestión general y acceso administrativo |
| Veterinario | Atención clínica y agenda |
| Recepción | Gestión operativa y agendamiento |

La aplicación mantiene además el backend estándar de Django como respaldo de autenticación.

## Seguridad

La configuración de producción está diseñada para no almacenar secretos en el código fuente.

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` y `DATABASE_URL` se obtienen mediante variables de entorno.
- `.env` está excluido por `.gitignore`; `.env.example` contiene sólo placeholders.
- `DEBUG` debe ser `False` fuera de desarrollo.
- Django mantiene protección CSRF mediante `CsrfViewMiddleware`.
- La autenticación usa el sistema de hashing de contraseñas de Django; no se guardan contraseñas en texto plano.
- El acceso a datos de la aplicación utiliza el ORM de Django en los flujos revisados.
- `SESSION_COOKIE_SECURE` y `CSRF_COOKIE_SECURE` se activan cuando `DEBUG=False`.
- `SECURE_PROXY_SSL_HEADER` permite reconocer HTTPS cuando la aplicación se encuentra detrás de un proxy inverso correctamente configurado.
- WhiteNoise sirve únicamente los archivos estáticos recolectados; los archivos de usuario continúan bajo `MEDIA_ROOT` y requieren una estrategia de persistencia apropiada para el entorno elegido.
- Cualquier credencial que haya sido publicada en commits anteriores debe considerarse comprometida y rotarse.

### Auditoría y trazabilidad

`historial.RegistroHistorico` funciona como registro central de auditoría. Está diseñado como un historial append-only a nivel de aplicación y almacena:

- fecha del evento;
- entidad y objeto afectado;
- tipo de evento;
- descripción;
- usuario responsable;
- criticidad;
- datos estructurados del cambio en `JSONField`.

Este registro complementa los campos de trazabilidad rápida que existen en entidades como pacientes, servicios e inventario.

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

El repositorio actualmente **no publica tags Git**, por lo que no se debe inferir una versión de release únicamente desde nombres históricos escritos en documentos.

Existe un `-----DEPLOYMENT/CHANGELOG.md` heredado que describe un esquema SemVer y menciona una versión `1.0.0`, mientras que el README antiguo mencionaba `v1.1` para el módulo de agenda. Esa documentación no está sincronizada con tags de Git y debe considerarse historial documental, no una fuente autoritativa de releases.

Para futuros releases se recomienda:

```text
MAJOR.MINOR.PATCH
```

- `MAJOR`: cambios incompatibles o migraciones disruptivas.
- `MINOR`: funcionalidades compatibles hacia atrás.
- `PATCH`: correcciones y mantenimiento.

Convención sugerida para tags:

```bash
git tag -a v1.0.0 -m "VetSantaSofia 1.0.0"
git push origin v1.0.0
```

Y para commits:

```text
feat: nueva funcionalidad
fix: corrección
docs: documentación
test: pruebas
refactor: refactorización
security: endurecimiento de seguridad
chore: mantenimiento
```

## Datos demo

El comando de carga es idempotente:

```bash
python manage.py cargar_demo
```

Puede ejecutarse varias veces sin duplicar sus registros de demostración. Crea datos ficticios para usuarios por rol, propietarios, pacientes, servicios, inventario y citas.

Usuario navegable de demostración:

- RUT: `22222222-2`
- Contraseña: `DemoVet2026!`
- Rol: Veterinario

Los datos creados por este comando no corresponden a personas ni animales reales.

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

En Windows puede usar:

```powershell
copy .env.example .env
```

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SECRET_KEY` | Clave secreta de Django |
| `DEBUG` | Debe ser `False` en producción |
| `ALLOWED_HOSTS` | Hosts permitidos separados por coma |
| `CSRF_TRUSTED_ORIGINS` | Orígenes HTTPS confiables |
| `DATABASE_URL` | URL de conexión a la base de datos |

Ejemplo sin credenciales reales:

```env
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=example.com,www.example.com
CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

## Archivos estáticos y media

WhiteNoise se encuentra inmediatamente después de `SecurityMiddleware` y sirve los archivos generados por:

```bash
python manage.py collectstatic --noinput
```

Los estáticos se recopilan en `staticfiles/`. El contenido subido por usuarios utiliza `MEDIA_ROOT`; en despliegues efímeros se debe montar almacenamiento persistente o conectar un servicio externo para media.

## Despliegue portable

La aplicación no depende de un proveedor concreto. Puede ejecutarse en una VM, un contenedor o una plataforma que admita Python y PostgreSQL.

### Preparación

```bash
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
```

También puede utilizar el script existente:

```bash
./build.sh
```

### Arranque

Instancia con datos demo:

```bash
python manage.py cargar_demo
gunicorn veteriaria.wsgi:application --bind 0.0.0.0:${PORT:-8000}
```

Instancia normal:

```bash
gunicorn veteriaria.wsgi:application --bind 0.0.0.0:${PORT:-8000}
```

El entorno debe proporcionar variables de entorno, una base persistente, un puerto HTTP y HTTPS mediante proxy o balanceador en producción.

## Validación y pruebas

Comandos de validación del proyecto:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py test
```

El repositorio incluye `.github/workflows/demo-checks.yml` para ejecutar estas comprobaciones sobre PostgreSQL 16. La existencia del workflow no equivale por sí sola a una ejecución exitosa; revise el estado de GitHub Actions antes de considerar validado un commit.

Pruebas mínimas incorporadas para la preparación de la demo:

- acceso a la página de inicio/login;
- inicio de sesión del usuario demo;
- ejecución repetida de `cargar_demo` sin duplicar los registros que administra el comando.

## Estructura principal

```text
agenda/       citas y disponibilidad
caja/         gestión financiera
clinica/      atención clínica
cuentas/      usuarios y autenticación
dashboard/    panel principal
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
# Servidor local
python manage.py runserver

# Comprobación de configuración
python manage.py check

# Migraciones
python manage.py showmigrations
python manage.py migrate

# Tests
python manage.py test

# Demo idempotente
python manage.py cargar_demo

# Estáticos
python manage.py collectstatic --noinput

# Shell Django
python manage.py shell
```

## Estado de la documentación

Este README documenta la configuración actual preparada para despliegue portable. Los documentos históricos ubicados en carpetas de análisis o deployment pueden reflejar decisiones anteriores y no deben prevalecer sobre `settings.py`, `requirements.txt`, las migraciones y el código actual.
