# Quick Start - Resumen Ejecutivo

## 🚀 Migración Rápida a PostgreSQL (10 minutos)

```bash
# 1. Instalar driver
pip install psycopg2-binary

# 2. Crear BD en PostgreSQL
psql -U postgres
CREATE DATABASE vetsantasofia;
CREATE USER vetsantasofia WITH PASSWORD 'contraseña';
GRANT ALL PRIVILEGES ON DATABASE vetsantasofia TO vetsantasofia;
\q

# 3. Actualizar settings.py con credenciales PostgreSQL

# 4. Exportar datos
python manage.py dumpdata > backup.json

# 5. Migrar
python manage.py migrate
python manage.py loaddata backup.json

# 6. Verificar
python manage.py shell
from clinica.models import Paciente
print(Paciente.objects.count())
```

---

## 🌐 Despliegue Rápido en DigitalOcean (30 minutos)

```bash
# 1. Crear Droplet Ubuntu 22.04 (2GB RAM)

# 2. SSH y configurar
ssh root@IP
apt update && apt upgrade -y
apt install python3-pip python3-venv postgresql postgresql-contrib nginx git

# 3. Crear usuario
adduser vetsantasofia
usermod -aG sudo vetsantasofia
su - vetsantasofia

# 4. Clonar código
git clone https://github.com/tu_usuario/VetSantaSofia.git
cd VetSantaSofia
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Configurar .env
nano .env
# (Pegar variables de entorno)

# 6. Base de datos
sudo -u postgres psql
# (Crear BD como arriba)

# 7. Django
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput

# 8. Gunicorn
pip install gunicorn
gunicorn --bind 0.0.0.0:8000 veteriaria.wsgi:application

# 9. Crear servicio Gunicorn (ver documento 02)

# 10. Nginx
sudo nano /etc/nginx/sites-available/vetsantasofia
# (Pegar config de documento 02)
sudo ln -s /etc/nginx/sites-available/vetsantasofia /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# 11. SSL Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d tudominio.com

# 12. ¡Listo! Visita https://tudominio.com
```

---

## 📦 Crear Nueva Versión (15 minutos)

```bash
# 1. Actualizar versionamiento
# - Editar __init__.py con nueva versión
# - Actualizar CHANGELOG.md
# - Actualizar package.json si existe

# 2. Tests
python manage.py test

# 3. Commit y tag
git add .
git commit -m "Release v1.2.0"
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin main --tags

# 4. En servidor (sin downtime)
cd /home/vetsantasofia/VetSantaSofia
source venv/bin/activate
git pull origin main
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn_vetsantasofia

# ✅ ¡Actualizado!
```

---

## 📋 Estructura de Carpetas

```
DEPLOYMENT/
├── 01_MIGRACION_SQLITE_A_POSTGRESQL.md    ← Migrar BD
├── 02_DESPLIEGUE_A_PRODUCCION.md          ← Subir a web
├── 03_GESTION_VERSIONES_Y_ACTUALIZACIONES.md  ← Versiones
├── 04_QUICK_START.md                      ← Este archivo
├── templates/
│   ├── .env.example                       ← Plantilla de variables
│   ├── requirements.txt                   ← Dependencias
│   ├── gunicorn.service                   ← Servicio systemd
│   └── nginx.conf                         ← Config Nginx
├── scripts/
│   ├── backup.sh                          ← Backup automático
│   ├── deploy.sh                          ← Deploy automático
│   └── health_check.sh                    ← Verificar salud
└── CHANGELOG.md                           ← Histórico de cambios
```

---

## 🎯 Flujo de Trabajo Típico

### Desarrollo Local

```
1. Rama feature: git checkout -b feature/nueva-funcionalidad
2. Desarrollar y commitear cambios
3. Push a GitHub: git push origin feature/nueva-funcionalidad
4. Crear Pull Request
5. Code review y merge a develop
```

### Staging (Pre-producción)

```
1. Rama staging: git checkout -b staging
2. Merge desde develop
3. Tests en servidor de prueba
4. Verificar cambios
5. Si ok, preparar para release
```

### Producción

