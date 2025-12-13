import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from agenda.models import DisponibilidadBloquesDia, HorarioFijoVeterinario
from datetime import date

hoy = date(2025, 12, 13)
print(f'=== Fecha: {hoy} ===')
print(f'Día de la semana: {hoy.strftime("%A")}')
print(f'weekday(): {hoy.weekday()} (0=lunes, 5=sábado)')

print('\n=== Disponibilidades para hoy ===')
disps = DisponibilidadBloquesDia.objects.filter(fecha=hoy)
print(f'Total: {disps.count()}')
for d in disps:
    print(f'\n{d.veterinario.nombre} {d.veterinario.apellido}:')
    print(f'  Trabaja: {d.trabaja}')
    print(f'  Rangos: {d.rangos}')
    print(f'  Notas: {d.notas}')

print('\n=== Horarios fijos para sábado (dia_semana=5) ===')
horarios = HorarioFijoVeterinario.objects.filter(dia_semana=5, activo=True)
print(f'Total: {horarios.count()}')
for h in horarios:
    print(f'{h.veterinario.nombre} {h.veterinario.apellido}: {h.hora_inicio}-{h.hora_fin}')

print('\n=== TODOS los horarios fijos configurados ===')
todos = HorarioFijoVeterinario.objects.filter(activo=True).order_by('veterinario', 'dia_semana')
for h in todos:
    print(f'{h.veterinario.nombre}: día {h.dia_semana} ({h.get_dia_semana_display()}) - {h.hora_inicio}-{h.hora_fin}')
