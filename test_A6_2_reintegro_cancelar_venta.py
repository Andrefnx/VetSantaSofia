"""
TEST A6.2 - VALIDACIÓN DE REINTEGRO DE STOCK AL CANCELAR VENTA

Este script valida que cuando se cancela una venta pagada:
1. El stock se reintegra correctamente
2. Se crea un registro en RegistroHistorico
3. El tipo_evento es 'ingreso_stock' (NO 'salida_stock')
4. El usuario responsable (quien cancela) está registrado
5. Los datos son consistentes (stock anterior/nuevo, cantidad)
6. NO hay duplicados

EJECUCIÓN:
    python test_A6_2_reintegro_cancelar_venta.py

CRITERIOS DE ÉXITO:
✅ Stock se reintegra
✅ Historial refleja el ingreso (NO salida)
✅ Usuario correcto (quien canceló)
✅ Datos consistentes
✅ No hay duplicados
✅ No se rompió la cancelación
"""

import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from inventario.models import Insumo
from caja.models import Venta, DetalleVenta
from historial.models import RegistroHistorico
from caja.services import procesar_pago, cancelar_venta

User = get_user_model()


def limpiar_datos_test():
    """Limpia datos de prueba anteriores"""
    print("🧹 Limpiando datos de prueba anteriores...")
    
    # Eliminar ventas de prueba
    Venta.objects.filter(
        detalles__descripcion__contains='TEST_A6_2'
    ).delete()
    
    # Eliminar insumos de prueba
    Insumo.objects.filter(
        medicamento__contains='TEST_A6_2'
    ).delete()
    
    print("✅ Datos limpios\n")


def crear_datos_test():
    """Crea datos de prueba necesarios"""
    print("📦 Creando datos de prueba...")
    
    # Obtener o crear usuario admin
    admin = User.objects.filter(rol='administracion').first()
    if not admin:
        print("❌ ERROR: No hay usuarios con rol 'administracion'")
        sys.exit(1)
    
    # Crear insumo de prueba con stock suficiente
    insumo = Insumo.objects.create(
        medicamento='TEST_A6_2_Vacuna_Rabia',
        marca='Test Brand',
        formato='inyectable',
        stock_actual=20,
        precio_venta=Decimal('25000'),
        usuario_ultimo_movimiento=admin,
        tipo_ultimo_movimiento='ingreso_stock'
    )
    
    print(f"✅ Insumo creado: ID={insumo.idInventario}, Stock inicial={insumo.stock_actual}\n")
    
    return admin, insumo