```
1. Rama release: git checkout -b release/v1.2.0
2. Actualizar versión y changelog
3. Merge a main
4. Crear tag de release
5. Deploy a servidor
6. Monitoreo
7. Merge back a develop
```

---

## 🔄 Flujo Git Recomendado

```
main (producción)
  ↓ tag v1.2.0
develop (preparación)
  ↓
  ├─ feature/nuevas-citas
  ├─ feature/reportes
  ├─ feature/alertas
  └─ bugfix/edad-incorrecta
```

**Comandos típicos:**

```bash
# Crear feature
git checkout develop
git pull origin develop
git checkout -b feature/nuevas-citas
# ... desarrollar ...
git commit -m "feat: agregar sistema de citas"
git push origin feature/nuevas-citas

# PR en GitHub, review, merge a develop

# Cuando lista para producción
git checkout develop
git pull
git checkout -b release/v1.2.0
# ... actualizar versión ...
git commit -m "Release v1.2.0"
git push origin release/v1.2.0
# ... merge a main en GitHub ...
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

---

## 🔒 Variables de Entorno Críticas

```env
# ⚠️ NUNCA commitear .env

# Django
SECRET_KEY=cambiar_a_valor_seguro_min_50_caracteres
DEBUG=False
ALLOWED_HOSTS=tudominio.com,www.tudominio.com

# PostgreSQL
DB_PASSWORD=contraseña_muy_segura_min_16_caracteres

# Email (si usas Gmail)
EMAIL_HOST_PASSWORD=contraseña_app_no_la_real

# AWS S3 (si usas)
AWS_SECRET_ACCESS_KEY=clave_secreta_de_aws
```

**Generar SECRET_KEY seguro:**

```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

---

## 🆘 Errores Comunes

| Error | Solución |
|-------|----------|
| `ModuleNotFoundError: No module named 'psycopg2'` | `pip install psycopg2-binary` |
| `FATAL: Ident authentication failed` | Cambiar `pg_hba.conf` a `md5` |
| `502 Bad Gateway` | Verificar: `sudo systemctl status gunicorn_*` |
| `Static files not found` | Ejecutar: `python manage.py collectstatic` |
| `Permission denied on /home/vetsantasofia/` | `sudo chown -R vetsantasofia:vetsantasofia /home/vetsantasofia/` |
| `Database does not exist` | Crear BD: `createdb vetsantasofia` |
| `SSL certificate error` | Renovar: `sudo certbot renew --force-renewal` |

---

## 📞 Soporte y Recursos

- **Django Docs**: https://docs.djangoproject.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Nginx Docs**: https://nginx.org/en/docs/
- **Gunicorn Docs**: https://gunicorn.org/
- **Let's Encrypt**: https://letsencrypt.org/

---

## ✅ Pre-Launch Checklist

- [ ] Base de datos en PostgreSQL funcionando
- [ ] Todas las migraciones aplicadas
- [ ] Archivos estáticos recolectados
- [ ] Email configurado y probado
- [ ] Backups automatizados configurados
- [ ] SSL/HTTPS funcionando
- [ ] Tests pasando al 100%
- [ ] Logs monitoreados
- [ ] Usuarios creados
- [ ] Dominio apuntando correctamente
- [ ] Servidor monitoreado (CPU, RAM, disco)
- [ ] Health checks funcionando
- [ ] Documentación actualizada
- [ ] Usuarios notificados

---

## 📊 Monitoreo Post-Launch

**Primeras 24 horas:**
- Ver logs cada 2 horas
- Verificar CPU/RAM cada 4 horas
- Chequear usuario activos en admin

**Primera semana:**
- Revisar errores en logs
- Validar performance de queries
- Hacer backup manual diario

**Mensual:**
- Revisar uso de disco
- Validar certificados SSL
- Hacer stress test
- Revisar seguridad

---

## 🎓 Siguientes Pasos

1. Leer documento **01** para migración de BD
2. Leer documento **02** para despliegue a web
3. Leer documento **03** para gestión de versiones
4. Seguir este **Quick Start** como referencia rápida
5. Configurar monitoreo y backups
6. ¡Lanzar a producción! 🚀
