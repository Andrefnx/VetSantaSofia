#!/bin/bash

################################################################################
# SCRIPT DE BACKUP AUTOMÁTICO - VET SANTA SOFÍA
#
# Uso: ./backup.sh
# Cron: 0 2 * * * /home/vetsantasofia/backup.sh
#
################################################################################

# Variables
BACKUP_DIR="/home/vetsantasofia/backups"
APP_DIR="/home/vetsantasofia/VetSantaSofia"
DB_NAME="vetsantasofia"
DB_USER="vetsantasofia"
DATE=$(date +%Y%m%d_%H%M%S)
DATE_DIR=$(date +%Y%m%d)
LOG_FILE="$BACKUP_DIR/backup.log"

# Colores para terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Crear directorios si no existen
mkdir -p "$BACKUP_DIR/databases/$DATE_DIR"
mkdir -p "$BACKUP_DIR/media/$DATE_DIR"
mkdir -p "$BACKUP_DIR/logs"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función para manejar errores
error_exit() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Función para éxito
success() {
    echo -e "${GREEN}[OK] $1${NC}" | tee -a "$LOG_FILE"
}

log "===== INICIANDO BACKUP ====="

# ============================================
# 1. BACKUP DE BASE DE DATOS
# ============================================

log "Iniciando backup de base de datos..."

# Backup con rol de usuario
BACKUP_FILE="$BACKUP_DIR/databases/$DATE_DIR/vetsantasofia_$DATE.sql.gz"

if pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE" 2>/dev/null; then
    success "Backup de BD completado: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    error_exit "No se pudo hacer backup de BD"
fi

# ============================================
# 2. BACKUP DE ARCHIVOS MEDIA
# ============================================

log "Iniciando backup de archivos media..."

MEDIA_BACKUP="$BACKUP_DIR/media/$DATE_DIR/media_$DATE.tar.gz"

if [ -d "$APP_DIR/media" ]; then
    if tar -czf "$MEDIA_BACKUP" -C "$APP_DIR" media 2>/dev/null; then
        success "Backup de media completado: $(du -h "$MEDIA_BACKUP" | cut -f1)"
    else
        log "Advertencia: No se pudo hacer backup de media"
    fi
else
    log "Advertencia: Directorio media no existe"
fi

# ============================================
# 3. BACKUP DE CODIGO (Opcional)
# ============================================

log "Iniciando backup de código..."

CODE_BACKUP="$BACKUP_DIR/code_$DATE.tar.gz"

if tar -czf "$CODE_BACKUP" \
    --exclude='venv' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='staticfiles' \
    -C /home/vetsantasofia VetSantaSofia 2>/dev/null; then
    success "Backup de código completado: $(du -h "$CODE_BACKUP" | cut -f1)"
else
    log "Advertencia: No se pudo hacer backup de código"
fi

# ============================================
# 4. LIMPIEZA DE BACKUPS ANTIGUOS
# ============================================

log "Limpiando backups antiguos..."

# Mantener últimos 7 días de backups
DAYS_TO_KEEP=7

find "$BACKUP_DIR/databases" -type d -mtime +$DAYS_TO_KEEP -exec rm -rf {} + 2>/dev/null
find "$BACKUP_DIR/media" -type d -mtime +$DAYS_TO_KEEP -exec rm -rf {} + 2>/dev/null
find "$BACKUP_DIR" -name "code_*.tar.gz" -mtime +$DAYS_TO_KEEP -delete 2>/dev/null

success "Limpieza completada"

# ============================================
# 5. ESTADÍSTICAS
# ============================================

log "===== ESTADÍSTICAS DE BACKUP ====="
log "Base de datos: $(du -sh "$BACKUP_DIR/databases" | cut -f1)"
log "Media: $(du -sh "$BACKUP_DIR/media" 2>/dev/null | cut -f1 || echo '0KB')"
log "Total: $(du -sh "$BACKUP_DIR" | cut -f1)"

# ============================================
# 6. VERIFICACIÓN
# ============================================

log "Verificando integridad..."

if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    success "Archivo BD íntegro"
else
    error_exit "Archivo BD corrupto!"
fi

# ============================================
# 7. NOTIFICACIÓN (Opcional)
# ============================================

# Si hay un email configurado, enviar notificación
if [ ! -z "$BACKUP_EMAIL" ]; then
    echo "Backup completado. Bases de datos: $(du -sh "$BACKUP_DIR/databases" | cut -f1)" | \
    mail -s "✓ Backup VetSantaSofia completado" "$BACKUP_EMAIL"
fi

log "===== BACKUP COMPLETADO EXITOSAMENTE ====="
