"""
Script para crear 10 productos de ejemplo en el inventario
Ejecutar con: python manage.py shell < crear_productos_inventario.py
"""

from inventario.models import Insumo
from django.utils import timezone
from decimal import Decimal

# Limpiar productos anteriores si existen (opcional)
# Insumo.objects.all().delete()

# Crear 10 productos variados
productos = [
    {
        'medicamento': 'Amoxicilina 500mg',
        'marca': 'Bayer',
        'sku': 'AMX-500-BAY',
        'tipo': 'Antibiótico',
        'formato': 'pastilla',
        'descripcion': 'Antibiótico de amplio espectro para infecciones bacterianas',
        'especie': 'Ambos',
        'stock_actual': 150,
        'stock_minimo': 30,
        'stock_medio': 60,
        'precio_venta': Decimal('2500.00'),
        'dosis_ml': Decimal('0.5'),  # 0.5 pastillas por kg
        'cantidad_pastillas': 20,
        'peso_kg': Decimal('10.0'),
        'precauciones': 'No administrar en caso de alergia a penicilinas',
        'contraindicaciones': 'Hipersensibilidad conocida a betalactámicos',
        'efectos_adversos': 'Puede causar diarrea, vómitos o reacciones alérgicas',
    },
    {
        'medicamento': 'Ivermectina Inyectable',
        'marca': 'Zoetis',
        'sku': 'IVR-INJ-ZOE',
        'tipo': 'Antiparasitario',
        'formato': 'inyectable',
        'descripcion': 'Antiparasitario interno y externo de amplio espectro',
        'especie': 'Perro',
        'stock_actual': 45,
        'stock_minimo': 15,
        'stock_medio': 30,
        'precio_venta': Decimal('15000.00'),
        'dosis_ml': Decimal('0.2'),  # 0.2 ml por kg
        'ml_contenedor': Decimal('50.0'),
        'peso_kg': Decimal('10.0'),
        'precauciones': 'No usar en perros de raza Collie o Pastor Alemán sin supervisión veterinaria',
        'contraindicaciones': 'No usar en cachorros menores de 6 semanas',
        'efectos_adversos': 'Salivación, ataxia, letargo en casos raros',
    },
    {
        'medicamento': 'Frontline Plus Pipeta',
        'marca': 'Boehringer Ingelheim',
        'sku': 'FRO-PIP-BOE',
        'tipo': 'Antiparasitario Externo',
        'formato': 'pipeta',
        'descripcion': 'Tratamiento contra pulgas, garrapatas y piojos',
        'especie': 'Gato',
        'stock_actual': 80,
        'stock_minimo': 20,
        'stock_medio': 40,
        'precio_venta': Decimal('8500.00'),
        'dosis_ml': Decimal('1.0'),  # 1 pipeta por aplicación
        'unidades_pipeta': 3,
        'tiene_rango_peso': True,
        'peso_min_kg': Decimal('2.0'),
        'peso_max_kg': Decimal('8.0'),
        'precauciones': 'Aplicar en zona donde el animal no pueda lamerse',
        'contraindicaciones': 'No usar en gatitos menores de 8 semanas',
        'efectos_adversos': 'Irritación local leve, raramente vómitos si es ingerido',
    },
    {
        'medicamento': 'Carprofeno 100mg',
        'marca': 'Norvet',
        'sku': 'CAR-100-NOR',
        'tipo': 'Antiinflamatorio',
        'formato': 'pastilla',
        'descripcion': 'AINE para el tratamiento del dolor y la inflamación',
        'especie': 'Perro',
        'stock_actual': 200,
        'stock_minimo': 40,
        'stock_medio': 80,
        'precio_venta': Decimal('1800.00'),
        'dosis_ml': Decimal('0.2'),  # 0.2 pastillas por kg
        'cantidad_pastillas': 30,
        'peso_kg': Decimal('10.0'),
        'precauciones': 'Administrar con alimento para reducir molestias gastrointestinales',
        'contraindicaciones': 'Enfermedad renal, hepática o úlcera gastrointestinal',
        'efectos_adversos': 'Vómitos, diarrea, pérdida de apetito',
    },
    {
        'medicamento': 'Enrofloxacina Solución Oral',
        'marca': 'Richmond Vet',
        'sku': 'ENR-SOL-RIC',
        'tipo': 'Antibiótico',
        'formato': 'liquido',
        'descripcion': 'Antibiótico fluoroquinolona para infecciones bacterianas',
        'especie': 'Ambos',
        'stock_actual': 25,
        'stock_minimo': 10,
        'stock_medio': 20,
        'precio_venta': Decimal('12000.00'),
        'dosis_ml': Decimal('0.5'),  # 0.5 ml por kg
        'ml_contenedor': Decimal('100.0'),
        'peso_kg': Decimal('10.0'),
        'precauciones': 'No usar en animales en crecimiento',
        'contraindicaciones': 'Cachorros en desarrollo, daño en cartílago de crecimiento',
        'efectos_adversos': 'Vómitos, diarrea, trastornos neurológicos en casos raros',
    },
    {
        'medicamento': 'Metronidazol Polvo',
        'marca': 'Holliday',
        'sku': 'MET-POL-HOL',
        'tipo': 'Antiparasitario/Antibiótico',
        'formato': 'polvo',
        'descripcion': 'Tratamiento para Giardia y bacterias anaerobias',
        'especie': 'Ambos',
        'stock_actual': 60,
        'stock_minimo': 15,
        'stock_medio': 30,
        'precio_venta': Decimal('8000.00'),
        'dosis_ml': Decimal('0.25'),  # 0.25 g por kg
        'ml_contenedor': Decimal('50.0'),  # 50g por sobre
        'peso_kg': Decimal('10.0'),
        'precauciones': 'Puede tener sabor amargo, mezclar con alimento',
        'contraindicaciones': 'Enfermedad hepática severa',
        'efectos_adversos': 'Náuseas, vómitos, sabor metálico',
    },
    {
        'medicamento': 'Dermovet Crema',
        'marca': 'König',
        'sku': 'DER-CRE-KON',
        'tipo': 'Dermatológico',
        'formato': 'crema',
        'descripcion': 'Tratamiento tópico para dermatitis y lesiones cutáneas',
        'especie': 'Ambos',
        'stock_actual': 35,
        'stock_minimo': 10,
        'stock_medio': 20,
        'precio_venta': Decimal('6500.00'),
        'dosis_ml': Decimal('2.0'),  # 2g por aplicación
        'ml_contenedor': Decimal('30.0'),  # 30g por tubo
        'peso_kg': Decimal('5.0'),
        'precauciones': 'Evitar contacto con ojos y mucosas',
        'contraindicaciones': 'Hipersensibilidad a los componentes',
        'efectos_adversos': 'Irritación local leve en casos raros',
    },
    {
        'medicamento': 'Tramadol 50mg',
        'marca': 'Denver Farma',
        'sku': 'TRA-50-DEN',
        'tipo': 'Analgésico Opioide',
        'formato': 'pastilla',
        'descripcion': 'Analgésico para dolor moderado a severo',
        'especie': 'Perro',
        'stock_actual': 120,
        'stock_minimo': 25,
        'stock_medio': 50,
        'precio_venta': Decimal('3200.00'),
        'dosis_ml': Decimal('0.3'),  # 0.3 pastillas por kg
        'cantidad_pastillas': 10,
        'peso_kg': Decimal('10.0'),
        'precauciones': 'Medicamento controlado, requiere receta especial',
        'contraindicaciones': 'Epilepsia, uso con IMAO',
        'efectos_adversos': 'Sedación, estreñimiento, náuseas',
    },
    {
        'medicamento': 'Ketoprofeno Inyectable',
        'marca': 'Merial',
        'sku': 'KET-INJ-MER',
        'tipo': 'Antiinflamatorio',
        'formato': 'inyectable',
        'descripcion': 'AINE de acción rápida para dolor agudo',
        'especie': 'Ambos',
        'stock_actual': 40,
        'stock_minimo': 15,
        'stock_medio': 25,
        'precio_venta': Decimal('11000.00'),
        'dosis_ml': Decimal('0.1'),  # 0.1 ml por kg
        'ml_contenedor': Decimal('10.0'),
        'peso_kg': Decimal('10.0'),
        'precauciones': 'No combinar con otros AINEs o corticoides',
        'contraindicaciones': 'Insuficiencia renal o hepática, úlcera gástrica',
        'efectos_adversos': 'Molestias gastrointestinales, elevación de enzimas hepáticas',
    },
    {
        'medicamento': 'Revolution Pipeta (Selamectina)',
        'marca': 'Zoetis',
        'sku': 'REV-PIP-ZOE',
        'tipo': 'Antiparasitario Completo',
        'formato': 'pipeta',
        'descripcion': 'Prevención de parásitos internos y externos, prevención de dirofilaria',
        'especie': 'Perro',
        'stock_actual': 95,
        'stock_minimo': 20,
        'stock_medio': 45,
        'precio_venta': Decimal('9800.00'),
        'dosis_ml': Decimal('1.0'),  # 1 pipeta por aplicación
        'unidades_pipeta': 3,
        'tiene_rango_peso': True,
        'peso_min_kg': Decimal('5.1'),
        'peso_max_kg': Decimal('10.0'),
        'precauciones': 'No bañar al animal 2 horas antes ni después de la aplicación',
        'contraindicaciones': 'No usar en cachorros menores de 6 semanas',
        'efectos_adversos': 'Irritación local transitoria, caída de pelo en el sitio de aplicación',
    },
]

# Crear cada producto
print("Creando productos en el inventario...")
print("=" * 50)

for i, prod_data in enumerate(productos, 1):
    try:
        producto = Insumo.objects.create(**prod_data)
        print(f"✅ {i}. {producto.medicamento} - Stock: {producto.stock_actual} - Precio: ${producto.precio_venta}")
    except Exception as e:
        print(f"❌ Error creando producto {i}: {str(e)}")

print("=" * 50)
print(f"✅ Proceso completado. Total productos creados: {Insumo.objects.count()}")
