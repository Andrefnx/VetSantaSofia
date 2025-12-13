from django.core.management.base import BaseCommand
from django.db.models import Q
from cuentas.models import CustomUser
from agenda.models import HorarioFijoVeterinario, DisponibilidadBloquesDia
from agenda.views import _generar_disponibilidades_desde_horario_semanal


class Command(BaseCommand):
    help = 'Regenera las disponibilidades diarias para todos los veterinarios desde sus horarios semanales'

    def add_arguments(self, parser):
        parser.add_argument(
            '--veterinario',
            type=int,
            help='ID del veterinario específico (opcional)',
        )
        parser.add_argument(
            '--semanas',
            type=int,
            default=8,
            help='Número de semanas a generar (por defecto 8)',
        )

    def handle(self, *args, **options):
        veterinario_id = options.get('veterinario')
        semanas = options.get('semanas', 8)
        
        if veterinario_id:
            # Regenerar para un veterinario específico
            try:
                veterinario = CustomUser.objects.get(pk=veterinario_id, rol='veterinario')
                self.stdout.write(f'Regenerando disponibilidades para {veterinario.nombre} {veterinario.apellido}...')
                _generar_disponibilidades_desde_horario_semanal(veterinario, semanas=semanas)
                self.stdout.write(self.style.SUCCESS(f'✓ Disponibilidades regeneradas para {veterinario.nombre}'))
            except CustomUser.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'✗ Veterinario con ID {veterinario_id} no encontrado'))
        else:
            # Regenerar para todos los veterinarios con horarios configurados
            veterinarios_con_horarios = CustomUser.objects.filter(
                rol='veterinario',
                horarios_fijos__activo=True
            ).distinct()
            
            total = veterinarios_con_horarios.count()
            self.stdout.write(f'Encontrados {total} veterinarios con horarios configurados')
            
            for i, veterinario in enumerate(veterinarios_con_horarios, 1):
                self.stdout.write(f'[{i}/{total}] Procesando {veterinario.nombre} {veterinario.apellido}...')
                try:
                    _generar_disponibilidades_desde_horario_semanal(veterinario, semanas=semanas)
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Completado'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ Error: {str(e)}'))
            
            self.stdout.write(self.style.SUCCESS(f'\n✓ Proceso completado para {total} veterinarios'))
