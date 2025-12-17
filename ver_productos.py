from inventario.models import Insumo

print(f'\nTotal productos en inventario: {Insumo.objects.count()}\n')
print('Productos creados:')
print('=' * 80)

for p in Insumo.objects.all().order_by('medicamento'):
    print(f'  • {p.medicamento:40s} | {p.formato:12s} | Stock: {p.stock_actual:3d} | ${p.precio_venta}')

print('=' * 80)
print(f'\nResumen por formato:')
for formato, nombre in Insumo.FORMATO_CHOICES:
    count = Insumo.objects.filter(formato=formato).count()
    if count > 0:
        print(f'  - {nombre}: {count}')
