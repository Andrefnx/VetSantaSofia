from datetime import date, time

from django.core.management.base import BaseCommand
from django.db import transaction

from agenda.models import Cita
from cuentas.models import CustomUser
from inventario.models import Insumo
from pacientes.models import Paciente, Propietario
from servicios.models import Servicio


DEMO_PASSWORD = 'DemoVet2026!'


class Command(BaseCommand):
    help = 'Carga datos ficticios e idempotentes para la demo pública.'

    @transaction.atomic
    def handle(self, *args, **options):
        usuarios = [
            ('11111111-1', 'Admin', 'Demo', 'admin.demo@example.com', 'administracion', True),
            ('22222222-2', 'Valentina', 'Demo', 'veterinaria.demo@example.com', 'veterinario', False),
            ('33333333-3', 'Renata', 'Demo', 'recepcion.demo@example.com', 'recepcion', False),
        ]
        creados = {}
        for rut, nombre, apellido, correo, rol, is_staff in usuarios:
            usuario, _ = CustomUser.objects.update_or_create(
                rut=rut,
                defaults={
                    'nombre': nombre,
                    'apellido': apellido,
                    'correo': correo,
                    'rol': rol,
                    'tipo_contrato': rol,
                    'is_staff': is_staff,
                    'is_active': True,
                },
            )
            usuario.set_password(DEMO_PASSWORD)
            usuario.save(update_fields=['password'])
            creados[rol] = usuario

        propietario, _ = Propietario.objects.update_or_create(
            email='propietaria.demo@example.com',
            defaults={
                'nombre': 'Camila',
                'apellido': 'Ejemplo',
                'telefono': '+56 9 0000 0001',
                'direccion': 'Dirección ficticia 123',
            },
        )
        paciente, _ = Paciente.objects.update_or_create(
            microchip='DEMO-CHIP-0001',
            defaults={
                'nombre': 'Luna Demo',
                'especie': 'canino',
                'raza': 'Mestiza',
                'color': 'Café',
                'sexo': 'H',
                'fecha_nacimiento': date(2021, 5, 10),
                'ultimo_peso': 12.5,
                'propietario': propietario,
                'activo': True,
            },
        )

        consulta, _ = Servicio.objects.update_or_create(
            nombre='Consulta general demo',
            defaults={
                'descripcion': 'Consulta ficticia para navegación de la demo.',
                'categoria': 'Consulta',
                'precio': 25000,
                'duracion': 30,
                'activo': True,
            },
        )
        Servicio.objects.update_or_create(
            nombre='Vacunación demo',
            defaults={
                'descripcion': 'Servicio ficticio de vacunación.',
                'categoria': 'Preventivo',
                'precio': 18000,
                'duracion': 30,
                'activo': True,
            },
        )

        Insumo.objects.update_or_create(
            sku='DEMO-INS-001',
            defaults={
                'medicamento': 'Vacuna ficticia demo',
                'marca': 'Marca Demo',
                'tipo': 'Vacuna',
                'formato': 'inyectable',
                'especie': 'ambos',
                'stock_actual': 24,
                'stock_minimo': 5,
                'stock_medio': 10,
                'precio_venta': 12000,
                'archivado': False,
            },
        )
        Insumo.objects.update_or_create(
            sku='DEMO-INS-002',
            defaults={
                'medicamento': 'Antiséptico ficticio demo',
                'marca': 'Marca Demo',
                'tipo': 'Higiene',
                'formato': 'liquido',
                'especie': 'ambos',
                'stock_actual': 18,
                'stock_minimo': 4,
                'stock_medio': 8,
                'precio_venta': 6500,
                'archivado': False,
            },
        )

        Cita.objects.update_or_create(
            veterinario=creados['veterinario'],
            fecha=date(2026, 9, 1),
            hora_inicio=time(10, 0),
            defaults={
                'paciente': paciente,
                'servicio': consulta,
                'tipo': 'consulta',
                'estado': 'confirmada',
                'motivo': 'Control preventivo ficticio para demo',
                'notas': 'Datos completamente ficticios.',
            },
        )

        self.stdout.write(self.style.SUCCESS('Datos demo cargados sin duplicados.'))
        self.stdout.write('Usuario demo: 22222222-2 / DemoVet2026!')
