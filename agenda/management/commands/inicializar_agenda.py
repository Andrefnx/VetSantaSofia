"""
Script de inicialización del módulo de agenda
Crea datos de ejemplo para probar el sistema
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, time, timedelta
from agenda.models import DisponibilidadVeterinario, Cita
from cuentas.models import CustomUser
from pacientes.models import Paciente
from servicios.models import Servicio


class Command(BaseCommand):
    help = 'Inicializa el módulo de agenda con datos de ejemplo'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando configuración de agenda...'))
        
        # Obtener veterinarios
        veterinarios = CustomUser.objects.filter(rol='veterinario', is_active=True)
        
        if not veterinarios.exists():
            self.stdout.write(self.style.WARNING(
                'No hay veterinarios registrados. Cree al menos un usuario con rol "veterinario".'
            ))
            return
        
        # Crear disponibilidad para la próxima semana
        self.stdout.write('Creando disponibilidad de ejemplo...')
        hoy = date.today()
        
        for i in range(7):  # Próximos 7 días
            fecha = hoy + timedelta(days=i)
            
            # Saltar domingos
            if fecha.weekday() == 6:
                continue
            
            for veterinario in veterinarios:
                # Disponibilidad de mañana
                DisponibilidadVeterinario.objects.get_or_create(
                    veterinario=veterinario,
                    fecha=fecha,
                    hora_inicio=time(9, 0),
                    defaults={
                        'hora_fin': time(13, 0),
                        'tipo': 'disponible',
                        'notas': 'Horario de mañana'
                    }
                )
                
                # Disponibilidad de tarde
                DisponibilidadVeterinario.objects.get_or_create(
                    veterinario=veterinario,
                    fecha=fecha,
                    hora_inicio=time(15, 0),
                    defaults={
                        'hora_fin': time(18, 0),
                        'tipo': 'disponible',
                        'notas': 'Horario de tarde'
                    }
                )
        
        self.stdout.write(self.style.SUCCESS(
            f'✓ Disponibilidad creada para {veterinarios.count()} veterinario(s) durante 7 días'
        ))
        
        # Crear algunas citas de ejemplo si hay pacientes
        pacientes = Paciente.objects.filter(activo=True)[:3]
        servicios = Servicio.objects.all()[:3]
        
        if pacientes.exists() and servicios.exists():
            self.stdout.write('Creando citas de ejemplo...')
            
            veterinario = veterinarios.first()
            fecha_ejemplo = hoy + timedelta(days=1)
            
            # Cita 1: Mañana
            Cita.objects.get_or_create(
                paciente=pacientes[0],
                veterinario=veterinario,
                fecha=fecha_ejemplo,
                hora_inicio=time(10, 0),
                defaults={
                    'hora_fin': time(11, 0),
                    'servicio': servicios[0] if servicios.exists() else None,
                    'tipo': 'consulta',
                    'estado': 'confirmada',
                    'motivo': 'Control de rutina',
                    'notas': 'Paciente en buen estado general'
                }
            )
            
            self.stdout.write(self.style.SUCCESS('✓ Citas de ejemplo creadas'))
        
        self.stdout.write(self.style.SUCCESS('\n¡Configuración completada!'))
        self.stdout.write('Puede acceder a la agenda en: /agenda/')
