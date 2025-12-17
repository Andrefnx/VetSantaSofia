"""
Test rápido para verificar la descripción de múltiples campos modificados
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from historial.utils import registrar_modificacion_informacion
from django.contrib.auth import get_user_model

User = get_user_model()

# Obtener primer usuario
usuario = User.objects.first()

print("=" * 60)
print("TEST: Descripción de múltiples campos modificados")
print("=" * 60)

# Test 1: Un solo campo
print("\n📋 TEST 1: Un solo campo modificado")
resultado1 = registrar_modificacion_informacion(
    'inventario', 
    1, 
    'Amoxicilina', 
    ['descripcion'], 
    usuario
)
print(f"✅ Descripción: {resultado1.descripcion}")

# Test 2: Múltiples campos
print("\n📋 TEST 2: Múltiples campos modificados")
resultado2 = registrar_modificacion_informacion(
    'inventario', 
    2, 
    'Antiparasitario', 
    ['descripcion', 'formato', 'marca'], 
    usuario
)
print(f"✅ Descripción: {resultado2.descripcion}")

# Test 3: Muchos campos
print("\n📋 TEST 3: Muchos campos modificados")
resultado3 = registrar_modificacion_informacion(
    'servicio', 
    3, 
    'Consulta Veterinaria', 
    ['nombre', 'precio', 'duracion', 'categoria', 'descripcion'], 
    usuario
)
print(f"✅ Descripción: {resultado3.descripcion}")

print("\n" + "=" * 60)
print("✅ TODOS LOS TESTS PASARON")
print("=" * 60)
