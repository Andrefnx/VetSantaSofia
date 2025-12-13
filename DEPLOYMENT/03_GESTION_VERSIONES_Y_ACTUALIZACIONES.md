# Gestión de Versiones y Actualizaciones

## 📌 Versionado Semántico

### Formato: `MAYOR.MENOR.PARCHE`

- **MAYOR**: Cambios incompatibles con versiones anteriores
- **MENOR**: Nuevas funcionalidades compatibles
- **PARCHE**: Correcciones de bugs

**Ejemplo:** `v1.2.3`

---

## 📋 Proceso de Creación de Versión

### 1. Crear rama de release

```bash
git checkout -b release/v1.2.0
```

### 2. Actualizar números de versión

**`veteriaria/__init__.py`:**

```python
__version__ = '1.2.0'
VERSION = '1.2.0'
```

**`package.json` (si usas frontend):**

```json
{
  "version": "1.2.0"
}
```

### 3. Actualizar `CHANGELOG.md`

```markdown
# Changelog

## [1.2.0] - 2024-01-15

### Added
- Nueva funcionalidad de reportes
- Sistema de alertas automáticas
- Mejoras en interfaz de hospitalizaciones

### Changed
- Actualizado Django a 4.2
- Mejorado rendimiento de BD en 30%
- Rediseño de dashboard

### Fixed
- Corregido bug en cálculo de edad
- Validación de teléfono mejorada
- Error de timezone en diferentes regiones

### Security
- Actualizado certificado SSL
- Mejoradas headers de seguridad

## [1.1.0] - 2023-12-01

### Added
- Sistema de citas
- Gestión de pacientes
```

### 4. Commit y push

```bash
git add .
git commit -m "Release v1.2.0"
git push origin release/v1.2.0
```

### 5. Crear Pull Request

En GitHub:
- Ir a Pull Requests
- Comparar `release/v1.2.0` con `main`
- Descripción: cambios y mejoras
- Asignar revisores
- Merge cuando sea aprobado

### 6. Crear Tag de release

```bash
git checkout main
git pull origin main

# Crear tag anotado
git tag -a v1.2.0 -m "Release version 1.2.0"

# Subir tag
git push origin v1.2.0

# Ver todos los tags
git tag -l
git show v1.2.0
```

---

## 🔄 Actualizar en Producción

### Método 1: Actualización sin downtime (Recomendado)

```bash
# 1. SSH al servidor
ssh vetsantasofia@tudominio.com

# 2. Entrar al directorio
cd /home/vetsantasofia/VetSantaSofia

# 3. Activar entorno
source venv/bin/activate

# 4. Traer cambios (sin aplicar aún)
git fetch origin main

# 5. Revisar diferencias
git diff main origin/main

# 6. Actualizar código
git pull origin main

# 7. Instalar nuevas dependencias (si las hay)
pip install -r requirements.txt

# 8. Aplicar migraciones (sin parar servidor)
python manage.py migrate --nothreaded

# 9. Recolectar archivos estáticos
python manage.py collectstatic --noinput

# 10. Recargar Gunicorn
sudo systemctl restart gunicorn_vetsantasofia

# 11. Verificar estado
sudo systemctl status gunicorn_vetsantasofia
```

### Método 2: Blue-Green Deployment (Para cambios mayores)

```bash
# 1. Crear segundo directorio (verde)
cp -r /home/vetsantasofia/VetSantaSofia /home/vetsantasofia/VetSantaSofia_v2

# 2. Actualizar en directorio nuevo
cd /home/vetsantasofia/VetSantaSofia_v2
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# 3. Cambiar nginx a nuevo directorio
sudo nano /etc/nginx/sites-available/vetsantasofia
# Cambiar rutas a _v2

# 4. Recargar nginx
sudo nginx -t
sudo systemctl reload nginx

# 5. Si hay problemas, volver atrás
sudo systemctl reload nginx  # (cambiar rutas de vuelta)
```

---

## 🧪 Testing Antes de Release

### 1. Tests unitarios

```bash
python manage.py test
```

### 2. Tests de integración

```bash
python manage.py test --verbosity=2

# Test específico
python manage.py test cuentas.tests.UsuarioTestCase
```

### 3. Validar migración

```bash
# En BD temporal
python manage.py migrate --plan  # Ver qué se va a ejecutar
python manage.py migrate         # Ejecutar
```

### 4. Validar static files

```bash
python manage.py collectstatic --dry-run --clear --noinput
```

### 5. Validar settings en producción

```bash
python manage.py check --deploy
```

### 6. Tests de rendimiento

```bash
# Usar Django Debug Toolbar (solo desarrollo)
pip install django-debug-toolbar

# En producción, usar herramientas como:
# - New Relic
# - Sentry (para errores)
# - Datadog
```

---

## 🔍 Monitoreo Post-Release

### 1. Verificar logs

