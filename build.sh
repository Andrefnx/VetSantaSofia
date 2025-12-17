#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🔧 Instalando dependencias..."
pip install -r requirements.txt

echo "🗑️  Limpiando archivos estáticos antiguos..."
rm -rf staticfiles

echo "📦 Recolectando archivos estáticos..."
python manage.py collectstatic --no-input

echo "🔄 Aplicando migraciones de base de datos..."
python manage.py migrate

echo "✅ Build completado exitosamente!"
