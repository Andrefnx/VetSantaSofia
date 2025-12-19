import os
import sys
import django
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone


# Asegurar que la raíz del proyecto esté en el PYTHONPATH
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Configurar Django (ejecutar este script desde la raíz del repo o con este ajuste de path)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "veteriaria.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction

from pacientes.models import Propietario, Paciente
from clinica.models import Consulta, Hospitalizacion, ConsultaInsumo, HospitalizacionInsumo
from servicios.models import Servicio
from inventario.models import Insumo


def get_or_create_demo_user():
    User = get_user_model()
    # Normalizar RUT como lo hace el manager (sin puntos/espacios y con guión)
    rut_input = "12.345.678-9"
    rut = rut_input.replace(".", "").replace(" ", "").upper()
    if "-" not in rut and len(rut) >= 2:
        rut = f"{rut[:-1]}-{rut[-1]}"

    user = User.objects.filter(rut=rut).first()
    if user:
        return user

    # Crear usuario con el manager respetando reglas del modelo
    try:
        user = User.objects.create_user(
            rut=rut,
            password="demo1234",
            nombre="Demo",
            apellido="Vet",
            correo="demo.vet@local",
            rol="veterinario",
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
    except Exception:
        # Si hay conflicto por unicidad, recuperar el existente
        user = User.objects.filter(rut=rut).first()
        if not user:
            raise
    return user


def seed_insumos():
    # Crear algunos insumos con datos suficientes para cálculo automático
    insumos = []

    amoxi, _ = Insumo.objects.get_or_create(
        medicamento="Amoxicilina 250mg/5ml",
        defaults={
            "formato": "liquido",
            "ml_contenedor": Decimal("60"),
            "dosis_ml": Decimal("0.5"),  # ml por kg
            "peso_kg": Decimal("1"),
            "stock_actual": 50,
            "precio_venta": Decimal("3500.00"),
        },
    )
    insumos.append(amoxi)

    carprofeno, _ = Insumo.objects.get_or_create(
        medicamento="Carprofeno 50mg",
        defaults={
            "formato": "pastilla",
            "cantidad_pastillas": 10,  # contenido por envase
            # En pastilla, la dosis diaria asumida será 1 por día en calcular_envases_requeridos
            "stock_actual": 100,
            "precio_venta": Decimal("2500.00"),
        },
    )
    insumos.append(carprofeno)

    pipeta, _ = Insumo.objects.get_or_create(
        medicamento="Pipeta antipulgas 10-20kg",
        defaults={
            "formato": "pipeta",
            "unidades_pipeta": 1,
            "tiene_rango_peso": True,
            "peso_min_kg": Decimal("10"),
            "peso_max_kg": Decimal("20"),
            "stock_actual": 30,
            "precio_venta": Decimal("8000.00"),
        },
    )
    insumos.append(pipeta)

    ketamina, _ = Insumo.objects.get_or_create(
        medicamento="Ketamina 100mg/ml",
        defaults={
            "formato": "inyectable",
            "ml_contenedor": Decimal("10"),
            "dosis_ml": Decimal("0.1"),
            "peso_kg": Decimal("1"),
            "stock_actual": 20,
            "precio_venta": Decimal("12000.00"),
        },
    )
    insumos.append(ketamina)

    return {
        "amoxicilina": amoxi,
        "carprofeno": carprofeno,
        "pipeta": pipeta,
        "ketamina": ketamina,
    }


def seed_servicios(usuario):
    servicios = {}
    consulta_general, _ = Servicio.objects.get_or_create(
        nombre="Consulta general",
        defaults={
            "descripcion": "Evaluación clínica general",
            "categoria": "Clínica",
            "precio": 15000,
            "duracion": 30,
            "usuario_ultima_modificacion": usuario,
        },
    )
    servicios["consulta_general"] = consulta_general

    vacunacion, _ = Servicio.objects.get_or_create(
        nombre="Vacunación",
        defaults={
            "descripcion": "Aplicación de vacuna",
            "categoria": "Preventivo",
            "precio": 12000,
            "duracion": 15,
            "usuario_ultima_modificacion": usuario,
        },
    )
    servicios["vacunacion"] = vacunacion

    cirugia_menor, _ = Servicio.objects.get_or_create(
        nombre="Cirugía menor",
        defaults={
            "descripcion": "Procedimiento quirúrgico ambulatorio",
            "categoria": "Cirugía",
            "precio": 80000,
            "duracion": 90,
            "usuario_ultima_modificacion": usuario,
        },
    )
    servicios["cirugia_menor"] = cirugia_menor

    return servicios


def seed_propietarios_pacientes():
    propietario1, _ = Propietario.objects.get_or_create(
        email="juan.perez@example.com",
        defaults={
            "nombre": "Juan",
            "apellido": "Pérez",
            "telefono": "+56 9 1111 1111",
            "direccion": "Calle Falsa 123",
        },
    )
    paciente1, _ = Paciente.objects.get_or_create(
        nombre="Luna",
        propietario=propietario1,
        defaults={
            "especie": "canino",
            "raza": "Labrador",
            "sexo": "H",
            "edad_anos": 3,
            "color": "Negro",
            "activo": True,
        },
    )

    propietario2, _ = Propietario.objects.get_or_create(
        email="maria.garcia@example.com",
        defaults={
            "nombre": "María",
            "apellido": "García",
            "telefono": "+56 9 2222 2222",
            "direccion": "Av. Siempre Viva 742",
        },
    )
    paciente2, _ = Paciente.objects.get_or_create(
        nombre="Michi",
        propietario=propietario2,
        defaults={
            "especie": "felino",
            "raza": "Doméstico",
            "sexo": "M",
            "edad_anos": 2,
            "color": "Blanco",
            "activo": True,
        },
    )

    return [(propietario1, paciente1), (propietario2, paciente2)]


def crear_consultas(pacientes, servicios, insumos, usuario):
    consultas_creadas = []
    ahora = timezone.now()

    for propietario, paciente in pacientes:
        consulta = Consulta.objects.create(
            paciente=paciente,
            fecha=ahora - timedelta(days=2),
            veterinario=usuario,
            tipo_consulta="consulta_general",
            temperatura=Decimal("38.5"),
            peso=Decimal("{}".format(25 if paciente.especie == "canino" else 4)),
            frecuencia_cardiaca=90,
            frecuencia_respiratoria=22,
            diagnostico="Chequeo general de rutina",
            tratamiento="Reposo relativo, hidratación y control en 7 días",
            notas="Paciente tranquilo, buen apetito."
        )

        # Asociar servicios
        consulta.servicios.add(servicios["consulta_general"])  # siempre
        if paciente.especie == "canino":
            consulta.servicios.add(servicios["vacunacion"])  # ejemplo

        # Registrar insumos usados en consulta (detalle con peso para descuento futuro)
        # Nota: El cálculo de descuento real se ejecuta al confirmar la consulta
        peso_kg = consulta.peso or Decimal("1")

        # Amoxicilina
        ConsultaInsumo.objects.create(
            consulta=consulta,
            insumo=insumos["amoxicilina"],
            peso_paciente=peso_kg,
            # Dejar cálculo automático al modelo Insumo en descuento
        )

        # Carprofeno (analgésico)
        ConsultaInsumo.objects.create(
            consulta=consulta,
            insumo=insumos["carprofeno"],
            peso_paciente=peso_kg,
        )

        consultas_creadas.append(consulta)

    return consultas_creadas


def crear_hospitalizaciones(pacientes, servicios, insumos, usuario):
    hospitalizaciones_creadas = []
    ahora = timezone.now()

    for propietario, paciente in pacientes:
        # Crear solo una hospitalización para el primer paciente
        if paciente.nombre != "Luna":
            continue

        ingreso = ahora - timedelta(days=1)
        alta = ahora  # ya con alta para ejemplo cerrado

        hosp = Hospitalizacion.objects.create(
            paciente=paciente,
            veterinario=usuario,
            fecha_ingreso=ingreso,
            fecha_alta=alta,
            motivo="Dolor abdominal agudo",
            diagnostico_hosp="Gastroenteritis",
            estado="alta",
            observaciones="Buena respuesta a fluidoterapia",
        )

        # Detalle de insumos de hospitalización
        peso_kg = Decimal("25")

        HospitalizacionInsumo.objects.create(
            hospitalizacion=hosp,
            insumo=insumos["ketamina"],
            peso_paciente=peso_kg,
        )
        HospitalizacionInsumo.objects.create(
            hospitalizacion=hosp,
            insumo=insumos["amoxicilina"],
            peso_paciente=peso_kg,
        )

        hospitalizaciones_creadas.append(hosp)

    return hospitalizaciones_creadas


def main():
    usuario = get_or_create_demo_user()

    with transaction.atomic():
        insumos = seed_insumos()
        servicios = seed_servicios(usuario)
        pacientes = seed_propietarios_pacientes()

        consultas = crear_consultas(pacientes, servicios, insumos, usuario)
        hospitalizaciones = crear_hospitalizaciones(pacientes, servicios, insumos, usuario)

    print("\n✅ Datos de ejemplo creados correctamente:\n")
    print(f"Usuarios: 1 (demo.vet)")
    print(f"Insumos: {Insumo.objects.count()} total (se crearon/aseguraron 4)")
    print(f"Servicios: {Servicio.objects.count()} total (se crearon/aseguraron 3)")
    print(f"Pacientes: {Paciente.objects.count()} total (se crearon/aseguraron 2)")
    print(f"Consultas creadas en esta corrida: {len(consultas)}")
    print(f"Hospitalizaciones creadas en esta corrida: {len(hospitalizaciones)}")
    print("\nNota: No se descontó inventario automáticamente.\n" "Use los métodos de confirmación para aplicar descuentos si corresponde.")


if __name__ == "__main__":
    main()
