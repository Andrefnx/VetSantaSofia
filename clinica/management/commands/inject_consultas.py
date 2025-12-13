from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from clinica.models import Consulta
from pacientes.models import Paciente
from inventario.models import Insumo
from datetime import datetime
import random
import pytz

User = get_user_model()

class Command(BaseCommand):
    help = 'Inyecta consultas de prueba para el paciente 4'

    def handle(self, *args, **options):
        self.stdout.write("🚀 Iniciando inyección de datos...")

        # Obtener paciente
        try:
            paciente = Paciente.objects.get(id=4)
            self.stdout.write(f"✅ Paciente: {paciente.nombre}")
        except Paciente.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Paciente ID 4 no existe"))
            return

        # Obtener veterinario (usuario)
        try:
            veterinario = User.objects.filter(is_staff=True).first()
            if not veterinario:
                veterinario = User.objects.first()
            if not veterinario:
                self.stdout.write(self.style.ERROR("❌ No hay usuarios"))
                return
            nombre_vet = f"{veterinario.nombre} {veterinario.apellido}" if hasattr(veterinario, 'nombre') else veterinario.username
            self.stdout.write(f"✅ Veterinario: {nombre_vet}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error veterinario: {e}"))
            return

        # Obtener insumos/medicamentos
        try:
            medicamentos = list(Insumo.objects.all()[:20])
            self.stdout.write(f"✅ {len(medicamentos)} medicamentos disponibles")
        except Exception as e:
            medicamentos = []
            self.stdout.write(self.style.WARNING(f"⚠️ Sin medicamentos: {e}"))

        # Tipos de consulta
        tipos = ['consulta_general', 'urgencia', 'vacuna', 'desparacitacion', 'control', 'cirugia']

        # Diagnósticos variados
        diagnosticos = [
            "Parásitos intestinales detectados",
            "Otitis externa leve",
            "Dermatitis alérgica",
            "Herida superficial en pata anterior",
            "Control de rutina - Sin hallazgos anormales",
            "Infección respiratoria leve",
            "Gastroenteritis aguda",
            "Vacunación preventiva completada",
            "Sobrepeso moderado - 2kg sobre peso ideal",
            "Deshidratación leve por vómitos",
            "Conjuntivitis bilateral",
            "Fractura de falange distal",
            "Intoxicación alimentaria leve",
            "Alergia estacional",
            "Displasia de cadera leve",
            "Tumor benigno en piel",
            "Gingivitis moderada",
            "Cálculos renales pequeños",
            "Anemia leve",
            "Hipertiroidismo controlado"
        ]

        # Tratamientos
        tratamientos = [
            "Antiparasitario oral, repetir en 15 días",
            "Gotas óticas cada 12h por 7 días",
            "Antialérgico y baño medicado semanal",
            "Limpieza y antibiótico tópico, control en 5 días",
            "Continuar alimentación balanceada",
            "Antibiótico oral cada 12h por 10 días",
            "Dieta blanda y probióticos por 3 días",
            "Vacuna quíntuple aplicada, próxima en 1 mes",
            "Reducir ración 20%, aumentar ejercicio",
            "Rehidratación oral, monitorear agua",
            "Colirio oftálmico cada 8h por 5 días",
            "Inmovilización con férula, control en 2 semanas",
            "Carbón activado y dieta líquida 24h",
            "Antihistamínico oral diario durante temporada",
            "Condroprotectores y control peso",
            "Observación, biopsia si crece",
            "Limpieza dental programada próximo mes",
            "Dieta renal específica y abundante agua",
            "Suplemento de hierro por 30 días",
            "Medicación tiroidea diaria de por vida"
        ]

        # Notas clínicas
        notas = [
            "Dueño muy colaborador, seguirá indicaciones",
            "Mascota nerviosa durante consulta",
            "Revisar en próximo control evolución",
            "Aplicar vacuna de refuerzo próximo mes",
            "Temperatura normal, signos vitales estables",
            "Recomendar chequeo dental en 3 meses",
            "Dueño reporta mejoría desde última consulta",
            "Enviar recordatorio para desparasitación",
            "Mascota muy tranquila y cooperativa",
            "Programar seguimiento en 2 semanas",
        ]

        # Configurar timezone
        tz = pytz.timezone('America/Santiago')

        # Generar fechas con timezone
        fechas_naive = [
            # 2018 - 4 consultas
            datetime(2018, 2, 15, 10, 30), datetime(2018, 5, 20, 14, 15),
            datetime(2018, 9, 10, 11, 0), datetime(2018, 11, 25, 16, 30),
            # 2019 - 5 consultas
            datetime(2019, 1, 18, 9, 45), datetime(2019, 4, 12, 15, 20),
            datetime(2019, 6, 30, 11, 15), datetime(2019, 9, 5, 14, 0),
            datetime(2019, 12, 10, 10, 30),
            # 2020 - 6 consultas
            datetime(2020, 2, 8, 16, 0), datetime(2020, 4, 15, 9, 30),
            datetime(2020, 6, 22, 14, 45), datetime(2020, 8, 10, 11, 20),
            datetime(2020, 10, 5, 15, 30), datetime(2020, 12, 18, 10, 0),
            # 2021 - 7 consultas
            datetime(2021, 1, 25, 14, 15), datetime(2021, 3, 10, 10, 45),
            datetime(2021, 5, 18, 16, 20), datetime(2021, 7, 5, 11, 30),
            datetime(2021, 8, 22, 9, 15), datetime(2021, 10, 30, 15, 0),
            datetime(2021, 12, 15, 14, 30),
            # 2022 - 8 consultas
            datetime(2022, 1, 12, 10, 30), datetime(2022, 3, 5, 14, 20),
            datetime(2022, 4, 28, 11, 45), datetime(2022, 6, 15, 16, 10),
            datetime(2022, 8, 3, 9, 30), datetime(2022, 9, 20, 15, 15),
            datetime(2022, 11, 8, 10, 45), datetime(2022, 12, 22, 14, 0),
            # 2023 - 10 consultas
            datetime(2023, 1, 10, 11, 0), datetime(2023, 2, 14, 15, 30),
            datetime(2023, 3, 28, 10, 15), datetime(2023, 5, 12, 14, 45),
            datetime(2023, 6, 25, 9, 30), datetime(2023, 8, 8, 16, 0),
            datetime(2023, 9, 20, 11, 20), datetime(2023, 10, 15, 14, 10),
            datetime(2023, 11, 30, 10, 45), datetime(2023, 12, 20, 15, 30),
            # 2024 - 12 consultas
            datetime(2024, 1, 8, 9, 45), datetime(2024, 2, 5, 14, 20),
            datetime(2024, 3, 18, 11, 30), datetime(2024, 4, 22, 15, 45),
            datetime(2024, 5, 10, 10, 15), datetime(2024, 6, 28, 16, 0),
            datetime(2024, 7, 15, 9, 30), datetime(2024, 8, 30, 14, 15),
            datetime(2024, 9, 12, 11, 0), datetime(2024, 10, 25, 15, 30),
            datetime(2024, 11, 8, 10, 45), datetime(2024, 12, 18, 14, 20),
            # 2025 - 15 consultas
            datetime(2025, 1, 15, 10, 30), datetime(2025, 2, 12, 14, 15),
            datetime(2025, 3, 8, 11, 45), datetime(2025, 4, 20, 16, 0),
            datetime(2025, 5, 5, 9, 30), datetime(2025, 6, 18, 15, 15),
            datetime(2025, 7, 10, 10, 0), datetime(2025, 8, 25, 14, 30),
            datetime(2025, 9, 12, 11, 20), datetime(2025, 10, 30, 16, 15),
            datetime(2025, 11, 8, 9, 45), datetime(2025, 12, 9, 15, 26),
            datetime(2025, 12, 9, 15, 31), datetime(2025, 12, 9, 16, 42),
            datetime(2025, 12, 20, 10, 30)
        ]

        # Convertir a timezone-aware
        fechas = [tz.localize(f) for f in fechas_naive]

        self.stdout.write(f"\n🔄 Creando {len(fechas)} consultas desde 2018 hasta 2025...\n")

        contador = 0
        for fecha in fechas:
            tipo = random.choice(tipos)
            
            # Crear consulta
            consulta = Consulta.objects.create(
                paciente=paciente,
                veterinario=veterinario,
                fecha=fecha,
                tipo_consulta=tipo,
                temperatura=round(random.uniform(37.5, 39.2), 1),
                peso=round(random.uniform(8.5, 12.5), 1),
                frecuencia_cardiaca=random.randint(80, 120),
                frecuencia_respiratoria=random.randint(20, 35),
                otros=f"Mucosas rosadas, hidratación {random.choice(['adecuada', 'buena', 'normal'])}, CC {random.randint(3,5)}/5",
                diagnostico=random.choice(diagnosticos),
                tratamiento=random.choice(tratamientos),
                notas=random.choice(notas)
            )
            
            # Agregar medicamentos (70% probabilidad)
            meds_agregados = []
            if medicamentos and random.random() > 0.3:
                num_meds = random.randint(1, min(4, len(medicamentos)))
                meds_selected = random.sample(medicamentos, num_meds)
                
                for med in meds_selected:
                    consulta.medicamentos.add(med)
                    meds_agregados.append(med.medicamento)
            
            contador += 1
            tipo_display = dict(Consulta.TIPO_CONSULTA_CHOICES).get(tipo, tipo)
            meds_text = f" | 💊 {len(meds_agregados)}" if meds_agregados else ""
            
            self.stdout.write(f"✅ {contador:2d}. {fecha.strftime('%d/%m/%Y %H:%M')} - {tipo_display:22s}{meds_text}")

        self.stdout.write(self.style.SUCCESS(f"\n✅ {contador} consultas creadas exitosamente"))
        self.stdout.write(f"📊 Paciente: {paciente.nombre}")
        self.stdout.write(f"👨‍⚕️ Veterinario: {nombre_vet}")
        self.stdout.write(f"📅 Rango: 2018 - 2025")
        self.stdout.write(f"💊 Con medicamentos: {'Sí' if medicamentos else 'No'}")
        self.stdout.write(self.style.SUCCESS("\n✅ Inyección completada"))