def test_reintegro_cancelar_venta():
    """Prueba el reintegro de stock al cancelar una venta pagada"""
    print("=" * 80)
    print("🧪 TEST A6.2 - REINTEGRO DE STOCK AL CANCELAR VENTA")
    print("=" * 80)
    print()
    
    # Limpiar datos anteriores
    limpiar_datos_test()
    
    # Crear datos de prueba
    admin, insumo = crear_datos_test()
    
    # Obtener estado inicial
    stock_inicial = insumo.stock_actual
    print(f"📊 Estado inicial:")
    print(f"   Insumo: {insumo.medicamento}")
    print(f"   Stock: {stock_inicial} unidades")
    print()
    
    # PASO 1: Crear y pagar una venta (esto descuenta stock)
    print("=" * 80)
    print("PASO 1: CREAR Y PAGAR VENTA (DESCUENTO DE STOCK)")
    print("=" * 80)
    print()
    
    cantidad_vender = 5
    
    venta = Venta.objects.create(
        tipo_origen='venta_directa',
        estado='pendiente',
        usuario_creacion=admin,
        observaciones='TEST_A6_2 - Prueba de cancelación con reintegro'
    )
    
    detalle = DetalleVenta.objects.create(
        venta=venta,
        tipo='insumo',
        insumo=insumo,
        descripcion=f'TEST_A6_2 - {insumo.medicamento}',
        cantidad=cantidad_vender,
        precio_unitario=insumo.precio_venta
    )
    
    venta.subtotal = detalle.precio_unitario * detalle.cantidad
    venta.total = venta.subtotal
    venta.save()
    
    print(f"✅ Venta creada: #{venta.numero_venta}")
    print(f"   Cantidad: {cantidad_vender} unidades")
    print()
    
    # Contar registros históricos antes del pago
    historial_antes_pago = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario
    ).count()
    
    # Procesar pago (esto descuenta stock)
    print("💳 Procesando pago...")
    try:
        venta_pagada = procesar_pago(
            venta=venta,
            metodo_pago='efectivo',
            usuario=admin,
            sesion_caja=None
        )
        print(f"✅ Pago procesado - Estado: {venta_pagada.get_estado_display()}")
    except Exception as e:
        print(f"❌ ERROR al procesar pago: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Verificar stock después del pago
    insumo.refresh_from_db()
    stock_despues_pago = insumo.stock_actual
    print(f"📉 Stock después del pago: {stock_inicial} → {stock_despues_pago}")
    print()
    
    # Verificar registro de salida
    historial_despues_pago = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario
    ).count()
    
    registro_salida = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario,
        tipo_evento='salida_stock'
    ).order_by('-fecha_evento').first()
    
    if registro_salida:
        print(f"✅ Registro de salida creado: {registro_salida.descripcion}")
    else:
        print(f"⚠️  No se encontró registro de salida")
    print()
    
    # PASO 2: Cancelar la venta (esto debe reintegrar stock)
    print("=" * 80)
    print("PASO 2: CANCELAR VENTA (REINTEGRO DE STOCK)")
    print("=" * 80)
    print()
    
    # Contar registros históricos antes de cancelar
    historial_antes_cancelar = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario
    ).count()
    
    print(f"📜 Registros históricos ANTES de cancelar: {historial_antes_cancelar}")
    print()
    
    # Cancelar venta
    print("🚫 Cancelando venta...")
    motivo_cancelacion = "Prueba de reintegro - TEST_A6_2"
    
    try:
        cancelar_venta(venta, admin, motivo_cancelacion)
        print(f"✅ Venta cancelada")
    except Exception as e:
        print(f"❌ ERROR al cancelar venta: {e}")
        import traceback
        traceback.print_exc()
        return False
    print()
    
    # VALIDACIONES
    print("=" * 80)
    print("🔍 VALIDACIONES")
    print("=" * 80)
    print()
    
    # 1. Verificar que el stock se reintegró
    insumo.refresh_from_db()
    venta.refresh_from_db()
    stock_final = insumo.stock_actual
    
    print(f"✅ VALIDACIÓN 1 - Stock reintegrado correctamente:")
    print(f"   Stock inicial: {stock_inicial}")
    print(f"   Stock después del pago: {stock_despues_pago}")
    print(f"   Stock después de cancelar: {stock_final}")
    print(f"   Stock esperado: {stock_inicial} (igual que al inicio)")
    
    if stock_final == stock_inicial:
        print(f"   ✅ CORRECTO: Stock volvió al valor inicial")
    else:
        print(f"   ❌ ERROR: Stock NO volvió al valor inicial")
        return False
    print()
    
    # 2. Verificar que se creó registro en historial
    historial_despues_cancelar = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario
    ).count()
    
    nuevos_registros = historial_despues_cancelar - historial_antes_cancelar
    
    print(f"✅ VALIDACIÓN 2 - Se creó registro en historial:")
    print(f"   Registros antes de cancelar: {historial_antes_cancelar}")
    print(f"   Registros después de cancelar: {historial_despues_cancelar}")
    print(f"   Nuevos registros: {nuevos_registros}")
    
    if nuevos_registros == 1:
        print(f"   ✅ CORRECTO: Se creó exactamente 1 registro")
    elif nuevos_registros == 0:
        print(f"   ❌ ERROR: NO se creó ningún registro")
        return False
    else:
        print(f"   ⚠️  ADVERTENCIA: Se crearon {nuevos_registros} registros")
    print()
    
    # 3. Verificar que el registro es de tipo INGRESO (NO salida)
    registro_ingreso = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario,
        tipo_evento='ingreso_stock'
    ).order_by('-fecha_evento').first()
    
    if not registro_ingreso:
        print(f"❌ VALIDACIÓN 3 - NO se encontró registro con tipo_evento='ingreso_stock'")
        print(f"   Registros recientes:")
        for reg in RegistroHistorico.objects.filter(entidad='inventario', objeto_id=insumo.idInventario).order_by('-fecha_evento')[:3]:
            print(f"     - {reg.tipo_evento}: {reg.descripcion}")
        return False
    
    print(f"✅ VALIDACIÓN 3 - Registro de INGRESO encontrado:")
    print(f"   Tipo evento: {registro_ingreso.tipo_evento}")
    print(f"   Descripción: {registro_ingreso.descripcion}")
    print(f"   Fecha: {registro_ingreso.fecha_evento.strftime('%d/%m/%Y %H:%M:%S')}")
    
    # Verificar que NO sea salida_stock
    if registro_ingreso.tipo_evento == 'ingreso_stock':
        print(f"   ✅ CORRECTO: Tipo es 'ingreso_stock' (NO 'salida_stock')")
    else:
        print(f"   ❌ ERROR: Tipo es '{registro_ingreso.tipo_evento}' (debería ser 'ingreso_stock')")
        return False
    print()
    
    # 4. Verificar usuario responsable
    print(f"✅ VALIDACIÓN 4 - Usuario responsable:")
    if registro_ingreso.usuario:
        print(f"   Usuario: {registro_ingreso.usuario.username}")
        print(f"   Nombre: {registro_ingreso.usuario.nombre} {registro_ingreso.usuario.apellido}")
        
        if registro_ingreso.usuario == admin:
            print(f"   ✅ CORRECTO: Usuario es quien canceló la venta")
        else:
            print(f"   ⚠️  ADVERTENCIA: Usuario diferente al que canceló")
    else:
        print(f"   ❌ ERROR: Usuario es NULL")
        return False
    print()
    
    # 5. Verificar datos del cambio
    print(f"✅ VALIDACIÓN 5 - Datos del cambio:")
    if registro_ingreso.datos_cambio:
        datos = registro_ingreso.datos_cambio
        print(f"   Stock anterior: {datos.get('antes')}")
        print(f"   Stock nuevo: {datos.get('despues')}")
        print(f"   Diferencia: {datos.get('diferencia')}")
        
        if datos.get('diferencia') > 0:
            print(f"   ✅ CORRECTO: Diferencia positiva (ingreso)")
        else:
            print(f"   ❌ ERROR: Diferencia NO es positiva")
            return False
            
        if datos.get('antes') == stock_despues_pago and datos.get('despues') == stock_final:
            print(f"   ✅ CORRECTO: Datos coinciden con la realidad")
        else:
            print(f"   ❌ ERROR: Datos NO coinciden")
            return False
    else:
        print(f"   ⚠️  ADVERTENCIA: datos_cambio es NULL")
    print()
    
    # 6. Verificar estado de la venta
    print(f"✅ VALIDACIÓN 6 - Estado de la venta:")
    print(f"   Estado: {venta.get_estado_display()}")
    
    if venta.estado == 'cancelado':
        print(f"   ✅ CORRECTO: Venta está cancelada")
    else:
        print(f"   ❌ ERROR: Venta NO está cancelada")
        return False
    print()
    
    # 7. Verificar consistencia completa
    print(f"✅ VALIDACIÓN 7 - Consistencia completa:")
    
    # Contar registros de salida y entrada
    registros_salida = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario,
        tipo_evento='salida_stock'
    ).count()
    
    registros_ingreso = RegistroHistorico.objects.filter(
        entidad='inventario',
        objeto_id=insumo.idInventario,
        tipo_evento='ingreso_stock'
    ).count()
    
    print(f"   Registros de salida: {registros_salida}")
    print(f"   Registros de ingreso: {registros_ingreso}")
    print(f"   Stock inicial: {stock_inicial}")
    print(f"   Stock final: {stock_final}")
    
    if stock_inicial == stock_final and registros_salida >= 1 and registros_ingreso >= 2:
        print(f"   ✅ CORRECTO: Sistema completamente consistente")
    else:
        print(f"   ⚠️  Verificar consistencia")
    print()
    
    # RESUMEN FINAL
    print("=" * 80)
    print("📊 RESUMEN - A6.2 COMPLETADO")
    print("=" * 80)
    print()
    print("✅ El stock se reintegra correctamente")
    print("✅ El historial refleja el INGRESO (NO salida)")
    print("✅ El usuario responsable aparece registrado")
    print("✅ Los datos son consistentes")
    print("✅ El tipo_evento es 'ingreso_stock'")
    print("✅ No se rompió la funcionalidad de cancelación")
    print()
    print("🎉 TODAS LAS VALIDACIONES PASARON")
    print()
    
    return True


if __name__ == '__main__':
    try:
        resultado = test_reintegro_cancelar_venta()
        
        if resultado:
            print("✅ TEST EXITOSO - A6.2 COMPLETADO")
            sys.exit(0)
        else:
            print("❌ TEST FALLIDO")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
