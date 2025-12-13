#!/bin/bash

################################################################################
# HEALTH CHECK - VET SANTA SOFÍA
#
# Verifica que todos los servicios estén funcionando correctamente
# Uso: ./health_check.sh
#
################################################################################

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Contadores
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Función para reportar
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((CHECKS_WARNING++))
}

echo -e "${BLUE}===== HEALTH CHECK - VET SANTA SOFÍA =====${NC}\n"

################################################################################
# SISTEMA
################################################################################

echo -e "${BLUE}📊 SISTEMA${NC}"

# Uptime
if [ -f /proc/uptime ]; then
    UPTIME=$(cat /proc/uptime | awk '{print int($1/86400)}')
    check_pass "Sistema activo: $UPTIME días"
else
    check_fail "No se pudo obtener uptime"
fi

# CPU
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
if (( $(echo "$CPU_USAGE < 80" | bc -l) )); then
    check_pass "CPU: ${CPU_USAGE}%"
else
    check_warn "CPU alta: ${CPU_USAGE}%"
fi

# RAM
RAM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
RAM_USED=$(free -m | awk '/^Mem:/{print $3}')
RAM_PERCENT=$((RAM_USED * 100 / RAM_TOTAL))
if [ $RAM_PERCENT -lt 80 ]; then
    check_pass "RAM: ${RAM_USED}MB/${RAM_TOTAL}MB (${RAM_PERCENT}%)"
else
    check_warn "RAM alta: ${RAM_PERCENT}%"
fi

# DISCO
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    check_pass "Disco: ${DISK_USAGE}%"
else
    check_fail "Disco lleno: ${DISK_USAGE}%"
fi

echo ""

################################################################################
# SERVICIOS
################################################################################

echo -e "${BLUE}🔧 SERVICIOS${NC}"

# PostgreSQL
if systemctl is-active --quiet postgresql; then
    check_pass "PostgreSQL activo"
else
    check_fail "PostgreSQL inactivo"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    check_pass "Nginx activo"
else
    check_fail "Nginx inactivo"
fi

# Gunicorn
if systemctl is-active --quiet gunicorn_vetsantasofia; then
    check_pass "Gunicorn activo"
else
    check_fail "Gunicorn inactivo"
fi

echo ""

################################################################################
# BASE DE DATOS
################################################################################

echo -e "${BLUE}🗄️  BASE DE DATOS${NC}"

# Conexión a BD
if sudo -u postgres psql -d vetsantasofia -c "SELECT 1" >/dev/null 2>&1; then
    check_pass "Conexión a BD"
    
    # Tamaño BD
    DB_SIZE=$(sudo -u postgres psql -d vetsantasofia -t -c "SELECT pg_size_pretty(pg_database_size('vetsantasofia'))")
    check_pass "Tamaño BD: $DB_SIZE"
    
    # Número de conexiones
    DB_CONNECTIONS=$(sudo -u postgres psql -d vetsantasofia -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='vetsantasofia'")
    check_pass "Conexiones activas: $DB_CONNECTIONS"
else
    check_fail "No se puede conectar a BD"
fi

echo ""

################################################################################
# WEB
################################################################################

echo -e "${BLUE}🌐 WEB${NC}"

# HTTP Status
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://vetsantasofia.com/ 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    check_pass "HTTPS Sitio: OK (HTTP 200)"
elif [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    check_warn "Redirección: HTTP $HTTP_CODE"
else
    check_fail "Sitio inaccesible: HTTP $HTTP_CODE"
fi

# Admin Panel
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://vetsantasofia.com/admin/ 2>/dev/null || echo "000")

if [ "$ADMIN_CODE" = "200" ] || [ "$ADMIN_CODE" = "302" ]; then
    check_pass "Admin Panel: OK"
else
    check_fail "Admin Panel inaccesible: HTTP $ADMIN_CODE"
fi

# API Health (si existe)
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://vetsantasofia.com/api/health/ 2>/dev/null || echo "000")

if [ "$API_CODE" = "200" ]; then
    check_pass "API Health: OK"
elif [ "$API_CODE" != "000" ]; then
    check_warn "API Status: HTTP $API_CODE"
fi

echo ""

################################################################################
# SSL/CERTIFICADO
################################################################################

echo -e "${BLUE}🔒 SSL/CERTIFICADO${NC}"

# Verificar certificado
CERT_PATH="/etc/letsencrypt/live/vetsantasofia.com/fullchain.pem"

if [ -f "$CERT_PATH" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
    DAYS_LEFT=$(( ($(date -d "$CERT_EXPIRY" +%s) - $(date +%s)) / 86400 ))
    
    if [ $DAYS_LEFT -gt 30 ]; then
        check_pass "Certificado SSL: Válido ($DAYS_LEFT días)"
    elif [ $DAYS_LEFT -gt 0 ]; then
        check_warn "Certificado SSL: Vence en $DAYS_LEFT días"
    else
        check_fail "Certificado SSL: EXPIRADO"
    fi
else
    check_fail "Certificado SSL no encontrado"
fi

echo ""

################################################################################
# LOGS
################################################################################

echo -e "${BLUE}📝 LOGS${NC}"

# Errores en Nginx (últimas 24 horas)
NGINX_ERRORS=$(grep -c "error" /var/log/nginx/error.log 2>/dev/null | tail -n 100 || echo "0")

if [ "$NGINX_ERRORS" = "0" ]; then
    check_pass "Nginx sin errores (últimas 24h)"
else
    check_warn "Errores en Nginx: $NGINX_ERRORS"
fi

# Errores en Gunicorn
if [ -f /var/log/gunicorn/error.log ]; then
    GUNICORN_ERRORS=$(tail -n 100 /var/log/gunicorn/error.log | grep -c "ERROR" || echo "0")
    if [ "$GUNICORN_ERRORS" = "0" ]; then
        check_pass "Gunicorn sin errores"
    else
        check_warn "Errores en Gunicorn: $GUNICORN_ERRORS"
    fi
fi

echo ""

################################################################################
# RESUMEN
################################################################################

TOTAL=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))

echo -e "${BLUE}===== RESUMEN =====${NC}"
echo -e "Checks pasados:  ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Warnings:        ${YELLOW}$CHECKS_WARNING${NC}"
echo -e "Fallos:          ${RED}$CHECKS_FAILED${NC}"
echo -e "Total:           $TOTAL"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ SISTEMA SALUDABLE${NC}"
    exit 0
else
    echo -e "${RED}✗ PROBLEMAS DETECTADOS${NC}"
    exit 1
fi
