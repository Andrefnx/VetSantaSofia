"""
Test para validar que el sistema de signals de servicios
registra TODOS los cambios simultáneos, no solo el primero.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from django.utils import timezone
from servicios.models import Servicio
from historial.models import RegistroHistorico


def test_cambios_multiples_simultaneos():
    """
    CASO CRÍTICO: Si cambias precio + categoría + descripción en UN save()
    → Debe registrar 3 eventos separados en RegistroHistorico
    """
    print("\n" + "="*70)
    print("TEST: Cambios múltiples simultáneos en Servicio")
    print("="*70)
    
    # Crear servicio inicial
    servicio = Servicio.objects.create(
        nombre="Consulta General",
        descripcion="Consulta veterinaria básica",
        categoria="Consultas",
        precio=50000,
        duracion=30,
        activo=True
    )
    print(f"\n✅ Servicio creado: {servicio.nombre}")
    
    # Contar eventos iniciales
    eventos_antes = RegistroHistorico.objects.filter(
        entidad='servicio',
        objeto_id=servicio.pk
    ).count()
    print(f"   Eventos registrados: {eventos_antes}")
    
    # CAMBIO MÚLTIPLE: precio + categoría + descripción + estado
    print("\n🔄 Realizando cambios múltiples simultáneos...")
    servicio.precio = 60000  # Cambio 1 (alta prioridad)
    servicio.categoria = "Urgencias"  # Cambio 2 (media)
    servicio.descripcion = "Consulta veterinaria completa con urgencia"  # Cambio 3 (baja)
    servicio.activo = False  # Cambio 4 (media)
    servicio.save()
    
    # Verificar eventos registrados
    eventos_despues = RegistroHistorico.objects.filter(
        entidad='servicio',
        objeto_id=servicio.pk
    )
    eventos_nuevos = eventos_despues.count() - eventos_antes
    
    print(f"\n📊 RESULTADO:")
    print(f"   Eventos nuevos registrados: {eventos_nuevos}")
    print(f"   Esperado: 4 (precio + estado + categoría + descripción)")
    
    # Mostrar detalles de cada evento
    print("\n📝 Eventos registrados:")
    for evento in eventos_despues.order_by('fecha_evento'):
        print(f"   - {evento.tipo_evento} ({evento.criticidad}): {evento.descripcion}")
        if evento.datos_cambio:
            campo = evento.datos_cambio.get('campo', 'N/A')
            antes = evento.datos_cambio.get('antes', 'N/A')
            despues = evento.datos_cambio.get('despues', 'N/A')
            print(f"     Campo: {campo} | Antes: {antes} | Después: {despues}")
    
    # Verificar tipo_ultimo_movimiento (debe ser el de mayor prioridad)
    servicio.refresh_from_db()
    print(f"\n🔖 Trazabilidad:")
    print(f"   tipo_ultimo_movimiento: {servicio.tipo_ultimo_movimiento}")
    print(f"   Esperado: 'cambio_precio_servicio' (máxima prioridad)")
    
    # Validaciones
    assert eventos_nuevos == 4, f"❌ Error: Se esperaban 4 eventos, se registraron {eventos_nuevos}"
    assert servicio.tipo_ultimo_movimiento == 'cambio_precio_servicio', \
        f"❌ Error: tipo_ultimo_movimiento debería ser 'cambio_precio_servicio', es '{servicio.tipo_ultimo_movimiento}'"
    
    # Verificar que cada tipo de evento esté presente
    tipos_registrados = list(eventos_despues.values_list('tipo_evento', flat=True))
    assert 'cambio_precio_servicio' in tipos_registrados, "❌ Falta evento de cambio de precio"
    assert 'cambio_categoria' in tipos_registrados, "❌ Falta evento de cambio de categoría"
    assert 'desactivacion' in tipos_registrados, "❌ Falta evento de desactivación"
    assert 'modificacion_informacion' in tipos_registrados, "❌ Falta evento de modificación de información"
    
    print("\n" + "="*70)
    print("✅ TEST EXITOSO: Todos los cambios fueron registrados correctamente")
    print("="*70 + "\n")
    
    # Limpiar
    servicio.delete()
    RegistroHistorico.objects.filter(entidad='servicio', objeto_id=servicio.pk).delete()


def test_sin_falsos_positivos():
    """
    VALIDAR: Si guardas sin cambiar nada → NO debe registrar eventos
    """
    print("\n" + "="*70)
    print("TEST: Sin falsos positivos (save sin cambios)")
    print("="*70)
    
    servicio = Servicio.objects.create(
        nombre="Vacunación",
        categoria="Prevención",
        precio=30000,
        duracion=15
    )
    print(f"\n✅ Servicio creado: {servicio.nombre}")
    
    eventos_antes = RegistroHistorico.objects.filter(
        entidad='servicio',
        objeto_id=servicio.pk
    ).count()
    
    # Save sin cambios
    print("\n💾 Guardando sin cambios...")
    servicio.save()
    
    eventos_despues = RegistroHistorico.objects.filter(
        entidad='servicio',
        objeto_id=servicio.pk
    ).count()
    
    eventos_nuevos = eventos_despues - eventos_antes
    
    print(f"\n📊 RESULTADO:")
    print(f"   Eventos nuevos: {eventos_nuevos}")
    print(f"   Esperado: 0")
    
    assert eventos_nuevos == 0, f"❌ Error: Se registraron {eventos_nuevos} eventos en un save sin cambios"
    
    print("\n" + "="*70)
    print("✅ TEST EXITOSO: No se registraron falsos positivos")
    print("="*70 + "\n")
    
    servicio.delete()


if __name__ == '__main__':
    test_cambios_multiples_simultaneos()
    test_sin_falsos_positivos()
    print("\n🎉 TODOS LOS TESTS PASARON CORRECTAMENTE\n")
