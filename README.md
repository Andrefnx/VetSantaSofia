# VetSantaSofia

Sistema de gestión veterinaria en Django 5.2.7 con PostgreSQL, preparado para una demo pública en Render sin cambiar los flujos funcionales existentes.

## Módulos

- Dashboard y autenticación por RUT.
- Pacientes y propietarios.
- Agenda y disponibilidad veterinaria.
- Clínica e historial.
- Inventario.
- Servicios.
- Caja.
- Administración con Jazzmin.

## Requisitos

- Python 3.12 recomendado.
- Django 5.2.7.
- PostgreSQL para producción.

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

En Windows, copie `.env.example` a `.env` manualmente o use `copy .env.example .env`.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SECRET_KEY` | Clave de Django. Debe generarse fuera del repositorio. |
| `DEBUG` | `False` en Render. |
| `ALLOWED_HOSTS` | Hosts separados por coma. |
| `CSRF_TRUSTED_ORIGINS` | Orígenes HTTPS separados por coma. |
| `DATABASE_URL` | URL de conexión PostgreSQL. |

`.env` está ignorado por Git y no debe subirse. Las credenciales que hayan sido publicadas anteriormente deben rotarse.

## Datos demo

El comando es idempotente y puede ejecutarse más de una vez:

```bash
python manage.py cargar_demo
```

Crea datos completamente ficticios para los tres roles, propietarios, pacientes, servicios, inventario y citas.

Usuario público de demostración:

- RUT: `22222222-2`
- Contraseña: `DemoVet2026!`
- Rol: Veterinario

También se crean usuarios ficticios de administración y recepción para validar los roles, sin publicar sus accesos como cuentas de navegación.

## Validaciones

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py test
```

La rama de preparación de la demo incluye un workflow que ejecuta estas validaciones con PostgreSQL 16.

## Despliegue en Render

El archivo `render.yaml` define PostgreSQL y el servicio web. Render genera `SECRET_KEY`, inyecta `DATABASE_URL`, mantiene `DEBUG=False` y ejecuta Gunicorn.

El build ejecuta:

```bash
./build.sh
```

El servicio inicia con:

```bash
python manage.py cargar_demo && gunicorn veteriaria.wsgi:application --bind 0.0.0.0:$PORT
```

Para desplegar con Blueprint:

1. Suba o fusione esta rama en GitHub.
2. En Render, seleccione **New > Blueprint**.
3. Conecte `Andrefnx/VetSantaSofia`.
4. Seleccione la rama que contiene `render.yaml`.
5. Aplique el Blueprint.
6. Tras el primer deploy, abra la URL `onrender.com` asignada y use el usuario demo.

Si configura el servicio manualmente, use exactamente:

```text
Build Command: ./build.sh
Start Command: python manage.py cargar_demo && gunicorn veteriaria.wsgi:application --bind 0.0.0.0:$PORT
```

## Archivos estáticos

WhiteNoise sirve los archivos recolectados en `staticfiles/`. `collectstatic` se ejecuta durante el build y usa almacenamiento con manifest y compresión.

## Capturas

Capturas existentes del proyecto:

![Vista del sistema](---evidencia/2.png)

![Vista adicional](---evidencia/3.png)

## Estructura principal

```text
agenda/       citas y disponibilidad
caja/         gestión financiera
clinica/      atención clínica
cuentas/      usuarios y autenticación
 dashboard/   panel principal
historial/    auditoría y trazabilidad
inventario/   insumos y stock
pacientes/    propietarios y pacientes
servicios/    catálogo de servicios
static/       archivos estáticos
templates/    plantillas globales
veteriaria/   configuración del proyecto
```

## Seguridad

No se deben versionar `.env`, claves secretas ni credenciales de bases de datos. La demo usa únicamente datos ficticios. Para producción real, rote cualquier credencial que haya aparecido previamente en el historial del repositorio.
