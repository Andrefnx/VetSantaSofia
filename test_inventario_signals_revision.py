"""
Test para validar que el sistema de signals de inventario
registra TODOS los cambios simultáneos, no solo el primero.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from django.utils import timezone
from decimal import Decimal
from inventario.models import Insumo
from historial.models import RegistroHistorico


def test_cambios_multiples_simultaneos():
    """
    CASO CRÍTICO: Si cambias stock + precio + descripción en UN save()
    → Debe registrar 3 eventos separados en RegistroHistorico
    """
    print("\n" + "="*70)
    print("TEST: Cambios múltiples simultáneos en Insumo")
    print("="*70)
    
    # Crear insumo inicial
    insumo = Insumo.objects.create(
        medicamento="Amoxicilina",
        marca="Laboratorios ABC",
        sku="AMX-500",
        tipo="Antibiótico",
        formato="Comprimidos",
        descripcion="Antibiótico de amplio espectro",
        precio_venta=Decimal("15000.00"),
        stock_actual=100,
        tipo_ultimo_movimiento='ingreso_stock'
    )
    print(f"\n✅ Insumo creado: {insumo.medicamento}")
    
    # Contar eventos iniciales
    eventos_antes = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.pk
    ).count()
    print(f"   Eventos registrados: {eventos_antes}")
    
    # CAMBIO MÚLTIPLE: stock + precio + descripción
    print("\n🔄 Realizando cambios múltiples simultáneos...")
    insumo.stock_actual = 80  # Cambio 1 (alta prioridad)
    insumo.tipo_ultimo_movimiento = 'salida_stock'
    insumo.precio_venta = Decimal("18000.00")  # Cambio 2 (alta)
    insumo.descripcion = "Antibiótico de amplio espectro - Nueva fórmula mejorada"  # Cambio 3 (baja)
    insumo.save()
    
    # Verificar eventos registrados
    eventos_despues = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.pk
    )
    eventos_nuevos = eventos_despues.count() - eventos_antes
    
    print(f"\n📊 RESULTADO:")
    print(f"   Eventos nuevos registrados: {eventos_nuevos}")
    print(f"   Esperado: 3 (stock + precio + descripción)")
    
    # Mostrar detalles de cada evento
    print("\n📝 Eventos registrados:")
    for evento in eventos_despues.order_by('fecha_evento'):
        print(f"   - {evento.tipo_evento} ({evento.criticidad}): {evento.descripcion[:60]}...")
        if evento.datos_cambio and 'campo' in evento.datos_cambio:
            campo = evento.datos_cambio.get('campo', 'N/A')
            antes = evento.datos_cambio.get('antes', 'N/A')
            despues = evento.datos_cambio.get('despues', 'N/A')
            print(f"     Campo: {campo} | Antes: {antes} | Después: {despues}")
    
    # Validaciones
    assert eventos_nuevos == 3, f"❌ Error: Se esperaban 3 eventos, se registraron {eventos_nuevos}"
    
    # Verificar que cada tipo de evento esté presente
    tipos_registrados = list(eventos_despues.values_list('tipo_evento', flat=True))
    assert 'salida_stock' in tipos_registrados, "❌ Falta evento de salida de stock"
    assert 'actualizacion_precio' in tipos_registrados, "❌ Falta evento de cambio de precio"
    assert 'modificacion_informacion' in tipos_registrados, "❌ Falta evento de modificación de información"
    
    print("\n" + "="*70)
    print("✅ TEST EXITOSO: Todos los cambios fueron registrados correctamente")
    print("="*70 + "\n")
    
    # Limpiar
    insumo.delete()
    RegistroHistorico.objects.filter(entidad='inventario', objeto_id=insumo.pk).delete()


def test_sin_falsos_positivos():
    """
    VALIDAR: Si guardas sin cambiar nada → NO debe registrar eventos
    """
    print("\n" + "="*70)
    print("TEST: Sin falsos positivos (save sin cambios)")
    print("="*70)
    
    insumo = Insumo.objects.create(
        medicamento="Carprofeno",
        marca="Pfizer",
        tipo="Antiinflamatorio",
        precio_venta=Decimal("25000.00"),
        stock_actual=50
    )
    print(f"\n✅ Insumo creado: {insumo.medicamento}")
    
    eventos_antes = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.pk
    ).count()
    
    # Save sin cambios
    print("\n💾 Guardando sin cambios...")
    insumo.save()
    
    eventos_despues = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.pk
    ).count()
    
    eventos_nuevos = eventos_despues - eventos_antes
    
    print(f"\n📊 RESULTADO:")
    print(f"   Eventos nuevos: {eventos_nuevos}")
    print(f"   Esperado: 0")
    
    assert eventos_nuevos == 0, f"❌ Error: Se registraron {eventos_nuevos} eventos en un save sin cambios"
    
    print("\n" + "="*70)
    print("✅ TEST EXITOSO: No se registraron falsos positivos")
    print("="*70 + "\n")
    
    insumo.delete()


def test_solo_precio_sin_stock():
    """
    VALIDAR: Si solo cambias precio (sin cambio de stock) → Debe registrar solo precio
    """
    print("\n" + "="*70)
    print("TEST: Solo cambio de precio (sin stock)")
    print("="*70)
    
    insumo = Insumo.objects.create(
        medicamento="Meloxicam",
        precio_venta=Decimal("12000.00"),
        stock_actual=30
    )
    print(f"\n✅ Insumo creado: {insumo.medicamento}")
    
    eventos_antes = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.pk
    ).count()
    
    # Cambiar solo precio
    print("\n🔄 Cambiando solo precio...")
    insumo.precio_venta = Decimal("14500.00")
    insumo.save()
    
    eventos_despues = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.pk
    )
    eventos_nuevos = eventos_despues.count() - eventos_antes
    
    print(f"\n📊 RESULTADO:")
    print(f"   Eventos nuevos: {eventos_nuevos}")
    print(f"   Esperado: 1 (solo precio)")
    
    tipos_registrados = list(eventos_despues.values_list('tipo_evento', flat=True))
    
    assert eventos_nuevos == 1, f"❌ Error: Se esperaba 1 evento, se registraron {eventos_nuevos}"
    assert 'actualizacion_precio' in tipos_registrados, "❌ Falta evento de actualización de precio"
    
    print("\n" + "="*70)
    print("✅ TEST EXITOSO: Solo se registró el cambio de precio")
    print("="*70 + "\n")
    
    insumo.delete()


def test_creacion_con_stock_cero():
    """
    VALIDAR: Crear insumo con stock=0 NO debe registrar creación (solo catálogo)
    """
    print("\n" + "="*70)
    print("TEST: Creación con stock cero (no registrar)")
    print("="*70)
    
    insumo = Insumo.objects.create(
        medicamento="Producto Nuevo",
        precio_venta=Decimal("10000.00"),
        stock_actual=0
    )
    print(f"\n✅ Insumo creado: {insumo.medicamento} (stock: 0)")
    
    eventos = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.pk
    ).count()
    
    print(f"\n📊 RESULTADO:")
    print(f"   Eventos registrados: {eventos}")
    print(f"   Esperado: 0 (no registrar productos sin stock)")
    
    assert eventos == 0, f"❌ Error: Se esperaban 0 eventos, se registraron {eventos}"
    
    print("\n" + "="*70)
    print("✅ TEST EXITOSO: No se registró creación de producto sin stock")
    print("="*70 + "\n")
    
    insumo.delete()


if __name__ == '__main__':
    test_cambios_multiples_simultaneos()
    test_sin_falsos_positivos()
    test_solo_precio_sin_stock()
    test_creacion_con_stock_cero()
    print("\n🎉 TODOS LOS TESTS PASARON CORRECTAMENTE\n")
