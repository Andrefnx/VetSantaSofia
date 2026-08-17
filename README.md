# VetSantaSofia

Sistema de gestión veterinaria desarrollado con Django 5.2.7. Incluye autenticación por RUT, gestión clínica, pacientes, agenda, inventario, servicios y caja.

## Demo visual

Una vista rápida del sistema directamente desde GitHub. Las imágenes corresponden a capturas versionadas en este repositorio y no requieren desplegar la aplicación.

### Vista principal

[![Vista principal de VetSantaSofia](---evidencia/2.png)](---evidencia/2.png)

### Flujo del sistema

[![Vista de módulos de VetSantaSofia](---evidencia/3.png)](---evidencia/3.png)

> La demo del README es visual. Para probar formularios, autenticación, base de datos y flujos interactivos es necesario ejecutar o desplegar la aplicación Django.

## Módulos

- Dashboard y autenticación por RUT.
- Pacientes y propietarios.
- Agenda y disponibilidad veterinaria.
- Clínica e historial.
- Inventario.
- Servicios.
- Caja.
- Administración con Jazzmin.

## Stack

- Python 3.12 recomendado.
- Django 5.2.7.
- PostgreSQL en despliegues persistentes.
- SQLite disponible como fallback de desarrollo local.
- Gunicorn como servidor WSGI.
- WhiteNoise para archivos estáticos.
- JavaScript existente del proyecto.

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

En Windows puede usar `copy .env.example .env`.

Para desarrollo local puede dejar `DATABASE_URL` sin definir y Django utilizará SQLite. Para un entorno persistente use PostgreSQL.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SECRET_KEY` | Clave secreta de Django. Debe generarse fuera del repositorio. |
| `DEBUG` | `False` en producción. |
| `ALLOWED_HOSTS` | Dominios/hosts permitidos separados por coma. |
| `CSRF_TRUSTED_ORIGINS` | Orígenes HTTPS confiables separados por coma. |
| `DATABASE_URL` | URL de conexión. En producción se recomienda PostgreSQL. |

Ejemplo sin credenciales reales:

```env
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=example.com,www.example.com
CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

`.env` está ignorado por Git y no debe versionarse. Cualquier credencial publicada anteriormente debe considerarse comprometida y rotarse.

## Datos demo

El comando de carga es idempotente:

```bash
python manage.py cargar_demo
```

Puede ejecutarse varias veces sin duplicar sus registros. Crea datos completamente ficticios para usuarios por rol, propietarios, pacientes, servicios, inventario y citas.

Usuario navegable de demostración:

- RUT: `22222222-2`
- Contraseña: `DemoVet2026!`
- Rol: Veterinario

También se crean usuarios ficticios de administración y recepción para comprobar los roles.

## Validaciones

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py test
```

El repositorio incluye un workflow de GitHub Actions que ejecuta estas comprobaciones con PostgreSQL 16.

## Despliegue

La aplicación no depende de un proveedor específico. Puede desplegarse en una VM, contenedor o plataforma que permita ejecutar Python y conectarse a PostgreSQL.

### Preparación

Configure las variables de entorno anteriores y ejecute:

```bash
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
```

El script incluido automatiza instalación, estáticos y migraciones:

```bash
./build.sh
```

### Inicio del servicio

Para una instancia pública con datos demo:

```bash
python manage.py cargar_demo
gunicorn veteriaria.wsgi:application --bind 0.0.0.0:${PORT:-8000}
```

Para una instancia sin datos demo:

```bash
gunicorn veteriaria.wsgi:application --bind 0.0.0.0:${PORT:-8000}
```

### Requisitos de infraestructura

Cualquier plataforma elegida debe proporcionar:

1. Python 3.12 o compatible.
2. Variables de entorno persistentes.
3. Una base PostgreSQL accesible mediante `DATABASE_URL`.
4. Un puerto HTTP expuesto al proceso Gunicorn.
5. HTTPS en producción.

No se necesita un servidor separado para los archivos estáticos de esta demo: WhiteNoise sirve el contenido generado por `collectstatic`.

## Estructura principal

```text
agenda/       citas y disponibilidad
caja/         gestión financiera
clinica/      atención clínica
cuentas/      usuarios y autenticación
dashboard/    panel principal
historial/    auditoría y trazabilidad
inventario/   insumos y stock
pacientes/    propietarios y pacientes
servicios/    catálogo de servicios
static/       archivos estáticos
templates/    plantillas globales
veteriaria/   configuración del proyecto
```

## Seguridad

No se deben versionar archivos `.env`, claves secretas ni credenciales de bases de datos. `DEBUG` debe permanecer desactivado en producción. Los datos generados por `cargar_demo` son ficticios y están destinados únicamente a demostración y pruebas.
