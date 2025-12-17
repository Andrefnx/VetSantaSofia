"""
Script de prueba para verificar el funcionamiento de los signals.
"""
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from pacientes.models import Paciente, Propietario
from servicios.models import Servicio
from inventario.models import Insumo
from historial.models import RegistroHistorico

User = get_user_model()

print("=" * 60)
print("PRUEBA DE SIGNALS - SISTEMA DE HISTORIAL")
print("=" * 60)

# Obtener o crear un usuario de prueba
admin = User.objects.filter(is_superuser=True).first()
print(f"\n✅ Usuario admin: {admin.username if admin else 'No encontrado'}")

# Limpiar historial de pruebas previas
RegistroHistorico.objects.filter(objeto_id__gte=9000).delete()
print("\n🧹 Historial de pruebas previas limpiado")

# ====================
# PRUEBA 1: SERVICIO
# ====================
print("\n" + "=" * 60)
print("PRUEBA 1: CREACIÓN Y MODIFICACIÓN DE SERVICIO")
print("=" * 60)

# Crear servicio
servicio = Servicio.objects.create(
    idServicio=9001,
    nombre="Consulta de Prueba Signal",
    categoria="Consulta",
    precio=20000,
    duracion=30
)
servicio._usuario_modificacion = admin
servicio.save()

historial = RegistroHistorico.obtener_historial('servicio', 9001)
print(f"\n1. Creación: {historial.count()} eventos registrados")
if historial.exists():
    evento = historial.first()
    print(f"   - Tipo: {evento.get_tipo_evento_display()}")
    print(f"   - Descripción: {evento.descripcion}")

# Cambiar precio
servicio.precio = 25000
servicio._usuario_modificacion = admin
servicio.save()

historial = RegistroHistorico.obtener_historial('servicio', 9001)
print(f"\n2. Cambio de precio: {historial.count()} eventos totales")
ultimo = historial.first()
if ultimo and ultimo.tipo_evento == 'cambio_precio_servicio':
    print(f"   - Tipo: {ultimo.get_tipo_evento_display()}")
    print(f"   - Criticidad: {ultimo.criticidad}")
    print(f"   - Datos: {ultimo.datos_cambio}")

# Cambiar categoría
servicio.categoria = "Control"
servicio._usuario_modificacion = admin
servicio.save()

historial = RegistroHistorico.obtener_historial('servicio', 9001)
print(f"\n3. Cambio de categoría: {historial.count()} eventos totales")
ultimo = historial.first()
if ultimo and ultimo.tipo_evento == 'cambio_categoria':
    print(f"   - Tipo: {ultimo.get_tipo_evento_display()}")
    print(f"   - Descripción: {ultimo.descripcion}")

# Desactivar servicio
servicio.activo = False
servicio._usuario_modificacion = admin
servicio.save()

historial = RegistroHistorico.obtener_historial('servicio', 9001)
print(f"\n4. Desactivación: {historial.count()} eventos totales")
ultimo = historial.first()
if ultimo and ultimo.tipo_evento == 'desactivacion':
    print(f"   - Tipo: {ultimo.get_tipo_evento_display()}")

# ====================
# PRUEBA 2: PACIENTE
# ====================
print("\n" + "=" * 60)
print("PRUEBA 2: CREACIÓN Y MODIFICACIÓN DE PACIENTE")
print("=" * 60)

# Crear propietario de prueba
propietario = Propietario.objects.create(
    nombre="Juan",
    apellido="Pérez",
    telefono="+56912345678",
    email="juan.test@example.com"
)

# Crear paciente
paciente = Paciente.objects.create(
    nombre="Max",
    especie="canino",
    sexo="M",
    propietario=propietario,
    ultimo_peso=Decimal("15.5")
)
paciente._usuario_modificacion = admin
paciente.save()

historial = RegistroHistorico.obtener_historial('paciente', paciente.id)
print(f"\n1. Creación: {historial.count()} eventos registrados")
if historial.exists():
    evento = historial.first()
    print(f"   - Tipo: {evento.get_tipo_evento_display()}")
    print(f"   - Descripción: {evento.descripcion}")

# Actualizar peso
paciente.ultimo_peso = Decimal("18.2")
paciente._usuario_modificacion = admin
paciente.save()

historial = RegistroHistorico.obtener_historial('paciente', paciente.id)
print(f"\n2. Actualización de peso: {historial.count()} eventos totales")
ultimo = historial.first()
if ultimo and ultimo.tipo_evento == 'actualizacion_peso':
    print(f"   - Tipo: {ultimo.get_tipo_evento_display()}")
    print(f"   - Descripción: {ultimo.descripcion}")
    print(f"   - Datos: {ultimo.datos_cambio}")

# Actualizar alergias (CRÍTICO)
paciente.alergias = "Alergia a penicilina"
paciente._usuario_modificacion = admin
paciente.save()

historial = RegistroHistorico.obtener_historial('paciente', paciente.id)
print(f"\n3. Actualización de antecedentes: {historial.count()} eventos totales")
ultimo = historial.first()
if ultimo and ultimo.tipo_evento == 'actualizacion_antecedentes':
    print(f"   - Tipo: {ultimo.get_tipo_evento_display()}")
    print(f"   - Criticidad: {ultimo.criticidad} ⚠️")
    print(f"   - Descripción: {ultimo.descripcion}")

# ====================
# RESUMEN
# ====================
print("\n" + "=" * 60)
print("RESUMEN DE PRUEBAS")
print("=" * 60)

total_eventos = RegistroHistorico.objects.filter(objeto_id__gte=9000).count()
print(f"\n📊 Total de eventos registrados: {total_eventos}")

por_entidad = RegistroHistorico.objects.filter(objeto_id__gte=9000).values('entidad').annotate(
    total=__import__('django.db.models', fromlist=['Count']).Count('id')
)
for item in por_entidad:
    print(f"   - {item['entidad']}: {item['total']} eventos")

por_criticidad = RegistroHistorico.objects.filter(objeto_id__gte=9000).values('criticidad').annotate(
    total=__import__('django.db.models', fromlist=['Count']).Count('id')
)
print(f"\n📈 Por criticidad:")
for item in por_criticidad:
    print(f"   - {item['criticidad']}: {item['total']} eventos")

print("\n✅ PRUEBAS COMPLETADAS")
print("=" * 60)

# Limpiar datos de prueba
print("\n🧹 Limpiando datos de prueba...")
Servicio.objects.filter(idServicio=9001).delete()
Paciente.objects.filter(id=paciente.id).delete()
Propietario.objects.filter(id=propietario.id).delete()
RegistroHistorico.objects.filter(objeto_id__gte=9000).delete()
print("✅ Datos de prueba eliminados")
