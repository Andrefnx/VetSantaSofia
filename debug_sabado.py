import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from agenda.models import HorarioFijoVeterinario, DisponibilidadBloquesDia, time_to_block_index
from datetime import date
from cuentas.models import CustomUser

# Obtener Marcos
marcos = CustomUser.objects.get(nombre='Marcos', rol='veterinario')
print(f'Veterinario: {marcos.nombre} {marcos.apellido} (ID: {marcos.id})')

# Ver horarios fijos
horarios = HorarioFijoVeterinario.objects.filter(veterinario=marcos, activo=True).order_by('dia_semana', 'hora_inicio')
print(f'\nHorarios fijos activos: {horarios.count()}')

# Agrupar por día
horarios_por_dia = {}
for h in horarios:
    if h.dia_semana not in horarios_por_dia:
        horarios_por_dia[h.dia_semana] = []
    horarios_por_dia[h.dia_semana].append(h)
    print(f'  Día {h.dia_semana} ({h.get_dia_semana_display()}): {h.hora_inicio} - {h.hora_fin}')

print(f'\nDías configurados: {list(horarios_por_dia.keys())}')

# Sábado 13 de diciembre
sabado = date(2025, 12, 13)
dia_semana = sabado.weekday()
print(f'\nProcesando {sabado} (weekday={dia_semana})')

if dia_semana in horarios_por_dia:
    print(f'  ✓ Hay horarios para este día')
    horarios_dia = horarios_por_dia[dia_semana]
    for h in horarios_dia:
        print(f'    {h.hora_inicio} - {h.hora_fin}')
        start_block = time_to_block_index(h.hora_inicio)
        end_block = time_to_block_index(h.hora_fin)
        print(f'    Bloques: {start_block} - {end_block}')
else:
    print(f'  ✗ NO hay horarios para este día')

# Ver disponibilidad actual
disp = DisponibilidadBloquesDia.objects.filter(veterinario=marcos, fecha=sabado).first()
if disp:
    print(f'\nDisponibilidad actual:')
    print(f'  Trabaja: {disp.trabaja}')
    print(f'  Rangos: {disp.rangos}')
    print(f'  Notas: {disp.notas}')
