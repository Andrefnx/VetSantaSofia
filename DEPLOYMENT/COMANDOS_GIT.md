# 🚀 COMANDOS GIT PARA DEPLOYMENT

## Copiar y Pegar en PowerShell

```powershell
# Ir al directorio del proyecto
cd C:\Users\Andrea\Documents\GitHub\VetSantaSofia

# Ver estado actual
git status

# Agregar todos los archivos
git add .

# Commit con mensaje descriptivo
git commit -m "🚀 Configuración completa para deployment en Render

Archivos creados/actualizados:
- settings_production.py: Django settings para producción con seguridad completa
- requirements.txt: Agregadas dependencias (gunicorn, psycopg2-binary, whitenoise, dj-database-url)
- runtime.txt: Python 3.13.1
- build.sh: Script de build automatizado mejorado
- .gitignore: Archivo completo para evitar subir archivos sensibles
- .env.example: Template de variables de entorno
- wsgi.py: Actualizado para usar settings_production
- verify_deployment.py: Script de verificación pre-deployment

Documentación creada:
- DEPLOYMENT/GUIA_RENDER_DEPLOYMENT.md: Guía paso a paso completa
- DEPLOYMENT/QUICK_REFERENCE_RENDER.md: Referencia rápida
- DEPLOYMENT/MEDIA_FILES_PRODUCTION.md: Gestión de archivos media
- DEPLOYMENT/RESUMEN_PREPARACION.md: Resumen de preparación
- DEPLOYMENT/COMANDOS_GIT.md: Este archivo

Configuraciones de seguridad implementadas:
- SECRET_KEY desde variable de entorno
- DEBUG=False en producción
- HTTPS forzado
- Cookies seguras
- HSTS habilitado
- CSRF protections
- XSS protections

Estado: ✅ VERIFICADO Y LISTO PARA DEPLOYMENT"

# Push a GitHub
git push origin main

# Ver el log del último commit
git log -1
```

---

## 🔍 Verificar antes de Push

```powershell
# Verificar que no hay archivos sensibles
git status

# Ver qué archivos se van a subir
git diff --cached --name-only

# Verificar .gitignore está funcionando
git check-ignore -v .env
git check-ignore -v db.sqlite3
git check-ignore -v __pycache__

# Si alguno de estos archivos aparece, NO hacer push
```

---

## ⚠️ Si cometiste un error

### Deshacer el último commit (ANTES de push)
```powershell
# Deshacer commit pero mantener cambios
git reset --soft HEAD~1

# Ver cambios
git status

# Volver a hacer commit correctamente
git add .
git commit -m "Tu mensaje correcto"
```

### Si ya hiciste push con archivos sensibles
```powershell
# NUNCA uses git reset en commits públicos
# En su lugar, crea un nuevo commit removiendo el archivo

# Remover archivo del tracking
git rm --cached archivo_sensible

# Commit del cambio
git commit -m "Removed sensitive file"
git push origin main

# Cambiar credenciales comprometidas inmediatamente!
```

---

## 📋 Checklist Pre-Push

- [ ] Ejecutado `python verify_deployment.py` → ✅ PASADO
- [ ] Revisado que .env NO está en staging
- [ ] Revisado que db.sqlite3 NO está en staging  
- [ ] Revisado que __pycache__/ NO está en staging
- [ ] Revisado que staticfiles/ NO está en staging
- [ ] Verificado que settings.py (local) está en staging (OK)
- [ ] Verificado que settings_production.py está en staging (OK)
- [ ] Mensaje de commit es descriptivo

---

## 🎯 Después del Push

### Ver el repositorio en GitHub
```powershell
# Abrir en navegador (si tienes GitHub CLI)
gh repo view --web

# O manualmente ir a:
# https://github.com/TU_USUARIO/VetSantaSofia
```

### Verificar en GitHub
1. ✅ Archivo requirements.txt visible
2. ✅ Archivo runtime.txt visible
3. ✅ Archivo build.sh visible
4. ✅ Carpeta DEPLOYMENT/ con documentación
5. ❌ Archivo .env NO visible
6. ❌ Archivo db.sqlite3 NO visible

---

## 🚀 Siguiente Paso

**Ir a Render:**
1. https://dashboard.render.com
2. Seguir [GUIA_RENDER_DEPLOYMENT.md](GUIA_RENDER_DEPLOYMENT.md)

---

*Última actualización: Diciembre 17, 2025*
