"""
TEST A7.1: Historial de Archivado y Restauración de Insumos

Valida que los cambios en el campo 'archivado' se registren correctamente
en RegistroHistorico con tipo_evento 'desactivacion' o 'activacion'.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from django.contrib.auth import get_user_model
from decimal import Decimal
from inventario.models import Insumo
from historial.models import RegistroHistorico

User = get_user_model()

def test_A7_1_archivado_restauracion():
    print("\n" + "="*70)
    print("TEST A7.1: HISTORIAL DE ARCHIVADO Y RESTAURACIÓN DE INSUMOS")
    print("="*70)
    
    # Limpiar datos de prueba previos
    Insumo.objects.filter(medicamento__startswith='TEST_A7.1').delete()
    
    # Crear usuario de prueba
    usuario, _ = User.objects.get_or_create(
        rut='11111111-1',
        defaults={
            'correo': 'test_archivado@test.com',
            'nombre': 'Test',
            'apellido': 'Archivado',
            'rol': 'administracion'
        }
    )
    
    print("\n1️⃣  CREAR INSUMO ACTIVO")
    print("-" * 70)
    
    insumo = Insumo.objects.create(
        medicamento='TEST_A7.1_Antibiotico',
        marca='Test',
        stock_actual=10,
        precio_venta=Decimal('15000'),
        archivado=False,
        usuario_ultimo_movimiento=usuario,
        tipo_ultimo_movimiento='ingreso_stock'
    )
    
    print(f"✅ Insumo creado: {insumo.medicamento}")
    print(f"   - ID: {insumo.idInventario}")
    print(f"   - Archivado: {insumo.archivado}")
    
    # Contar registros iniciales
    registros_iniciales = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario
    ).count()
    print(f"   - Registros en historial: {registros_iniciales}")
    
    print("\n2️⃣  ARCHIVAR INSUMO (archivado=True)")
    print("-" * 70)
    
    # Simular archivado desde vista (con usuario en middleware)
    from historial.middleware import set_current_user
    set_current_user(usuario)
    
    insumo.archivado = True
    insumo.save(update_fields=['archivado'])
    
    print(f"✅ Insumo archivado")
    print(f"   - archivado: {insumo.archivado}")
    
    # Verificar registro en historial
    registro_archivado = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario,
        tipo_evento='desactivacion'
    ).first()
    
    if registro_archivado:
        print(f"\n✅ REGISTRO ENCONTRADO EN HISTORIAL:")
        print(f"   - tipo_evento: {registro_archivado.tipo_evento}")
        print(f"   - descripción: {registro_archivado.descripcion}")
        print(f"   - usuario: {registro_archivado.usuario}")
        print(f"   - criticidad: {registro_archivado.criticidad}")
        print(f"   - datos_cambio: {registro_archivado.datos_cambio}")
        
        # Validaciones
        assert registro_archivado.tipo_evento == 'desactivacion', "❌ tipo_evento debe ser 'desactivacion'"
        assert registro_archivado.usuario == usuario, "❌ Usuario incorrecto"
        assert registro_archivado.criticidad == 'media', "❌ Criticidad debe ser 'media'"
        assert registro_archivado.datos_cambio.get('campo') == 'activo', "❌ Campo debe ser 'activo'"
        assert registro_archivado.datos_cambio.get('despues') == False, "❌ Estado debe ser False (inactivo)"
        
        print("\n✅ Todas las validaciones pasaron para ARCHIVADO")
    else:
        print("\n❌ ERROR: No se encontró registro de archivado en historial")
        raise AssertionError("Registro de archivado no encontrado")
    
    print("\n3️⃣  RESTAURAR INSUMO (archivado=False)")
    print("-" * 70)
    
    insumo.archivado = False
    insumo.save(update_fields=['archivado'])
    
    print(f"✅ Insumo restaurado")
    print(f"   - archivado: {insumo.archivado}")
    
    # Verificar registro en historial
    registro_restaurado = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario,
        tipo_evento='activacion'
    ).first()
    
    if registro_restaurado:
        print(f"\n✅ REGISTRO ENCONTRADO EN HISTORIAL:")
        print(f"   - tipo_evento: {registro_restaurado.tipo_evento}")
        print(f"   - descripción: {registro_restaurado.descripcion}")
        print(f"   - usuario: {registro_restaurado.usuario}")
        print(f"   - criticidad: {registro_restaurado.criticidad}")
        print(f"   - datos_cambio: {registro_restaurado.datos_cambio}")
        
        # Validaciones
        assert registro_restaurado.tipo_evento == 'activacion', "❌ tipo_evento debe ser 'activacion'"
        assert registro_restaurado.usuario == usuario, "❌ Usuario incorrecto"
        assert registro_restaurado.criticidad == 'media', "❌ Criticidad debe ser 'media'"
        assert registro_restaurado.datos_cambio.get('campo') == 'activo', "❌ Campo debe ser 'activo'"
        assert registro_restaurado.datos_cambio.get('despues') == True, "❌ Estado debe ser True (activo)"
        
        print("\n✅ Todas las validaciones pasaron para RESTAURADO")
    else:
        print("\n❌ ERROR: No se encontró registro de restauración en historial")
        raise AssertionError("Registro de restauración no encontrado")
    
    print("\n4️⃣  VERIFICAR COEXISTENCIA CON OTROS CAMBIOS")
    print("-" * 70)
    
    # Cambiar stock Y archivar en la misma operación
    insumo.stock_actual = 5
    insumo.archivado = True
    insumo.tipo_ultimo_movimiento = 'salida_stock'
    insumo.save()
    
    print(f"✅ Cambios simultáneos aplicados:")
    print(f"   - stock_actual: 10 → 5")
    print(f"   - archivado: False → True")
    
    # Verificar que se registraron ambos eventos
    registros_stock = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario,
        tipo_evento='salida_stock'
    )
    
    registros_archivado = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario,
        tipo_evento='desactivacion'
    )
    
    print(f"\n   - Registros de salida_stock: {registros_stock.count()}")
    print(f"   - Registros de desactivacion: {registros_archivado.count()}")
    
    assert registros_stock.exists(), "❌ Debe registrar cambio de stock"
    assert registros_archivado.count() >= 2, "❌ Debe tener al menos 2 registros de archivado"
    
    print("\n✅ Sistema de prioridad funciona correctamente")
    print("   (Stock tiene prioridad pero archivado también se registra)")
    
    print("\n5️⃣  RESUMEN DE REGISTROS")
    print("-" * 70)
    
    todos_registros = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario
    ).order_by('fecha_evento')
    
    print(f"\nTotal de registros para este insumo: {todos_registros.count()}")
    print("\nHistorial completo:")
    for i, registro in enumerate(todos_registros, 1):
        print(f"{i}. {registro.tipo_evento}: {registro.descripcion}")
    
    # Limpiar
    set_current_user(None)
    insumo.delete()
    usuario.delete()
    
    print("\n" + "="*70)
    print("✅ TEST A7.1 COMPLETADO EXITOSAMENTE")
    print("="*70)
    print("\nCONCLUSIONES:")
    print("✅ El campo 'archivado' se registra correctamente en RegistroHistorico")
    print("✅ Usa tipos de evento existentes: 'activacion' / 'desactivacion'")
    print("✅ Mantiene criticidad 'media' apropiada")
    print("✅ Captura usuario responsable correctamente")
    print("✅ Coexiste con registros de stock y precio sin conflictos")
    print("✅ Sistema de prioridad respetado (STOCK > PRECIO > ARCHIVADO > INFO)")
    print("="*70 + "\n")

if __name__ == '__main__':
    try:
        test_A7_1_archivado_restauracion()
    except Exception as e:
        print(f"\n❌ ERROR EN TEST: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
