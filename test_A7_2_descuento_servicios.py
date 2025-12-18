"""
TEST A7.2: Historial de Descuento de Stock desde Servicios Clínicos

Valida que los descuentos de stock realizados desde discount_stock_for_services()
se registren correctamente en RegistroHistorico con tipo_evento 'salida_stock'.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from django.contrib.auth import get_user_model
from decimal import Decimal
from inventario.models import Insumo
from servicios.models import Servicio, ServicioInsumo
from historial.models import RegistroHistorico
from clinica.services.inventario_service import discount_stock_for_services

User = get_user_model()

def test_A7_2_descuento_servicios():
    print("\n" + "="*70)
    print("TEST A7.2: HISTORIAL DE DESCUENTO DE STOCK DESDE SERVICIOS")
    print("="*70)
    
    # Limpiar datos de prueba previos (primero relaciones, luego entidades)
    ServicioInsumo.objects.filter(servicio__nombre__startswith='TEST_A7.2').delete()
    Servicio.objects.filter(nombre__startswith='TEST_A7.2').delete()
    Insumo.objects.filter(medicamento__startswith='TEST_A7.2').delete()
    
    # Crear usuario de prueba
    usuario, _ = User.objects.get_or_create(
        rut='22222222-2',
        defaults={
            'correo': 'test_servicios@test.com',
            'nombre': 'Test',
            'apellido': 'Servicios',
            'rol': 'veterinario'
        }
    )
    
    print("\n1️⃣  CREAR INSUMOS CON STOCK")
    print("-" * 70)
    
    # Crear insumos
    insumo1 = Insumo.objects.create(
        medicamento='TEST_A7.2_Shampoo',
        marca='Test',
        stock_actual=10,
        precio_venta=Decimal('8000'),
        usuario_ultimo_movimiento=usuario,
        tipo_ultimo_movimiento='ingreso_stock'
    )
    
    insumo2 = Insumo.objects.create(
        medicamento='TEST_A7.2_Antipulgas',
        marca='Test',
        stock_actual=20,
        precio_venta=Decimal('15000'),
        usuario_ultimo_movimiento=usuario,
        tipo_ultimo_movimiento='ingreso_stock'
    )
    
    print(f"✅ Insumo 1 creado: {insumo1.medicamento}")
    print(f"   - Stock inicial: {insumo1.stock_actual}")
    print(f"✅ Insumo 2 creado: {insumo2.medicamento}")
    print(f"   - Stock inicial: {insumo2.stock_actual}")
    
    print("\n2️⃣  CREAR SERVICIO CON INSUMOS")
    print("-" * 70)
    
    # Crear servicio
    servicio = Servicio.objects.create(
        nombre='TEST_A7.2_Baño_Completo',
        categoria='Estética',
        precio=Decimal('25000'),
        duracion=60,
        activo=True
    )
    
    # Asociar insumos al servicio
    ServicioInsumo.objects.create(
        servicio=servicio,
        insumo=insumo1,
        cantidad=2  # Usa 2 unidades de shampoo
    )
    
    ServicioInsumo.objects.create(
        servicio=servicio,
        insumo=insumo2,
        cantidad=1  # Usa 1 unidad de antipulgas
    )
    
    print(f"✅ Servicio creado: {servicio.nombre}")
    print(f"   - Insumos asociados:")
    print(f"     • {insumo1.medicamento}: 2 unidades")
    print(f"     • {insumo2.medicamento}: 1 unidad")
    
    # Contar registros antes del descuento
    registros_antes_insumo1 = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo1.idInventario,
        tipo_evento='salida_stock'
    ).count()
    
    registros_antes_insumo2 = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo2.idInventario,
        tipo_evento='salida_stock'
    ).count()
    
    print(f"\n   - Registros de salida_stock antes:")
    print(f"     • {insumo1.medicamento}: {registros_antes_insumo1}")
    print(f"     • {insumo2.medicamento}: {registros_antes_insumo2}")
    
    print("\n3️⃣  DESCONTAR STOCK USANDO discount_stock_for_services()")
    print("-" * 70)
    
    # Simular objeto origen (podría ser una consulta, venta, etc.)
    class MockOrigen:
        def __init__(self):
            self.id = 999
            self.insumos_descontados = False
        
        def save(self, **kwargs):
            # Mock del método save() requerido por discount_stock_for_services
            self.insumos_descontados = True
    
    origen = MockOrigen()
    
    # Ejecutar descuento
    from historial.middleware import set_current_user
    set_current_user(usuario)
    
    resultado = discount_stock_for_services([servicio], usuario, origen)
    
    print(f"✅ Descuento ejecutado:")
    print(f"   - Success: {resultado['success']}")
    print(f"   - Mensaje: {resultado['mensaje']}")
    print(f"   - Insumos descontados: {len(resultado['insumos_descontados'])}")
    
    # Verificar stock actualizado
    insumo1.refresh_from_db()
    insumo2.refresh_from_db()
    
    print(f"\n   - Stock actualizado:")
    print(f"     • {insumo1.medicamento}: 10 → {insumo1.stock_actual}")
    print(f"     • {insumo2.medicamento}: 20 → {insumo2.stock_actual}")
    
    assert insumo1.stock_actual == 8, "❌ Stock de insumo1 debe ser 8"
    assert insumo2.stock_actual == 19, "❌ Stock de insumo2 debe ser 19"
    
    print("\n4️⃣  VERIFICAR REGISTROS EN HISTORIAL")
    print("-" * 70)
    
    # Verificar registro de insumo1
    registro1 = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo1.idInventario,
        tipo_evento='salida_stock'
    ).order_by('-fecha_evento').first()
    
    if registro1:
        print(f"\n✅ REGISTRO INSUMO 1 ({insumo1.medicamento}):")
        print(f"   - tipo_evento: {registro1.tipo_evento}")
        print(f"   - descripción: {registro1.descripcion}")
        print(f"   - usuario: {registro1.usuario}")
        print(f"   - criticidad: {registro1.criticidad}")
        print(f"   - datos_cambio: {registro1.datos_cambio}")
        
        # Validaciones
        assert registro1.tipo_evento == 'salida_stock', "❌ tipo_evento debe ser 'salida_stock'"
        assert registro1.usuario == usuario, "❌ Usuario incorrecto"
        assert registro1.criticidad == 'media', "❌ Criticidad debe ser 'media'"
        assert registro1.datos_cambio.get('antes') == 10, "❌ Stock anterior debe ser 10"
        assert registro1.datos_cambio.get('despues') == 8, "❌ Stock nuevo debe ser 8"
        assert registro1.datos_cambio.get('diferencia') == -2, "❌ Diferencia debe ser -2"
        
        print("\n✅ Todas las validaciones pasaron para INSUMO 1")
    else:
        print("\n❌ ERROR: No se encontró registro de salida_stock para insumo1")
        raise AssertionError("Registro de insumo1 no encontrado")
    
    # Verificar registro de insumo2
    registro2 = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo2.idInventario,
        tipo_evento='salida_stock'
    ).order_by('-fecha_evento').first()
    
    if registro2:
        print(f"\n✅ REGISTRO INSUMO 2 ({insumo2.medicamento}):")
        print(f"   - tipo_evento: {registro2.tipo_evento}")
        print(f"   - descripción: {registro2.descripcion}")
        print(f"   - usuario: {registro2.usuario}")
        print(f"   - criticidad: {registro2.criticidad}")
        print(f"   - datos_cambio: {registro2.datos_cambio}")
        
        # Validaciones
        assert registro2.tipo_evento == 'salida_stock', "❌ tipo_evento debe ser 'salida_stock'"
        assert registro2.usuario == usuario, "❌ Usuario incorrecto"
        assert registro2.criticidad == 'media', "❌ Criticidad debe ser 'media'"
        assert registro2.datos_cambio.get('antes') == 20, "❌ Stock anterior debe ser 20"
        assert registro2.datos_cambio.get('despues') == 19, "❌ Stock nuevo debe ser 19"
        assert registro2.datos_cambio.get('diferencia') == -1, "❌ Diferencia debe ser -1"
        
        print("\n✅ Todas las validaciones pasaron para INSUMO 2")
    else:
        print("\n❌ ERROR: No se encontró registro de salida_stock para insumo2")
        raise AssertionError("Registro de insumo2 no encontrado")
    
    print("\n5️⃣  VERIFICAR METADATA DEL INSUMO")
    print("-" * 70)
    
    print(f"\nInsumo 1:")
    print(f"   - tipo_ultimo_movimiento: {insumo1.tipo_ultimo_movimiento}")
    print(f"   - usuario_ultimo_movimiento: {insumo1.usuario_ultimo_movimiento}")
    print(f"   - ultimo_movimiento: {insumo1.ultimo_movimiento}")
    
    assert insumo1.tipo_ultimo_movimiento == 'salida_stock', "❌ tipo_ultimo_movimiento debe ser 'salida_stock'"
    assert insumo1.usuario_ultimo_movimiento == usuario, "❌ usuario_ultimo_movimiento debe ser el usuario test"
    assert insumo1.ultimo_movimiento is not None, "❌ ultimo_movimiento no debe ser None"
    
    print(f"\nInsumo 2:")
    print(f"   - tipo_ultimo_movimiento: {insumo2.tipo_ultimo_movimiento}")
    print(f"   - usuario_ultimo_movimiento: {insumo2.usuario_ultimo_movimiento}")
    print(f"   - ultimo_movimiento: {insumo2.ultimo_movimiento}")
    
    assert insumo2.tipo_ultimo_movimiento == 'salida_stock', "❌ tipo_ultimo_movimiento debe ser 'salida_stock'"
    assert insumo2.usuario_ultimo_movimiento == usuario, "❌ usuario_ultimo_movimiento debe ser el usuario test"
    assert insumo2.ultimo_movimiento is not None, "❌ ultimo_movimiento no debe ser None"
    
    print("\n✅ Metadata correcta en ambos insumos")
    
    # Limpiar
    set_current_user(None)
    ServicioInsumo.objects.filter(servicio=servicio).delete()
    servicio.delete()
    insumo1.delete()
    insumo2.delete()
    usuario.delete()
    
    print("\n" + "="*70)
    print("✅ TEST A7.2 COMPLETADO EXITOSAMENTE")
    print("="*70)
    print("\nCONCLUSIONES:")
    print("✅ Los descuentos de stock desde servicios se registran en RegistroHistorico")
    print("✅ Usa tipo_evento 'salida_stock' correctamente")
    print("✅ Captura usuario responsable del descuento")
    print("✅ Registra diferencias de stock correctamente")
    print("✅ Metadata del insumo (tipo_ultimo_movimiento) establecida correctamente")
    print("✅ Signal detecta y registra automáticamente sin lógica duplicada")
    print("="*70 + "\n")

if __name__ == '__main__':
    try:
        test_A7_2_descuento_servicios()
    except Exception as e:
        print(f"\n❌ ERROR EN TEST: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
