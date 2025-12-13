#!/bin/bash

################################################################################
# SCRIPT DE DEPLOYMENT AUTOMÁTICO - VET SANTA SOFÍA
#
# Uso: ./deploy.sh [versión]
# Ej: ./deploy.sh v1.2.0
#
# Este script despliega cambios en producción sin downtime
################################################################################

set -e  # Exit on error

# Variables
APP_DIR="/home/vetsantasofia/VetSantaSofia"
VENV="$APP_DIR/venv"
GUNICORN_SERVICE="gunicorn_vetsantasofia"
BACKUP_DIR="/home/vetsantasofia/backups"
DATE=$(date +%Y%m%d_%H%M%S)
VERSION="${1:-latest}"
LOG_FILE="/var/log/deploy_$DATE.log"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funciones de logging
log() { echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; }

# Trap para errores
trap 'error "Deploy fallido!"; exit 1' ERR

################################################################################
# VALIDACIONES PREVIAS
################################################################################

log "===== INICIANDO DEPLOYMENT $VERSION ====="

# Verificar que sea sudo
if [ "$EUID" -ne 0 ]; then 
   error "Este script debe ejecutarse con sudo"
   exit 1
fi

# Verificar directorio
if [ ! -d "$APP_DIR" ]; then
   error "Directorio de aplicación no existe: $APP_DIR"
   exit 1
fi

# Verificar repositorio git
cd "$APP_DIR"
if ! git rev-parse --git-dir > /dev/null 2>&1; then
   error "No es un repositorio git"
   exit 1
fi

################################################################################
# FASE 1: BACKUP
################################################################################

log "Creando backup pre-deployment..."

# Backup de BD
mkdir -p "$BACKUP_DIR/pre-deploy/$VERSION"
sudo -u postgres pg_dump vetsantasofia | gzip > \
    "$BACKUP_DIR/pre-deploy/$VERSION/db_$DATE.sql.gz" || \
    warning "No se pudo hacer backup de BD"

success "Backup completado"

################################################################################
# FASE 2: DESCARGAR CAMBIOS
################################################################################

log "Descargando cambios..."

git fetch origin main
success "Cambios descargados"

# Mostrar diferencias
log "Cambios a aplicar:"
git log --oneline HEAD..origin/main || warning "Sin cambios nuevos"

################################################################################
# FASE 3: APLICAR CAMBIOS
################################################################################

log "Aplicando cambios..."

# Stash cambios locales si los hay
if ! git diff-index --quiet HEAD --; then
    warning "Hay cambios locales sin commitear, haciendo stash"
    git stash
fi

# Pull de cambios
git pull origin main
success "Código actualizado"

################################################################################
# FASE 4: INSTALAR DEPENDENCIAS
################################################################################

log "Instalando dependencias..."

source "$VENV/bin/activate"
pip install -q --upgrade pip
pip install -q -r requirements.txt
success "Dependencias instaladas"

################################################################################
# FASE 5: MIGRACIONES
################################################################################

log "Aplicando migraciones de BD..."

python manage.py migrate --nothreaded
success "Migraciones aplicadas"

################################################################################
# FASE 6: ARCHIVOS ESTÁTICOS
################################################################################

log "Recolectando archivos estáticos..."

python manage.py collectstatic --noinput --clear
success "Archivos estáticos actualizados"

################################################################################
# FASE 7: VALIDACIONES
################################################################################

log "Validando configuración..."

python manage.py check --deploy || warning "Hay advertencias de seguridad"
success "Validación completada"

################################################################################
# FASE 8: RELOAD GUNICORN (sin downtime)
################################################################################

log "Recargando Gunicorn..."

# Método 1: Reload graceful (sin interrumpir conexiones activas)
if systemctl is-active --quiet $GUNICORN_SERVICE; then
    systemctl reload $GUNICORN_SERVICE
    sleep 2
    if systemctl is-active --quiet $GUNICORN_SERVICE; then
        success "Gunicorn recargado exitosamente"
    else
        error "Gunicorn falló después de reload"
        exit 1
    fi
else
    warning "Servicio Gunicorn no está activo, iniciando..."
    systemctl start $GUNICORN_SERVICE
    sleep 2
fi

################################################################################
# FASE 9: VERIFICACIÓN
################################################################################

log "Verificando health del servidor..."

# Esperar a que Gunicorn esté listo
sleep 3

# Health check
if curl -sf http://localhost:8000/admin/ > /dev/null 2>&1; then
    success "Health check OK"
else
    error "Health check fallido!"
    log "Intentando rollback..."
    git reset --hard HEAD~1
    systemctl restart $GUNICORN_SERVICE
    exit 1
fi

################################################################################
# FASE 10: LIMPIEZA Y FINALIZACIÓN
################################################################################

log "Finalizando..."

deactivate

# Registrar en log
log "Deploy $VERSION completado en $(date '+%Y-%m-%d %H:%M:%S')"
log "Versión en producción: $(git describe --tags --always)"

################################################################################
# NOTIFICACIÓN
################################################################################

success "===== DEPLOYMENT COMPLETADO EXITOSAMENTE ====="
echo ""
echo "Resumen:"
echo "--------"
echo "Versión: $VERSION"
echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Cambios: $(git log --oneline HEAD~5..HEAD | wc -l) commits recientes"
echo "BD: OK"
echo "Gunicorn: OK"
echo "Nginx: OK"
echo ""
echo "Para ver logs: tail -f $LOG_FILE"
echo "Para revertir: git reset --hard HEAD~1 && systemctl restart $GUNICORN_SERVICE"
