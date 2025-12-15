# Migración de SQLite a PostgreSQL

## 📋 Requisitos Previos

- PostgreSQL 12+ instalado y ejecutándose
- Python 3.8+
- pip con las dependencias del proyecto
- Backup de la base de datos SQLite actual (`db.sqlite3`)

## 🔧 Paso 1: Instalar Dependencias de PostgreSQL

```bash
# Instalar psycopg2 (driver de PostgreSQL para Django)
pip install psycopg2-binary

# O si tienes problemas, instala la versión sin binarios
pip install psycopg2
```

## 🗄️ Paso 2: Crear Base de Datos PostgreSQL

### En Windows (usando psql):

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Dentro de psql:
CREATE DATABASE vetsantasofia;
CREATE USER vetsantasofia WITH PASSWORD 'tu_contraseña_segura';
ALTER ROLE vetsantasofia SET client_encoding TO 'utf8';
ALTER ROLE vetsantasofia SET default_transaction_isolation TO 'read committed';
ALTER ROLE vetsantasofia SET default_transaction_deferrable TO on;
ALTER ROLE vetsantasofia SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE vetsantasofia TO vetsantasofia;
\q
```

## ⚙️ Paso 3: Configurar Django para PostgreSQL

### Actualizar `veteriaria/settings.py`:

```python
# Cambiar esta sección:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# A esto:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'vetsantasofia',
        'USER': 'vetsantasofia',
        'PASSWORD': 'tu_contraseña_segura',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### (Opcional) Usar variables de entorno:

```python
import os
from decouple import config

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', 'vetsantasofia'),
        'USER': config('DB_USER', 'vetsantasofia'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', 'localhost'),
        'PORT': config('DB_PORT', '5432'),
    }
}
```

**Instalar decouple:**
```bash
pip install python-decouple
```

**Crear `.env`:**
```
DB_NAME=vetsantasofia
DB_USER=vetsantasofia
DB_PASSWORD=tu_contraseña_segura
DB_HOST=localhost
DB_PORT=5432
SECRET_KEY=tu_secret_key_aqui
DEBUG=False
```

## 📥 Paso 4: Migrar Datos desde SQLite

### Opción A: Usando `dumpdata` y `loaddata` (Recomendado)

```bash
# 1. Crear backup de SQLite (por si acaso)
copy db.sqlite3 db.sqlite3.backup

# 2. Cambiar a PostgreSQL en settings.py

# 3. Crear las tablas vacías en PostgreSQL
python manage.py migrate

# 4. Exportar datos de SQLite
# Primero, cambiar temporalmente a SQLite en settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3.backup',
    }
}

python manage.py dumpdata > data_backup.json

# 5. Cambiar de nuevo a PostgreSQL

# 6. Limpiar las tablas (si es necesario)
python manage.py flush --no-input

# 7. Cargar datos
python manage.py loaddata data_backup.json
```

### Opción B: Usando script Python (Para más control)

Crear archivo `migrate_to_postgres.py`:

```python
#!/usr/bin/env python
"""
Script para migrar datos de SQLite a PostgreSQL
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from django.core.management import call_command
import json

print("🔄 Exportando datos de SQLite...")
call_command('dumpdata', stdout=open('migration_data.json', 'w'))

print("✅ Datos exportados a migration_data.json")
print("\n📝 Ahora sigue estos pasos:")
print("1. Actualiza settings.py para usar PostgreSQL")
print("2. Ejecuta: python manage.py migrate")
print("3. Ejecuta: python manage.py loaddata migration_data.json")
print("4. Verifica los datos con: python manage.py shell")
```

Ejecutar:
```bash
python migrate_to_postgres.py
```

## ✅ Paso 5: Verificar Migración

```bash
# Acceder a la shell de Django
python manage.py shell

# Verificar datos
from cuentas.models import Usuario
print(f"Usuarios: {Usuario.objects.count()}")

from clinica.models import Paciente
print(f"Pacientes: {Paciente.objects.count()}")

# Ver todas las tablas
from django.db import connection
connection.ensure_connection()
print(connection.introspection.table_names())
```

## 🔐 Paso 6: Actualizar Configuración de Seguridad

En `veteriaria/settings.py`:

```python
# En producción
DEBUG = False
ALLOWED_HOSTS = ['tu_dominio.com', 'www.tu_dominio.com']

# Para desarrollo
DEBUG = os.getenv('DEBUG', 'True') == 'True'
```

## 🗑️ Paso 7: Limpiar (Opcional)

Una vez verificado que todo funciona:

```bash
# Guardar backup final
copy db.sqlite3 db.sqlite3.final_backup

# Opcional: eliminar el archivo SQLite
del db.sqlite3
```

## 🐛 Solución de Problemas

### Error: "could not connect to server"
```bash
# Verificar que PostgreSQL esté corriendo
# Windows: revisar Services (postgresql)
# Linux: sudo systemctl status postgresql
```

### Error: "FATAL: Ident authentication failed"
- Cambiar en `pg_hba.conf`:
```
local   all             all                                     md5
```

### Error: "relation does not exist"
```bash
python manage.py migrate --run-syncdb
```

### Datos no se cargan correctamente
```bash
# Verificar que los IDs de relaciones sean válidos
python manage.py shell
# Ejecutar queries de verificación
```

## 📊 Checklist de Verificación

- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos creada en PostgreSQL
- [ ] Usuario de BD creado con permisos
- [ ] `settings.py` actualizado
- [ ] Dependencias instaladas (psycopg2)
- [ ] Datos exportados de SQLite
- [ ] Migraciones aplicadas (`migrate`)
- [ ] Datos cargados en PostgreSQL
- [ ] Datos verificados
- [ ] Backup de SQLite guardado
- [ ] Tests pasando con PostgreSQL
