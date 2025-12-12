from django.core.management.base import BaseCommand
from agenda.models import HorarioFijoVeterinario
from cuentas.models import CustomUser
from datetime import time


class Command(BaseCommand):
    help = 'Inicializa horarios fijos de ejemplo para veterinarios'

    def handle(self, *args, **kwargs):
        # Obtener veterinarios
        veterinarios = CustomUser.objects.filter(rol='veterinario', is_active=True)
        
        if not veterinarios.exists():
            self.stdout.write(self.style.WARNING('No hay veterinarios registrados'))
            return
        
        contador = 0
        
        for vet in veterinarios:
            # Verificar si ya tiene horarios
            if HorarioFijoVeterinario.objects.filter(veterinario=vet).exists():
                self.stdout.write(
                    self.style.WARNING(f'{vet.nombre} {vet.apellido} ya tiene horarios configurados')
                )
                continue
            
            # Horario de ejemplo: Lunes a Viernes 8:00-17:00 con descanso 12:00-13:00
            dias_laborales = [0, 1, 2, 3, 4]  # Lun-Vie
            
            for dia in dias_laborales:
                # Mañana: 8:00-12:00
                HorarioFijoVeterinario.objects.create(
                    veterinario=vet,
                    dia_semana=dia,
                    hora_inicio=time(8, 0),
                    hora_fin=time(12, 0),
                    activo=True,
                    notas='Horario mañana'
                )
                
                # Tarde: 13:00-17:00
                HorarioFijoVeterinario.objects.create(
                    veterinario=vet,
                    dia_semana=dia,
                    hora_inicio=time(13, 0),
                    hora_fin=time(17, 0),
                    activo=True,
                    notas='Horario tarde'
                )
                
                contador += 2
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Horarios creados para {vet.nombre} {vet.apellido}')
            )
        
        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Total: {contador} horarios fijos creados')
        )
