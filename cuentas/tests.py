from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from agenda.models import Cita
from cuentas.models import CustomUser
from inventario.models import Insumo
from pacientes.models import Paciente, Propietario
from servicios.models import Servicio


class DemoSmokeTests(TestCase):
    def test_pagina_principal_responde(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_inicio_sesion_demo(self):
        call_command('cargar_demo')
        response = self.client.post(
            reverse('login'),
            {'rut_input': '22222222-2', 'password': 'DemoVet2026!'},
        )
        self.assertRedirects(response, reverse('dashboard:dashboard'))

    def test_cargar_demo_es_idempotente(self):
        call_command('cargar_demo')
        cantidades = (
            CustomUser.objects.count(),
            Propietario.objects.count(),
            Paciente.objects.count(),
            Servicio.objects.count(),
            Insumo.objects.count(),
            Cita.objects.count(),
        )
        call_command('cargar_demo')
        self.assertEqual(
            cantidades,
            (
                CustomUser.objects.count(),
                Propietario.objects.count(),
                Paciente.objects.count(),
                Servicio.objects.count(),
                Insumo.objects.count(),
                Cita.objects.count(),
            ),
        )
