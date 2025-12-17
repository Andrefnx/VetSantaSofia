# ⚡ Quick Reference - Render Deployment

## 🎯 Checklist Pre-Deployment

```
[ ] Repositorio Git actualizado y pusheado
[ ] .gitignore incluye archivos sensibles
[ ] requirements.txt con todas las dependencias
[ ] runtime.txt con versión de Python
[ ] build.sh con permisos de ejecución
[ ] settings_production.py configurado
[ ] wsgi.py apunta a settings_production
[ ] Cuenta en Render creada
```

## 🚀 Comandos Rápidos

### Generar SECRET_KEY
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Verificar configuración de deployment
```bash
python manage.py check --deploy --settings=veteriaria.settings_production
```

### Probar configuración localmente
```bash
# Configurar variables de entorno
export SECRET_KEY="tu-secret-key"
export DEBUG="False"
export DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Correr con settings de producción
python manage.py runserver --settings=veteriaria.settings_production
```

### Recolectar archivos estáticos localmente
```bash
python manage.py collectstatic --no-input --settings=veteriaria.settings_production
```

### Aplicar migraciones
```bash
python manage.py migrate --settings=veteriaria.settings_production
```

## 📋 Variables de Entorno Mínimas para Render

```env
# OBLIGATORIAS
SECRET_KEY=<genera-con-comando-arriba>
DEBUG=False
ALLOWED_HOSTS=tu-app.onrender.com
DATABASE_URL=<internal-database-url-from-render>
DJANGO_SETTINGS_MODULE=veteriaria.settings_production
```

## 🔧 Configuración Render Web Service

```yaml
Name: veteriaria-app
Environment: Python 3
Branch: main
Build Command: ./build.sh
Start Command: gunicorn veteriaria.wsgi:application
Auto-Deploy: Yes
Instance Type: Free (o superior)
```

## 📝 Notas Importantes

1. **DATABASE_URL**: Usar la "Internal Database URL" de PostgreSQL
2. **ALLOWED_HOSTS**: Incluir tu dominio de Render (.onrender.com)
3. **Migraciones**: Se aplican automáticamente en build.sh
4. **Static Files**: Se recolectan automáticamente en build.sh
5. **Logs**: Accesibles en tiempo real desde Dashboard

## 🐛 Comandos de Debug en Render Shell

```bash
# Ver variables de entorno
env | grep DJANGO
env | grep SECRET
env | grep DATABASE

# Verificar instalación de paquetes
pip list

# Ver configuración de Django
python manage.py diffsettings

# Probar conexión a DB
python manage.py dbshell

# Ver migraciones
python manage.py showmigrations

# Crear superusuario
python manage.py createsuperuser

# Verificar seguridad
python manage.py check --deploy
```

## 📊 Estructura de Archivos Clave

```
VetSantaSofia/
├── veteriaria/
│   ├── settings.py              # Desarrollo local
│   ├── settings_production.py  # Producción (USA ESTE)
│   └── wsgi.py                  # Apunta a settings_production
├── runtime.txt                  # python-3.13.1
├── requirements.txt             # Incluye gunicorn, psycopg2-binary
├── build.sh                     # Script de build
├── .env.example                 # Template de variables
└── DEPLOYMENT/
    └── GUIA_RENDER_DEPLOYMENT.md
```

## 🔄 Workflow de Actualización

```bash
# 1. Hacer cambios localmente
git add .
git commit -m "Nueva funcionalidad"

# 2. Push (trigger auto-deploy)
git push origin main

# 3. Monitorear en Render Dashboard → Logs
# 4. Verificar que deployment fue exitoso
```

## ⚠️ Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| SECRET_KEY not set | Falta variable de entorno | Agregar en Environment Variables |
| Database connection failed | URL incorrecta | Usar Internal Database URL |
| Static files 404 | collectstatic falló | Revisar logs de build.sh |
| ModuleNotFoundError | Falta en requirements.txt | Agregar dependencia |
| Bad Request (400) | ALLOWED_HOSTS incorrecto | Agregar dominio completo |
| CSRF verification failed | Falta en CSRF_TRUSTED_ORIGINS | Agregar en settings_production.py |

## 📱 Accesos Rápidos Post-Deployment

- **App**: https://tu-app.onrender.com
- **Admin**: https://tu-app.onrender.com/admin/
- **Dashboard**: https://dashboard.render.com
- **Logs**: Dashboard → Tu servicio → Logs
- **Shell**: Dashboard → Tu servicio → Shell
- **Métricas**: Dashboard → Tu servicio → Metrics

## 🎯 Testing Post-Deployment

```bash
# Test 1: Homepage accesible
curl https://tu-app.onrender.com

# Test 2: Admin accesible
curl https://tu-app.onrender.com/admin/

# Test 3: Static files cargando
curl https://tu-app.onrender.com/static/css/base.css

# Test 4: Health check (crear endpoint)
curl https://tu-app.onrender.com/health/
```

## 🔐 Security Headers Check

Después del deployment, verifica en:
- https://securityheaders.com
- https://observatory.mozilla.org

## 📞 Contacto Render Support

- **Email**: support@render.com
- **Status**: https://status.render.com
- **Docs**: https://render.com/docs
- **Community**: https://community.render.com

---

*Quick Reference v1.0 - Diciembre 2025*
