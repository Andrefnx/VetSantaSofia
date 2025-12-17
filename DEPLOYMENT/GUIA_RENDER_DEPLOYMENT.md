# 🚀 Guía Completa de Deployment en Render

Esta guía te llevará paso a paso para desplegar tu aplicación VetSantaSofia en Render.com

## 📋 Pre-requisitos

- [x] Cuenta en [Render.com](https://render.com) (Plan Free disponible)
- [x] Repositorio Git (GitHub, GitLab o Bitbucket)
- [x] PostgreSQL preparado
- [x] Archivos de configuración listos

---

## 📁 Archivos Necesarios (Ya Creados)

✅ `runtime.txt` - Especifica Python 3.13.1  
✅ `requirements.txt` - Todas las dependencias  
✅ `build.sh` - Script de build automatizado  
✅ `veteriaria/settings_production.py` - Settings para producción  
✅ `.env.example` - Template de variables de entorno  

---

## 🔧 Paso 1: Preparar el Repositorio Git

### 1.1 Asegurar que .gitignore está correcto

Verifica que tu `.gitignore` incluya:

```gitignore
# Python
*.pyc
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
db.sqlite3
*.sqlite3

# Django
*.log
local_settings.py
staticfiles/
media/

# Entorno
.env
venv/
env/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Sistema
.DS_Store
Thumbs.db
```

### 1.2 Commit y Push

```bash
git add .
git commit -m "🚀 Preparado para deployment en Render"
git push origin main
```

---

## 🗄️ Paso 2: Crear Base de Datos PostgreSQL en Render

### 2.1 Crear PostgreSQL Database

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click en **"New +"** → **"PostgreSQL"**
3. Configuración:
   - **Name**: `veteriaria-db`
   - **Database**: `veterinaria_db`
   - **User**: `veterinaria_user`
   - **Region**: Oregon (US West) o el más cercano
   - **PostgreSQL Version**: 16 (o la más reciente)
   - **Plan**: Free (o el que prefieras)

4. Click en **"Create Database"**

### 2.2 Guardar Credenciales

⚠️ **IMPORTANTE**: Render te mostrará estas credenciales (guárdalas):

- **Internal Database URL**: Para conectar desde tu Web Service
- **External Database URL**: Para conectar desde tu máquina local
- Hostname
- Port
- Database
- Username
- Password

---

## 🌐 Paso 3: Crear Web Service en Render

### 3.1 Crear Web Service

1. En Render Dashboard, click **"New +"** → **"Web Service"**
2. Conecta tu repositorio Git
3. Configuración básica:
   - **Name**: `veteriaria-app`
   - **Region**: Same as database (Oregon US West)
   - **Branch**: `main`
   - **Root Directory**: (dejar vacío)
   - **Runtime**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn veteriaria.wsgi:application`

### 3.2 Configuración Avanzada

En **"Advanced"** configura:

- **Instance Type**: Free (o el que prefieras)
- **Auto-Deploy**: Yes (deployment automático en cada push)

---

## 🔐 Paso 4: Configurar Variables de Entorno

En la sección **"Environment Variables"** de tu Web Service, agrega:

### Variables Obligatorias

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `SECRET_KEY` | (genera uno nuevo) | Django secret key |
| `DEBUG` | `False` | Modo debug desactivado |
| `ALLOWED_HOSTS` | `veteriaria-app.onrender.com` | Tu URL de Render |
| `DATABASE_URL` | (Internal Database URL) | URL de tu PostgreSQL |
| `DJANGO_SETTINGS_MODULE` | `veteriaria.settings_production` | Settings de producción |

### Generar SECRET_KEY

Ejecuta en tu terminal local:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Variables Opcionales

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `CUSTOM_DOMAIN` | `www.tudominio.com` | Si tienes dominio propio |
| `EMAIL_HOST` | `smtp.gmail.com` | Para envío de emails |
| `EMAIL_PORT` | `587` | Puerto SMTP |
| `EMAIL_HOST_USER` | `tu-email@gmail.com` | Usuario email |
| `EMAIL_HOST_PASSWORD` | `tu-app-password` | Password email |
| `DJANGO_LOG_LEVEL` | `INFO` | Nivel de logs |

---

## 🚀 Paso 5: Deploy

### 5.1 Iniciar Deployment

1. Click en **"Create Web Service"**
2. Render comenzará a:
   - ✓ Clonar tu repositorio
   - ✓ Instalar dependencias
   - ✓ Ejecutar `build.sh`
   - ✓ Recolectar archivos estáticos
   - ✓ Aplicar migraciones
   - ✓ Iniciar servidor con Gunicorn

### 5.2 Monitorear el Deployment

Puedes ver los logs en tiempo real:
- Click en **"Logs"** en el menú lateral
- Verifica que no hay errores

### 5.3 Verificar Deployment Exitoso

Deberías ver en los logs:
```
✅ Build completado exitosamente!
Starting service...
Server is running
```

---

## 👤 Paso 6: Crear Superusuario

### 6.1 Usando Shell de Render

1. En tu Web Service, ve a **"Shell"**
2. Ejecuta:

```bash
python manage.py createsuperuser
```

3. Ingresa:
   - RUT del usuario
   - Email
   - Contraseña

---

## ✅ Paso 7: Verificación Post-Deployment

### 7.1 Probar la Aplicación

1. Abre tu URL: `https://veteriaria-app.onrender.com`
2. Verifica:
   - ✓ Página de login carga correctamente
   - ✓ CSS y JavaScript funcionan
   - ✓ Puedes iniciar sesión
   - ✓ Admin panel accesible en `/admin/`

### 7.2 Verificar Logs

```bash
# En Render Shell
python manage.py check --deploy
```

Este comando te mostrará advertencias de seguridad si las hay.

---

## 🔄 Actualizaciones Futuras

### Deployment Automático

Con Auto-Deploy activado, cada vez que hagas push a tu rama `main`:

```bash
git add .
git commit -m "Nueva funcionalidad"
git push origin main
```

Render automáticamente:
1. Detectará el cambio
2. Ejecutará `build.sh`
3. Aplicará migraciones
4. Reiniciará el servicio

### Deployment Manual

Si desactivaste Auto-Deploy:
1. Ve a tu Web Service en Render
2. Click en **"Manual Deploy"**
3. Selecciona la rama
4. Click en **"Deploy"**

---

## 🐛 Troubleshooting

### Error: "SECRET_KEY not configured"

**Solución**: Asegúrate de que la variable `SECRET_KEY` está configurada en Environment Variables.

### Error: Database connection failed

**Solución**: 
1. Verifica que `DATABASE_URL` tiene la **Internal Database URL** correcta
2. Asegúrate de que la base de datos está en estado "Available"

### Error: Static files not loading

**Solución**:
1. Verifica que `build.sh` se ejecutó correctamente
2. Revisa logs de `collectstatic`
3. Asegura que Whitenoise está en MIDDLEWARE

### Error: Module not found

**Solución**: Asegúrate de que todas las dependencias están en `requirements.txt`

### Logs detallados

```bash
# En Render Shell
tail -f /var/log/render.log
```

---

## 📊 Monitoreo y Mantenimiento

### Logs

- **Acceder a logs**: Dashboard → Tu servicio → Logs
- **Ver errores**: Filtrar por "ERROR" o "CRITICAL"

### Backups de Base de Datos

Render Free tier NO incluye backups automáticos. Para backups:

```bash
# Desde tu máquina local con External Database URL
pg_dump -Fc --no-acl --no-owner -h [host] -U [user] [database] > backup.dump
```

### Métricas

- **CPU/Memory Usage**: Disponible en Dashboard
- **Request Time**: Ver en logs
- **Uptime**: Render muestra el estado

---

## 🔒 Seguridad Post-Deployment

### Checklist de Seguridad

- [ ] `DEBUG = False` en producción
- [ ] `SECRET_KEY` segura y única
- [ ] HTTPS habilitado (automático en Render)
- [ ] `ALLOWED_HOSTS` configurado correctamente
- [ ] Variables sensibles en Environment Variables
- [ ] Backups de base de datos configurados
- [ ] Monitoring de errores activo

### Configurar Dominio Personalizado (Opcional)

1. En tu Web Service, ve a **"Settings"**
2. Sección **"Custom Domain"**
3. Click **"Add Custom Domain"**
4. Ingresa tu dominio: `www.veterinaria.cl`
5. Sigue las instrucciones para configurar DNS

---

## 📚 Recursos Adicionales

- [Render Documentation](https://render.com/docs)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Whitenoise Documentation](http://whitenoise.evans.io/)

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs en Render
2. Consulta la documentación oficial
3. Verifica las variables de entorno
4. Contacta soporte de Render (muy responsive)

---

## 🎉 ¡Listo!

Tu aplicación VetSantaSofia ahora está en producción con:
- ✅ PostgreSQL database
- ✅ Archivos estáticos servidos con Whitenoise
- ✅ HTTPS automático
- ✅ Deployment automático
- ✅ Configuraciones de seguridad
- ✅ Sistema de auditoría funcionando

**URL de tu aplicación**: `https://veteriaria-app.onrender.com`

---

*Última actualización: Diciembre 2025*
