import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from agenda.models import DisponibilidadBloquesDia
from datetime import date, timedelta

hoy = date(2025, 12, 13)
lunes = hoy + timedelta(days=2)  # 15 de diciembre es lunes

print(f'=== Disponibilidades para lunes {lunes} (weekday={lunes.weekday()}) ===')
disps = DisponibilidadBloquesDia.objects.filter(fecha=lunes)
print(f'Total: {disps.count()}')
for d in disps:
    print(f'\n{d.veterinario.nombre} {d.veterinario.apellido}:')
    print(f'  Trabaja: {d.trabaja}')
    print(f'  Cantidad de rangos: {len(d.rangos)}')
    if d.rangos:
        for rng in d.rangos:
            from agenda.models import block_index_to_time
            start_time = block_index_to_time(rng['start_block'])
            end_time = block_index_to_time(rng['end_block'])
            print(f'    {start_time} - {end_time}')
