#!/usr/bin/env python
"""
Script de verificación pre-deployment para Render
Ejecuta este script antes de hacer deploy para verificar que todo está listo
"""

import os
import sys
from pathlib import Path

# Colores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.ENDC}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.ENDC}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.ENDC}")

def print_header(msg):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{msg}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}\n")

def check_file_exists(file_path, description):
    """Verifica si un archivo existe"""
    if Path(file_path).exists():
        print_success(f"{description}: {file_path}")
        return True
    else:
        print_error(f"{description} NO ENCONTRADO: {file_path}")
        return False

def check_file_content(file_path, required_content, description):
    """Verifica si un archivo contiene cierto contenido"""
    if not Path(file_path).exists():
        print_error(f"{description}: Archivo no encontrado")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        # Intentar con latin-1 si utf-8 falla
        with open(file_path, 'r', encoding='latin-1') as f:
            content = f.read()
    
    for item in required_content:
        if item not in content:
            print_error(f"{description}: Falta '{item}'")
            return False
    
    print_success(description)
    return True

def main():
    print_header("🚀 VERIFICACIÓN PRE-DEPLOYMENT PARA RENDER")
    
    all_checks_passed = True
    base_dir = Path(__file__).resolve().parent
    
    # =========================================================================
    # 1. ARCHIVOS NECESARIOS
    # =========================================================================
    print_header("1. Verificando archivos necesarios")
    
    files_to_check = [
        ('runtime.txt', 'Runtime specification'),
        ('requirements.txt', 'Dependencies file'),
        ('build.sh', 'Build script'),
        ('veteriaria/settings_production.py', 'Production settings'),
        ('veteriaria/wsgi.py', 'WSGI configuration'),
        ('.env.example', 'Environment variables template'),
        ('.gitignore', 'Git ignore file'),
    ]
    
    for file_path, description in files_to_check:
        if not check_file_exists(file_path, description):
            all_checks_passed = False
    
    # =========================================================================
    # 2. CONTENIDO DE REQUIREMENTS.TXT
    # =========================================================================
    print_header("2. Verificando requirements.txt")
    
    required_packages = [
        ('Django', 'Django=='),
        ('gunicorn', 'gunicorn'),
        ('psycopg2-binary', 'psycopg2-binary'),
        ('whitenoise', 'whitenoise'),
        ('dj-database-url', 'dj-database-url'),
    ]
    
    try:
        with open('requirements.txt', 'r', encoding='utf-8') as f:
            requirements_content = f.read()
    except UnicodeDecodeError:
        with open('requirements.txt', 'r', encoding='latin-1') as f:
            requirements_content = f.read()
    
    all_packages_found = True
    for package_name, search_term in required_packages:
        if search_term.lower() in requirements_content.lower():
            print_success(f"Paquete: {package_name}")
        else:
            print_error(f"Paquete faltante: {package_name}")
            all_packages_found = False
    
    if not all_packages_found:
        all_checks_passed = False
    
    # =========================================================================
    # 3. RUNTIME.TXT
    # =========================================================================
    print_header("3. Verificando runtime.txt")
    
    if Path('runtime.txt').exists():
        with open('runtime.txt', 'r') as f:
            runtime = f.read().strip()
            if runtime.startswith('python-3'):
                print_success(f"Python version: {runtime}")
            else:
                print_error(f"Runtime inválido: {runtime}")
                all_checks_passed = False
    
    # =========================================================================
    # 4. BUILD.SH
    # =========================================================================
    print_header("4. Verificando build.sh")
    
    build_commands = [
        'pip install',
        'collectstatic',
        'migrate',
    ]
    
    if not check_file_content('build.sh', build_commands, 'Build script commands'):
        all_checks_passed = False
    
    # =========================================================================
    # 5. SETTINGS_PRODUCTION.PY
    # =========================================================================
    print_header("5. Verificando settings_production.py")
    
    settings_requirements = [
        ("SECRET_KEY", "os.getenv"),
        ("DEBUG", "os.getenv"),
        ("ALLOWED_HOSTS", "ALLOWED_HOSTS"),
        ("dj_database_url", "dj_database_url"),
        ("WhiteNoise", "WhiteNoiseMiddleware"),
        ("STATIC_ROOT", "STATIC_ROOT"),
        ("CSRF_TRUSTED_ORIGINS", "CSRF_TRUSTED_ORIGINS"),
    ]
    
    try:
        with open('veteriaria/settings_production.py', 'r', encoding='utf-8') as f:
            settings_content = f.read()
    except UnicodeDecodeError:
        with open('veteriaria/settings_production.py', 'r', encoding='latin-1') as f:
            settings_content = f.read()
    
    all_settings_found = True
    for setting_name, search_term in settings_requirements:
        if search_term in settings_content:
            print_success(f"Configuración: {setting_name}")
        else:
            print_error(f"Configuración faltante: {setting_name}")
            all_settings_found = False
    
    if not all_settings_found:
        all_checks_passed = False
    
    # Verificar que NO tenga credenciales hardcodeadas
    with open('veteriaria/settings_production.py', 'r', encoding='utf-8') as f:
        content = f.read()
        if 'SECRET_KEY = "django-insecure' in content:
            print_error("SECRET_KEY hardcodeada encontrada!")
            all_checks_passed = False
        else:
            print_success("No hay SECRET_KEY hardcodeada")
    
    # =========================================================================
    # 6. WSGI.PY
    # =========================================================================
    print_header("6. Verificando wsgi.py")
    
    if Path('veteriaria/wsgi.py').exists():
        with open('veteriaria/wsgi.py', 'r', encoding='utf-8') as f:
            content = f.read()
            if 'settings_production' in content:
                print_success("WSGI apunta a settings_production")
            else:
                print_warning("WSGI no apunta a settings_production")
                print_info("Asegúrate de configurar DJANGO_SETTINGS_MODULE en Render")
    
    # =========================================================================
    # 7. GITIGNORE
    # =========================================================================
    print_header("7. Verificando .gitignore")
    
    gitignore_items = [
        '.env',
        '*.pyc',
        '__pycache__',
        'staticfiles/',
        'db.sqlite3',
    ]
    
    if not check_file_content('.gitignore', gitignore_items, 
                             'GitIgnore configuration'):
        all_checks_passed = False
    
    # =========================================================================
    # 8. ESTRUCTURA DE DIRECTORIOS
    # =========================================================================
    print_header("8. Verificando estructura de directorios")
    
    dirs_to_check = [
        'veteriaria',
        'static',
        'templates',
        'media',
    ]
    
    for dir_name in dirs_to_check:
        if Path(dir_name).is_dir():
            print_success(f"Directorio: {dir_name}/")
        else:
            print_warning(f"Directorio no encontrado: {dir_name}/")
    
    # =========================================================================
    # 9. APPS INSTALADAS
    # =========================================================================
    print_header("9. Verificando apps del proyecto")
    
    apps_to_check = [
        'dashboard',
        'caja',
        'inventario',
        'servicios',
        'pacientes',
        'clinica',
        'login',
        'cuentas',
        'agenda',
        'historial',
    ]
    
    for app in apps_to_check:
        app_path = Path(app)
        if app_path.is_dir() and (app_path / 'models.py').exists():
            print_success(f"App: {app}")
        else:
            print_warning(f"App no encontrada o incompleta: {app}")
    
    # =========================================================================
    # RESUMEN FINAL
    # =========================================================================
    print_header("📊 RESUMEN DE VERIFICACIÓN")
    
    if all_checks_passed:
        print_success("✨ ¡Todas las verificaciones pasaron exitosamente!")
        print_info("\n📋 Próximos pasos:")
        print_info("1. Commit y push a tu repositorio Git")
        print_info("2. Crear PostgreSQL database en Render")
        print_info("3. Crear Web Service en Render")
        print_info("4. Configurar variables de entorno")
        print_info("5. Deploy y monitorear logs")
        print_info("\n📖 Ver DEPLOYMENT/GUIA_RENDER_DEPLOYMENT.md para más detalles")
        return 0
    else:
        print_error("\n⚠️  Algunas verificaciones fallaron")
        print_info("Por favor corrige los errores antes de hacer deployment")
        return 1

if __name__ == '__main__':
    sys.exit(main())
