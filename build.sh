#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

# Limpiar completamente la carpeta staticfiles
rm -rf staticfiles

# Recolectar archivos estáticos desde cero
python manage.py collectstatic --no-input

# Aplicar migraciones
python manage.py migrate
