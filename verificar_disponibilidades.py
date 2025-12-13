from agenda.models import DisponibilidadBloquesDia
from datetime import date

total = DisponibilidadBloquesDia.objects.count()
print(f'Total disponibilidades creadas: {total}')

hoy = date.today()
disp_hoy = DisponibilidadBloquesDia.objects.filter(fecha=hoy)
print(f'\nDisponibilidades para hoy ({hoy}): {disp_hoy.count()}')

for d in disp_hoy:
    print(f'  - {d.veterinario.nombre} {d.veterinario.apellido}: trabaja={d.trabaja}, rangos={len(d.rangos)}')
    if d.trabaja and d.rangos:
        for rng in d.rangos:
            print(f'    Bloque {rng["start_block"]} a {rng["end_block"]}')
