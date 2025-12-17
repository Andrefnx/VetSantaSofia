"""
Test para validar que el sistema de signals de pacientes
registra TODOS los cambios simultáneos, no solo el primero.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from django.utils import timezone
from django.db import models
from pacientes.models import Paciente, Propietario
from historial.models import RegistroHistorico


def crear_propietario_test(nombre, apellido, telefono, email):
    """Helper para crear propietarios sin validación"""
    prop = Propietario(nombre=nombre, apellido=apellido, telefono=telefono, email=email)
    # Bypass custom save validation
    prop.full_clean = lambda: None
    models.Model.save(prop, force_insert=True)
    return prop


def test_cambios_multiples_simultaneos():
    """
    CASO CRÍTICO: Si cambias propietario + peso + alergias + nombre en UN save()
    → Debe registrar múltiples eventos separados en RegistroHistorico
    """
    print("\n" + "="*70)
    print("TEST: Cambios múltiples simultáneos en Paciente")
    print("="*70)
    
    # Crear dos propietarios usando helper
    propietario1 = crear_propietario_test("Juan", "Pérez", "123456789", "test1@test.com")
    propietario2 = crear_propietario_test("María", "García", "987654321", "test2@test.com")
    
    # Crear paciente inicial
    paciente = Paciente.objects.create(
        nombre="Firulais",
        especie="canino",
        raza="Labrador",
        color="Dorado",
        sexo="M",
        propietario=propietario1,
        ultimo_peso=25.5,
        alergias="",
        activo=True
    )
    print(f"\n✅ Paciente creado: {paciente.nombre}")
    
    # Contar eventos iniciales
    eventos_antes = RegistroHistorico.objects.filter(
        entidad='paciente',
        objeto_id=paciente.pk
    ).count()
    print(f"   Eventos registrados: {eventos_antes}")
    
    # CAMBIO MÚLTIPLE: propietario + peso + alergias + nombre + estado
    print("\n🔄 Realizando cambios múltiples simultáneos...")
    paciente.propietario = propietario2  # Cambio 1 (crítica - prioridad 1)
    paciente.alergias = "Alergia a penicilina"  # Cambio 2 (crítica - prioridad 2)
    paciente.ultimo_peso = 27.3  # Cambio 3 (media - prioridad 3)
    paciente.activo = False  # Cambio 4 (media - prioridad 4)
    paciente.nombre = "Firulais Jr."  # Cambio 5 (baja - prioridad 5)
    paciente.save()
    
    # Verificar eventos registrados
    eventos_despues = RegistroHistorico.objects.filter(
        entidad='paciente',
        objeto_id=paciente.pk
    )
    eventos_nuevos = eventos_despues.count() - eventos_antes
    
    print(f"\n📊 RESULTADO:")
    print(f"   Eventos nuevos registrados: {eventos_nuevos}")
    print(f"   Esperado: 5 (propietario + alergias + peso + estado + nombre)")
    
    # Mostrar detalles de cada evento
    print("\n📝 Eventos registrados:")
    for evento in eventos_despues.order_by('fecha_evento'):
        print(f"   - {evento.tipo_evento} ({evento.criticidad}): {evento.descripcion[:60]}...")
        if evento.datos_cambio and 'campo' in evento.datos_cambio:
            campo = evento.datos_cambio.get('campo', 'N/A')
            antes = evento.datos_cambio.get('antes', 'N/A')
            despues = evento.datos_cambio.get('despues', 'N/A')
            # Truncar valores largos
            if isinstance(antes, str) and len(antes) > 30:
                antes = antes[:30] + "..."
            if isinstance(despues, str) and len(despues) > 30:
                despues = despues[:30] + "..."
            print(f"     Campo: {campo} | Antes: {antes} | Después: {despues}")
    
    # Verificar tipo_ultimo_movimiento (debe ser el de mayor prioridad)
    paciente.refresh_from_db()
    print(f"\n🔖 Trazabilidad:")
    print(f"   tipo_ultimo_movimiento: {paciente.tipo_ultimo_movimiento}")
    print(f"   Esperado: 'cambio_propietario' (máxima prioridad)")
    
    # Validaciones
    assert eventos_nuevos == 5, f"❌ Error: Se esperaban 5 eventos, se registraron {eventos_nuevos}"
    assert paciente.tipo_ultimo_movimiento == 'cambio_propietario', \
        f"❌ Error: tipo_ultimo_movimiento debería ser 'cambio_propietario', es '{paciente.tipo_ultimo_movimiento}'"
    
    # Verificar que cada tipo de evento esté presente
    tipos_registrados = list(eventos_despues.values_list('tipo_evento', flat=True))
    assert 'cambio_propietario' in tipos_registrados, "❌ Falta evento de cambio de propietario"
    assert 'actualizacion_antecedentes' in tipos_registrados, "❌ Falta evento de actualización de antecedentes"
    assert 'actualizacion_peso' in tipos_registrados, "❌ Falta evento de actualización de peso"
    assert 'desactivacion' in tipos_registrados, "❌ Falta evento de desactivación"
    assert 'modificacion_informacion' in tipos_registrados, "❌ Falta evento de modificación de información"
    
    print("\n" + "="*70)
    print("✅ TEST EXITOSO: Todos los cambios fueron registrados correctamente")
    print("="*70 + "\n")
    
    # Limpiar
    paciente.delete()
    propietario1.delete()
    propietario2.delete()
    RegistroHistorico.objects.filter(entidad='paciente', objeto_id=paciente.pk).delete()


def test_sin_falsos_positivos():
    """
    VALIDAR: Si guardas sin cambiar nada → NO debe registrar eventos
    """
    print("\n" + "="*70)
    print("TEST: Sin falsos positivos (save sin cambios)")
    print("="*70)
    
    propietario = crear_propietario_test("Carlos", "López", "111222333", "test3@test.com")
    
    paciente = Paciente.objects.create(
        nombre="Michi",
        especie="felino",
        raza="Persa",
        sexo="H",
        propietario=propietario
    )
    print(f"\n✅ Paciente creado: {paciente.nombre}")
    
    eventos_antes = RegistroHistorico.objects.filter(
        entidad='paciente',
        objeto_id=paciente.pk
    ).count()
    
    # Save sin cambios
    print("\n💾 Guardando sin cambios...")
    paciente.save()
    
    eventos_despues = RegistroHistorico.objects.filter(
        entidad='paciente',
        objeto_id=paciente.pk
    ).count()
    
    eventos_nuevos = eventos_despues - eventos_antes
    
    print(f"\n📊 RESULTADO:")
    print(f"   Eventos nuevos: {eventos_nuevos}")
    print(f"   Esperado: 0")
    
    assert eventos_nuevos == 0, f"❌ Error: Se registraron {eventos_nuevos} eventos en un save sin cambios"
    
    print("\n" + "="*70)
    print("✅ TEST EXITOSO: No se registraron falsos positivos")
    print("="*70 + "\n")
    
    paciente.delete()
    propietario.delete()


def test_multiples_antecedentes_simultaneos():
    """
    VALIDAR: Si cambias varios antecedentes a la vez → Registrar todos individualmente
    """
    print("\n" + "="*70)
    print("TEST: Múltiples cambios en antecedentes médicos simultáneos")
    print("="*70)
    
    propietario = crear_propietario_test("Ana", "Martínez", "444555666", "test4@test.com")
    
    paciente = Paciente.objects.create(
        nombre="Rex",
        especie="canino",
        propietario=propietario,
        alergias="",
        enfermedades_cronicas="",
        medicamentos_actuales="",
        cirugia_previa=""
    )
    print(f"\n✅ Paciente creado: {paciente.nombre}")
    
    eventos_antes = RegistroHistorico.objects.filter(
        entidad='paciente',
        objeto_id=paciente.pk
    ).count()
    
    # Cambiar TODOS los antecedentes a la vez
    print("\n🔄 Actualizando todos los antecedentes simultáneamente...")
    paciente.alergias = "Alergia al pollo"
    paciente.enfermedades_cronicas = "Displasia de cadera"
    paciente.medicamentos_actuales = "Carprofeno 50mg"
    paciente.cirugia_previa = "Esterilización"
    paciente.save()
    
    eventos_despues = RegistroHistorico.objects.filter(
        entidad='paciente',
        objeto_id=paciente.pk
    )
    eventos_nuevos = eventos_despues.count() - eventos_antes
    
    print(f"\n📊 RESULTADO:")
    print(f"   Eventos nuevos: {eventos_nuevos}")
    print(f"   Esperado: 4 (uno por cada antecedente)")
    
    # Mostrar eventos
    print("\n📝 Eventos de antecedentes registrados:")
    for evento in eventos_despues.filter(tipo_evento='actualizacion_antecedentes').order_by('fecha_evento'):
        campo = evento.datos_cambio.get('campo', 'N/A')
        print(f"   - {campo}: {evento.descripcion[:50]}...")
    
    assert eventos_nuevos == 4, f"❌ Error: Se esperaban 4 eventos, se registraron {eventos_nuevos}"
    
    # Verificar tipo_ultimo_movimiento
    paciente.refresh_from_db()
    assert paciente.tipo_ultimo_movimiento == 'actualizacion_antecedentes', \
        f"❌ Error: tipo_ultimo_movimiento debería ser 'actualizacion_antecedentes'"
    
    print("\n" + "="*70)
    print("✅ TEST EXITOSO: Todos los antecedentes fueron registrados")
    print("="*70 + "\n")
    
    paciente.delete()
    propietario.delete()


if __name__ == '__main__':
    test_cambios_multiples_simultaneos()
    test_sin_falsos_positivos()
    test_multiples_antecedentes_simultaneos()
    print("\n🎉 TODOS LOS TESTS PASARON CORRECTAMENTE\n")
