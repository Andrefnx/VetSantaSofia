#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

# Recolectar archivos estáticos limpiando la carpeta anterior
python manage.py collectstatic --no-input --clear

# Aplicar migraciones
python manage.py migrate