```bash
# Gunicorn
sudo journalctl -u gunicorn_vetsantasofia -f -n 50

# Nginx
sudo tail -f /var/log/nginx/error.log /var/log/nginx/access.log

# Django
tail -f /home/vetsantasofia/VetSantaSofia/logs/django.log
```

### 2. Verificar performance

```bash
# Uso de recursos
htop

# Conexiones DB
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Espacio en disco
df -h
```

### 3. Health check

```bash
curl -I https://tudominio.com/admin/

# Debe retornar 200 OK

# Verificar endpoint de salud
curl https://tudominio.com/api/health/
```

---

## 📦 Gestión de Dependencias

### Actualizar dependencias seguras

```bash
# Ver outdated
pip list --outdated

# Actualizar archivo requirements.txt
pip install --upgrade -r requirements.txt

# Guardar cambios
pip freeze > requirements.txt

# Commit
git add requirements.txt
git commit -m "deps: actualizar dependencias"
```

### Importante: NO actualizar sin testing

```bash
# 1. Crear rama
git checkout -b deps/update-packages

# 2. Actualizar
pip install --upgrade Django

# 3. Ejecutar tests
python manage.py test

# 4. Si todo ok, commit y PR
```

---

## 🚨 Rollback de Versión

### Si algo sale mal

```bash
# 1. Ver histórico de cambios
git log --oneline -10

# 2. Volver a commit anterior
git revert <commit_hash>
# O
git reset --hard <commit_hash>

# 3. Push cambios
git push origin main

# 4. En servidor
cd /home/vetsantasofia/VetSantaSofia
git pull origin main

# 5. Si hay cambios en BD, ver migraciones
python manage.py migrate --list | grep "[ ]"  # Sin ejecutar

# 6. Recargar
sudo systemctl restart gunicorn_vetsantasofia
```

---

## 📝 Template para Release Notes

**Crear archivo: `RELEASE_v1.2.0.md`**

```markdown
# Vet Santa Sofía - Versión 1.2.0

## 📅 Fecha: 15 de Enero de 2024

## ✨ Novedades

- [x] Nuevo sistema de reportes mensuales
- [x] Alertas automáticas para pacientes hospitalizados
- [x] Dashboard mejorado con gráficos en tiempo real

## 🔧 Mejoras

- Rendimiento de BD aumentado 30%
- Interfaz de hospitalizaciones rediseñada
- Búsqueda de pacientes optimizada

## 🐛 Bugs Corregidos

- Cálculo incorrecto de edad en pacientes
- Error de zona horaria en reportes
- Validación de teléfono mejorada

## 🔐 Seguridad

- SSL certificado renovado
- Headers de seguridad mejorados
- Validación de CSRF reforzada

## 📊 Estadísticas

- 45 commits
- 12 archivos modificados
- 2,500 líneas de código
- 98% cobertura de tests

## 🙏 Agradecimientos

Gracias a todo el equipo por sus contribuciones.

## 📥 Instalación

```bash
git pull origin main
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
```
```

---

## 🎯 Checklist de Release

- [ ] Código en rama de desarrollo funcionando
- [ ] Tests pasando al 100%
- [ ] Migraciones creadas y probadas
- [ ] Dependencies actualizadas
- [ ] CHANGELOG actualizado
- [ ] Versión incrementada
- [ ] Release notes creadas
- [ ] Tag Git creado
- [ ] PR creado y revisado
- [ ] Merge a main
- [ ] Tag pusheado
- [ ] Release creada en GitHub
- [ ] Tests en servidor staging
- [ ] Actualización en producción
- [ ] Health checks completados
- [ ] Usuarios notificados de cambios
- [ ] Logs monitoreados 24h
- [ ] Documentación actualizada

---

## 🔔 Notificación a usuarios

**Email template:**

```
Asunto: Vet Santa Sofía - Nueva versión 1.2.0 disponible

Estimados usuarios,

Nos complace anunciar la llegada de la versión 1.2.0 de Vet Santa Sofía.

🎉 Lo nuevo:
- Nuevo sistema de reportes
- Alertas automáticas mejoradas
- Dashboard redesñado

⏰ Actualización: 2024-01-15 a las 02:00 UTC
⏱️ Tiempo de inactividad estimado: 5 minutos

Si encuentran algún problema, contáctenos: soporte@vetsantasofia.com

¡Gracias por usar nuestro sistema!

Equipo Vet Santa Sofía
```

---

## 📊 Métricas a Rastrear

```python
# settings.py o nuevo archivo metrics.py
METRICS = {
    'version': '1.2.0',
    'release_date': '2024-01-15',
    'deployment_time_minutes': 10,
    'test_coverage': 98,
    'performance_improvement': 30,  # %
    'issues_resolved': 15,
    'new_features': 5,
}
```

---

## 🔗 Referencias Útiles

- [Semantic Versioning](https://semver.org/)
- [Django Release Notes](https://docs.djangoproject.com/en/stable/releases/)
- [Git Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
- [Best Practices de Deployment](https://docs.djangoproject.com/en/stable/howto/deployment/)
