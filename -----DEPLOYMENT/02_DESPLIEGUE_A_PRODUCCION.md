# Guía Completa: Migrar Proyecto a Producción

## 📋 Tabla de Contenidos

1. [Preparación](#preparación)
2. [Hosting & Servidor](#hosting--servidor)
3. [Configuración de Base de Datos](#configuración-de-base-de-datos)
4. [Preparar Código](#preparar-código)
5. [Desplegar en Servidor](#desplegar-en-servidor)
6. [Configuración HTTPS](#configuración-https)
7. [Monitoreo & Mantenimiento](#monitoreo--mantenimiento)

---

## 🔧 Preparación

### 1. Crear fichero `.env` con variables de entorno

```env
# Django
SECRET_KEY=tu_secret_key_muy_largo_y_seguro_aqui
DEBUG=False
ALLOWED_HOSTS=tudominio.com,www.tudominio.com

# Base de Datos PostgreSQL
DB_NAME=vetsantasofia
DB_USER=vetsantasofia
DB_PASSWORD=contraseña_segura_aqui
DB_HOST=localhost
DB_PORT=5432

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu_email@gmail.com
EMAIL_HOST_PASSWORD=contraseña_app_aqui
EMAIL_USE_TLS=True

# AWS S3 (Opcional para archivos estáticos/media)
AWS_ACCESS_KEY_ID=tu_clave_aqui
AWS_SECRET_ACCESS_KEY=tu_secret_aqui
AWS_STORAGE_BUCKET_NAME=tu_bucket
AWS_S3_REGION_NAME=us-east-1

# Otras configuraciones
ENVIRONMENT=production
TIME_ZONE=America/Santiago
```

### 2. Actualizar `requirements.txt`

```bash
pip freeze > requirements.txt
```

**Debe incluir:**
```
Django==4.2.0
psycopg2-binary==2.9.0
gunicorn==21.0.0
whitenoise==6.5.0
python-decouple==3.8
django-cors-headers==4.2.0
Pillow==10.0.0
```

### 3. Crear `.gitignore` (si no existe)

```
# Environment
.env
.env.local
*.pyc
__pycache__/
*.egg-info/
dist/
build/

# Database
db.sqlite3
*.db

# Media y Static files
/media/
/staticfiles/

# IDE
.vscode/
.idea/
*.sublime-project

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db
```

---

## 🖥️ Hosting & Servidor

### Opciones Recomendadas:

1. **Heroku** (Más fácil para principiantes)
2. **PythonAnywhere** (Específico para Django)
3. **AWS EC2** (Más control, más complejo)
4. **DigitalOcean** (Balance entre facilidad y control)
5. **Linode** (Similar a DigitalOcean)

### Elegiremos DigitalOcean como ejemplo:

#### Paso 1: Crear Droplet

```bash
# Especificaciones recomendadas:
- OS: Ubuntu 20.04 o 22.04
- RAM: Mínimo 2GB
- Storage: Mínimo 20GB SSD
- Region: Cercana a usuarios
```

#### Paso 2: Configuración Inicial del Servidor

```bash
# SSH al servidor
ssh root@tu_ip_servidor

# Actualizar sistema
apt update && apt upgrade -y

# Instalar dependencias
apt install -y python3-pip python3-venv postgresql postgresql-contrib nginx git curl

# Crear usuario no-root
adduser vetsantasofia
usermod -aG sudo vetsantasofia
su - vetsantasofia
```

---

## 🗄️ Configuración de Base de Datos

```bash
# Conectar como root a PostgreSQL
sudo -u postgres psql

# Crear BD y usuario
CREATE DATABASE vetsantasofia;
CREATE USER vetsantasofia WITH PASSWORD 'contraseña_muy_segura';
ALTER ROLE vetsantasofia SET client_encoding TO 'utf8';
ALTER ROLE vetsantasofia SET default_transaction_isolation TO 'read committed';
ALTER ROLE vetsantasofia SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE vetsantasofia TO vetsantasofia;

# Salir
\q
```

---

## 📦 Preparar Código

### 1. Clonar o subir repositorio

```bash
cd /home/vetsantasofia
git clone https://github.com/tu_usuario/VetSantaSofia.git
cd VetSantaSofia
```

### 2. Crear entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

```bash
# Crear archivo .env
nano .env

# Pegar contenido (ver sección Preparación)
# Ctrl+O, Enter, Ctrl+X para guardar
```

### 4. Configurar Django

**settings.py:**

```python
import os
from decouple import config
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT'),
    }
}

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Email
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', cast=bool)

# Security (en producción)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_SECURITY_POLICY = {
        'default-src': ("'self'",),
    }
```

### 5. Preparar archivos estáticos

```bash
python manage.py collectstatic --noinput
```

### 6. Aplicar migraciones

```bash
python manage.py migrate
```

### 7. Crear superusuario

```bash
python manage.py createsuperuser
```

---

## 🚀 Desplegar en Servidor

### 1. Instalar y configurar Gunicorn

```bash
# Ya está en requirements.txt
pip install gunicorn

# Probar que funciona
gunicorn --bind 0.0.0.0:8000 veteriaria.wsgi:application
```

### 2. Crear servicio systemd para Gunicorn

```bash
sudo nano /etc/systemd/system/gunicorn_vetsantasofia.service
```

**Contenido:**

```ini
[Unit]
Description=gunicorn daemon for VetSantaSofia
After=network.target

[Service]
User=vetsantasofia
Group=www-data
WorkingDirectory=/home/vetsantasofia/VetSantaSofia
ExecStart=/home/vetsantasofia/VetSantaSofia/venv/bin/gunicorn \
          --workers 3 \
          --bind unix:/home/vetsantasofia/VetSantaSofia/gunicorn.sock \
          veteriaria.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar servicio
sudo systemctl daemon-reload
sudo systemctl start gunicorn_vetsantasofia
sudo systemctl enable gunicorn_vetsantasofia
```

### 3. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/vetsantasofia
```

**Contenido:**

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    # Redireccionar a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tudominio.com www.tudominio.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    
    # Seguridad SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Tamaño máximo de upload
    client_max_body_size 100M;

    location / {
        proxy_pass http://unix:/home/vetsantasofia/VetSantaSofia/gunicorn.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /home/vetsantasofia/VetSantaSofia/staticfiles/;
        expires 30d;
    }

    location /media/ {
        alias /home/vetsantasofia/VetSantaSofia/media/;
        expires 7d;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/vetsantasofia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 Configuración HTTPS

### Usar Let's Encrypt con Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y

# Generar certificado
sudo certbot certonly --nginx -d tudominio.com -d www.tudominio.com

# Auto-renovación
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar renovación
sudo certbot renew --dry-run
```

---

## 📊 Monitoreo & Mantenimiento

### 1. Ver logs

```bash
# Gunicorn
sudo journalctl -u gunicorn_vetsantasofia -f

# Nginx
sudo tail -f /var/log/nginx/error.log
```

### 2. Actualizar código

```bash
cd /home/vetsantasofia/VetSantaSofia
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn_vetsantasofia
```

### 3. Monitoreo de rendimiento

```bash
# Instalar herramientas
sudo apt install htop iotop

# Ver recursos
htop
```

### 4. Backup automático

**Script `/home/vetsantasofia/backup.sh`:**

```bash
#!/bin/bash

BACKUP_DIR="/home/vetsantasofia/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Crear directorio
mkdir -p $BACKUP_DIR

# Backup BD
pg_dump -U vetsantasofia vetsantasofia > $BACKUP_DIR/db_$DATE.sql

# Backup media
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /home/vetsantasofia/VetSantaSofia/media

# Limpiar backups antiguos (mantener 7 días)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completado: $DATE"
```

**Cron job:**

```bash
crontab -e

# Agregar:
0 2 * * * /home/vetsantasofia/backup.sh
```

---

## ✅ Checklist Final

- [ ] Repositorio clonado en servidor
- [ ] Entorno virtual creado y activado
- [ ] `.env` configurado con variables seguras
- [ ] Base de datos PostgreSQL creada
- [ ] Migraciones aplicadas
- [ ] Archivos estáticos recolectados
- [ ] Gunicorn configurado y ejecutándose
- [ ] Nginx configurado y ejecutándose
- [ ] SSL/HTTPS funcionando
- [ ] Dominio apuntando correctamente
- [ ] Email configurado
- [ ] Backups programados
- [ ] Logs monitoreados
- [ ] Sistema en producción ✅

---

## 🆘 Troubleshooting

### Error 502 Bad Gateway
```bash
# Verificar Gunicorn
sudo systemctl status gunicorn_vetsantasofia
sudo journalctl -u gunicorn_vetsantasofia -n 20
```

### Permiso denegado en media/static
```bash
sudo chown -R vetsantasofia:www-data /home/vetsantasofia/VetSantaSofia/media
sudo chown -R vetsantasofia:www-data /home/vetsantasofia/VetSantaSofia/staticfiles
sudo chmod -R 755 /home/vetsantasofia/VetSantaSofia/media
```

### Base de datos no conecta
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```
