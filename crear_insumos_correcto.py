"""
Script para crear insumos de forma correcta con todos los campos requeridos
Ejecutar con: python manage.py shell < crear_insumos_correcto.py
O copiar y pegar en manage.py shell
"""

from inventario.models import Insumo

# Borrar insumos actuales (opcional)
print("¿Borrar insumos anteriores? (s/n): ", end="")
respuesta = input().strip().lower()
if respuesta == 's':
    Insumo.objects.all().delete()
    print("✅ Insumos borrados")

# Lista de insumos a crear
insumos_data = [
    {
        'medicamento': 'Amoxicilina',
        'descripcion': 'Antibiótico de amplio espectro',
        'dosis_ml': 10,
        'ml_contenedor': 100,
        'stock_actual': 50,
        'precio_venta': 5000,
        'unidad_medida': 'ml',
    },
    {
        'medicamento': 'Ibuprofeno',
        'descripcion': 'Analgésico antiinflamatorio',
        'dosis_ml': 5,
        'ml_contenedor': 50,
        'stock_actual': 30,
        'precio_venta': 3000,
        'unidad_medida': 'comprimido',
    },
    {
        'medicamento': 'Suero Fisiológico',
        'descripcion': 'Solución salina estéril',
        'dosis_ml': None,
        'ml_contenedor': 500,
        'stock_actual': 100,
        'precio_venta': 2000,
        'unidad_medida': 'ml',
    },
    {
        'medicamento': 'Dipirona',
        'descripcion': 'Analgésico y antitérmico',
        'dosis_ml': 15,
        'ml_contenedor': 200,
        'stock_actual': 40,
        'precio_venta': 4000,
        'unidad_medida': 'ml',
    },
]

print("\n" + "="*80)
print("CREANDO INSUMOS")
print("="*80)

for datos in insumos_data:
    try:
        insumo = Insumo.objects.create(
            medicamento=datos['medicamento'],
            descripcion=datos['descripcion'],
            dosis_ml=datos.get('dosis_ml'),
            ml_contenedor=datos.get('ml_contenedor'),
            stock_actual=datos['stock_actual'],
            precio_venta=datos['precio_venta'],
            unidad_medida=datos.get('unidad_medida', 'unidad'),
            archivado=False,
            formato='liquido' if datos.get('dosis_ml') else 'otro',
            especie='ambos'
        )
        print(f"✅ {insumo.medicamento}")
        print(f"   ID: {insumo.idInventario}")
        print(f"   Stock: {insumo.stock_actual}")
        print(f"   Precio: ${insumo.precio_venta}")
        print()
    except Exception as e:
        print(f"❌ Error creando {datos['medicamento']}: {str(e)}\n")

# Verificar que se crearon
print("\n" + "="*80)
print("INSUMOS CREADOS:")
print("="*80)
for insumo in Insumo.objects.all():
    print(f"ID: {insumo.idInventario:3} | {insumo.medicamento:25} | Stock: {insumo.stock_actual:3} | ${insumo.precio_venta}")

print(f"\n✅ Total: {Insumo.objects.count()} insumos")
