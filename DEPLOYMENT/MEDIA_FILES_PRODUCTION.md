# 📁 Gestión de Archivos Media en Producción

## ⚠️ Problema: Archivos Efímeros en Render

Render utiliza **almacenamiento efímero**, lo que significa:

- ✅ Archivos estáticos (CSS, JS) → OK con Whitenoise
- ❌ Archivos media (uploads) → **SE PIERDEN** al reiniciar/deploy

### ¿Por qué se pierden?

Cada vez que:
- Haces un nuevo deploy
- Render reinicia tu servicio
- Actualizas tu aplicación

Los archivos subidos por usuarios (fotos de pacientes, documentos, etc.) **se borran**.

---

## 🎯 Soluciones Recomendadas

### Opción 1: Amazon S3 (Recomendada) 🌟

**Ventajas:**
- ✅ Permanente y confiable
- ✅ CDN global rápido
- ✅ Económico ($0.023/GB)
- ✅ Integración Django fácil

**Implementación:**

#### 1. Instalar dependencias
```bash
pip install boto3 django-storages
```

Agregar a [requirements.txt](requirements.txt):
```
boto3==1.35.93
django-storages==1.14.6
```

#### 2. Configurar en settings_production.py

```python
# Agregar a INSTALLED_APPS
INSTALLED_APPS = [
    # ... apps existentes
    'storages',
]

# Configuración de S3
if os.getenv('USE_S3') == 'True':
    # AWS Settings
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    
    # S3 Settings
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_FILE_OVERWRITE = False
    
    # Media files configuration
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
else:
    # Fallback local (desarrollo)
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'
```

#### 3. Configurar en AWS

1. Crear cuenta en [AWS](https://aws.amazon.com)
2. Ir a S3 Console
3. Crear bucket:
   - Nombre: `veterinaria-media-files`
   - Region: `us-east-1` (o la más cercana)
   - Block public access: OFF (para que sean accesibles)
4. Configurar CORS:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

5. Crear usuario IAM con permisos S3
6. Guardar Access Key ID y Secret Access Key

#### 4. Variables de entorno en Render

```env
USE_S3=True
AWS_ACCESS_KEY_ID=tu-access-key-id
AWS_SECRET_ACCESS_KEY=tu-secret-access-key
AWS_STORAGE_BUCKET_NAME=veterinaria-media-files
AWS_S3_REGION_NAME=us-east-1
```

---

### Opción 2: Cloudinary (Alternativa)

**Ventajas:**
- ✅ Plan gratuito generoso (25GB)
- ✅ Optimización automática de imágenes
- ✅ Transformaciones on-the-fly

**Implementación:**

```bash
pip install cloudinary django-cloudinary-storage
```

```python
# settings_production.py
INSTALLED_APPS = [
    # ...
    'cloudinary_storage',
    'cloudinary',
]

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': os.getenv('CLOUDINARY_API_KEY'),
    'API_SECRET': os.getenv('CLOUDINARY_API_SECRET'),
}

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
```

---

### Opción 3: Render Disk (Persistent Disk)

**Ventajas:**
- ✅ Nativo de Render
- ✅ Simple de configurar

**Desventajas:**
- ❌ Solo en planes pagos (desde $7/mes + $0.25/GB)
- ❌ No CDN
- ❌ Backups manuales

**Implementación:**

1. En Render Dashboard → Add Disk
2. Mount path: `/opt/render/project/src/media`
3. En settings_production.py (ya está configurado):

```python
MEDIA_URL = '/media/'
MEDIA_ROOT = '/opt/render/project/src/media'
```

---

## 🔄 Migrar Archivos Existentes a S3

Si ya tienes archivos en tu sistema local que quieres subir a S3:

```python
# script_migrate_to_s3.py
import os
import boto3
from pathlib import Path

def upload_directory_to_s3(local_path, bucket_name, s3_prefix=''):
    s3 = boto3.client('s3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
    
    for root, dirs, files in os.walk(local_path):
        for file in files:
            local_file = os.path.join(root, file)
            relative_path = os.path.relpath(local_file, local_path)
            s3_path = os.path.join(s3_prefix, relative_path).replace('\\', '/')
            
            print(f"Uploading {local_file} to {s3_path}")
            s3.upload_file(local_file, bucket_name, s3_path)

if __name__ == '__main__':
    upload_directory_to_s3('media/', 'veterinaria-media-files', 'media/')
```

---

## 📊 Comparación de Opciones

| Característica | S3 | Cloudinary | Render Disk |
|----------------|----|-----------|-----------
| **Costo Inicial** | Free tier 5GB | Free 25GB | $7/mes + $0.25/GB |
| **Permanente** | ✅ | ✅ | ✅ |
| **CDN** | ✅ | ✅ | ❌ |
| **Backups** | Automático | Automático | Manual |
| **Velocidad** | Excelente | Excelente | Buena |
| **Complejidad** | Media | Baja | Baja |
| **Transformaciones** | ❌ | ✅ | ❌ |

---

## 💡 Recomendación

Para VetSantaSofia, recomiendo **Amazon S3** porque:

1. ✅ **Económico**: Plan gratuito generoso para empezar
2. ✅ **Escalable**: Crece con tu aplicación
3. ✅ **Confiable**: 99.99% uptime
4. ✅ **Estándar**: Fácil de encontrar ayuda/docs
5. ✅ **Profesional**: Usado por empresas grandes

---

## 🚀 Implementación Rápida S3

### 1. Actualizar requirements.txt
```bash
echo "boto3==1.35.93" >> requirements.txt
echo "django-storages==1.14.6" >> requirements.txt
```

### 2. Aplicar configuración

Ya preparé la configuración en `settings_production.py`, solo necesitas:

1. Crear bucket en S3
2. Agregar variables de entorno en Render
3. Redeploy

### 3. Testing

```python
# En Render Shell
python manage.py shell

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

# Test de subida
path = default_storage.save('test.txt', ContentFile(b'Hello S3!'))
url = default_storage.url(path)
print(f"File uploaded: {url}")
```

---

## 🔒 Seguridad

### Archivos Privados vs Públicos

```python
# Para archivos que deben ser privados (ej: documentos médicos)
AWS_DEFAULT_ACL = 'private'

# Para archivos públicos (ej: fotos de perfil)
AWS_DEFAULT_ACL = 'public-read'
```

### Generar URLs firmadas (archivos privados)

```python
from django.core.files.storage import default_storage

url = default_storage.url('ruta/archivo.pdf', expire=3600)  # 1 hora
```

---

## 📞 Ayuda y Referencias

- [Django-Storages Docs](https://django-storages.readthedocs.io/)
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [Cloudinary Django](https://cloudinary.com/documentation/django_integration)
- [Render Disk Docs](https://render.com/docs/disks)

---

*Última actualización: Diciembre 2025*
