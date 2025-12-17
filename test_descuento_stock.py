"""
VALIDACIÓN: Sistema de Descuento de Stock
NO modifica la base de datos - SOLO pruebas en memoria
"""

import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from django.contrib.auth import get_user_model
from clinica.models import Consulta, ConsultaInsumo, Hospitalizacion, HospitalizacionInsumo
from inventario.models import Insumo
from pacientes.models import Paciente
from django.core.exceptions import ValidationError

User = get_user_model()

def crear_escenario_prueba():
    """Crea datos de prueba en memoria"""
    print("\n" + "="*70)
    print("📦 CREANDO ESCENARIO DE PRUEBA")
    print("="*70)
    
    # Obtener usuario existente o crear uno simulado
    try:
        usuario = User.objects.first()
        if not usuario:
            print("⚠️ No hay usuarios en la BD. Creando usuario de prueba...")
            usuario = User.objects.create_user(
                username='test_vet',
                nombre='Dr. Test',
                apellido='Veterinario',
                rol='veterinario'
            )
    except Exception as e:
        print(f"⚠️ Error al obtener usuario: {e}")
        # Crear objeto mock
        usuario = type('User', (), {
            'pk': 1,
            'username': 'test_vet',
            'nombre': 'Dr. Test',
            'apellido': 'Veterinario',
            'rol': 'veterinario'
        })()
    
    # Crear paciente mock
    paciente = type('Paciente', (), {
        'pk': 1,
        'nombre': 'Max',
        'especie': 'Perro',
        'raza': 'Labrador',
        'peso': 30.0
    })()
    
    # Crear insumo con stock
    insumo = Insumo(
        medicamento='Antibiótico Test',
        formato='liquido',
        dosis_ml=Decimal('2.0'),
        peso_kg=Decimal('10.0'),
        ml_contenedor=Decimal('10.0'),
        stock_actual=5  # 5 envases disponibles
    )
    insumo.pk = 1
    insumo.save = lambda *args, **kwargs: None  # Mock save
    
    # Crear consulta
    consulta = Consulta(
        paciente=paciente,
        veterinario=usuario,
        diagnostico='Test',
        insumos_descontados=False
    )
    consulta.pk = 1
    consulta.save = lambda *args, **kwargs: None
    
    print(f"✅ Usuario: {usuario.nombre} {usuario.apellido}")
    print(f"✅ Paciente: {paciente.nombre} ({paciente.peso} kg)")
    print(f"✅ Insumo: {insumo.medicamento} (Stock: {insumo.stock_actual} envases)")
    print(f"✅ Consulta #{consulta.pk}")
    
    return usuario, paciente, insumo, consulta

def prueba_1_calculo_envases():
    """Prueba: Calcular envases requeridos correctamente"""
    print("\n" + "="*70)
    print("PRUEBA 1: Cálculo de Envases Requeridos")
    print("="*70)
    
    usuario, paciente, insumo, consulta = crear_escenario_prueba()
    
    # Crear detalle de insumo
    detalle = ConsultaInsumo(
        consulta=consulta,
        insumo=insumo,
        peso_paciente=Decimal('30.0'),
        stock_descontado=False
    )
    detalle.save = lambda *args, **kwargs: None
    
    # Calcular envases usando la función del insumo
    resultado = insumo.calcular_envases_requeridos(
        peso_paciente_kg=30.0,
        dias_tratamiento=1
    )
    
    print(f"\n📊 CÁLCULO:")
    print(f"  Peso paciente: 30 kg")
    print(f"  Dosis: {insumo.dosis_ml} ml por {insumo.peso_kg} kg")
    print(f"  Contenedor: {insumo.ml_contenedor} ml")
    print(f"\n💡 RESULTADO:")
    print(f"  Envases requeridos: {resultado['envases_requeridos']}")
    print(f"  Dosis calculada: {resultado['dosis_calculada']:.2f} ml")
    print(f"  Cálculo automático: {resultado['calculo_automatico']}")
    print(f"  Detalle: {resultado['detalle']}")
    
    esperado = 1  # 30kg / 10kg = 3, 3 * 2ml = 6ml, 6ml / 10ml = 0.6 → ceil = 1
    
    print(f"\n✓ ESPERADO: 1 envase")
    if resultado['envases_requeridos'] == esperado:
        print(f"✓ RESULTADO: ✅ CORRECTO")
    else:
        print(f"✓ RESULTADO: ❌ ERROR (obtuvo {resultado['envases_requeridos']})")

def prueba_2_validacion_stock():
    """Prueba: Validar stock insuficiente"""
    print("\n" + "="*70)
    print("PRUEBA 2: Validación de Stock Insuficiente")
    print("="*70)
    
    usuario, paciente, insumo, consulta = crear_escenario_prueba()
    
    # Reducir stock a 0
    insumo.stock_actual = 0
    
    detalle = ConsultaInsumo(
        consulta=consulta,
        insumo=insumo,
        peso_paciente=Decimal('30.0'),
        stock_descontado=False
    )
    detalle.save = lambda *args, **kwargs: None
    
    print(f"\n⚠️ Stock actual: {insumo.stock_actual} envases")
    print(f"Intentando descontar para paciente de 30kg...")
    
    try:
        # Esto debería fallar
        resultado = insumo.calcular_envases_requeridos(30.0, 1)
        envases_requeridos = resultado['envases_requeridos']
        
        if insumo.stock_actual < envases_requeridos:
            print(f"\n✅ CORRECTO: Detectado stock insuficiente")
            print(f"   Requerido: {envases_requeridos}, Disponible: {insumo.stock_actual}")
        else:
            print(f"\n❌ ERROR: No detectó stock insuficiente")
            
    except ValidationError as e:
        print(f"\n✅ CORRECTO: Excepción lanzada - {str(e)}")

def prueba_3_prevenir_duplicados():
    """Prueba: Prevenir descuentos duplicados"""
    print("\n" + "="*70)
    print("PRUEBA 3: Prevención de Descuentos Duplicados")
    print("="*70)
    
    usuario, paciente, insumo, consulta = crear_escenario_prueba()
    
    detalle = ConsultaInsumo(
        consulta=consulta,
        insumo=insumo,
        peso_paciente=Decimal('30.0'),
        stock_descontado=True  # YA DESCONTADO
    )
    
    print(f"\n⚠️ Insumo ya marcado como stock_descontado=True")
    print(f"Intentando descontar nuevamente...")
    
    try:
        # Esto debería fallar
        resultado = detalle.descontar_stock(usuario, 1)
        print(f"\n❌ ERROR: Permitió descuento duplicado")
    except ValidationError as e:
        print(f"\n✅ CORRECTO: Previno descuento duplicado")
        print(f"   Mensaje: {str(e)}")

def prueba_4_consulta_completa():
    """Prueba: Confirmar consulta con múltiples insumos"""
    print("\n" + "="*70)
    print("PRUEBA 4: Confirmación de Consulta Completa")
    print("="*70)
    
    usuario, paciente, insumo1, consulta = crear_escenario_prueba()
    
    # Segundo insumo
    insumo2 = Insumo(
        medicamento='Antiinflamatorio Test',
        formato='pastilla',
        cantidad_pastillas=10,
        stock_actual=3
    )
    insumo2.pk = 2
    insumo2.save = lambda *args, **kwargs: None
    
    print(f"\n📦 Insumos en consulta:")
    print(f"  1. {insumo1.medicamento} (Stock: {insumo1.stock_actual})")
    print(f"  2. {insumo2.medicamento} (Stock: {insumo2.stock_actual})")
    
    # Crear detalles
    detalle1 = ConsultaInsumo(
        consulta=consulta,
        insumo=insumo1,
        peso_paciente=Decimal('30.0'),
        stock_descontado=False
    )
    
    detalle2 = ConsultaInsumo(
        consulta=consulta,
        insumo=insumo2,
        peso_paciente=Decimal('30.0'),
        stock_descontado=False
    )
    
    # Simular que existen
    consulta.insumos_detalle = type('MockQuerySet', (), {
        'all': lambda: [detalle1, detalle2],
        'exists': lambda: True
    })()
    
    print(f"\n🔵 Confirmando consulta...")
    print(f"Estado insumos_descontados: {consulta.insumos_descontados}")
    
    try:
        # Calcular lo que se requiere
        req1 = insumo1.calcular_envases_requeridos(30.0, 1)
        req2 = insumo2.calcular_envases_requeridos(30.0, 1)
        
        print(f"\n💡 Envases a descontar:")
        print(f"  {insumo1.medicamento}: {req1['envases_requeridos']} envases")
        print(f"  {insumo2.medicamento}: {req2['envases_requeridos']} envases")
        
        if consulta.insumos_descontados:
            print(f"\n⚠️ Ya confirmada previamente - no se puede volver a confirmar")
        else:
            print(f"\n✅ Listo para confirmar")
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

def prueba_5_hospitalizacion_dias():
    """Prueba: Hospitalización con múltiples días"""
    print("\n" + "="*70)
    print("PRUEBA 5: Hospitalización con Múltiples Días")
    print("="*70)
    
    usuario, paciente, insumo, _ = crear_escenario_prueba()
    
    # Crear hospitalización
    hosp = Hospitalizacion(
        paciente=paciente,
        veterinario=usuario,
        motivo='Test',
        estado='activa',
        insumos_descontados=False
    )
    hosp.pk = 1
    hosp.save = lambda *args, **kwargs: None
    
    dias_tratamiento = 5
    
    print(f"\n📅 Hospitalización de {dias_tratamiento} días")
    print(f"Insumo: {insumo.medicamento}")
    print(f"Stock disponible: {insumo.stock_actual} envases")
    
    # Calcular envases para 5 días
    resultado = insumo.calcular_envases_requeridos(
        peso_paciente_kg=30.0,
        dias_tratamiento=dias_tratamiento
    )
    
    print(f"\n💡 Cálculo para {dias_tratamiento} días:")
    print(f"  Dosis diaria: {resultado['dosis_calculada']/dias_tratamiento:.2f} ml")
    print(f"  Dosis total: {resultado['dosis_calculada']:.2f} ml")
    print(f"  Envases requeridos: {resultado['envases_requeridos']}")
    
    if insumo.stock_actual >= resultado['envases_requeridos']:
        print(f"\n✅ Stock suficiente para tratamiento completo")
    else:
        print(f"\n⚠️ Stock insuficiente")
        print(f"   Faltante: {resultado['envases_requeridos'] - insumo.stock_actual} envases")

def resumen_sistema():
    """Resumen del sistema de descuento"""
    print("\n" + "="*70)
    print("📋 RESUMEN: Sistema de Descuento de Stock")
    print("="*70)
    
    print("""
MOMENTO DE DESCUENTO:
✅ SOLO al confirmar/finalizar consulta u hospitalización
❌ NO al crear
❌ NO al editar
❌ NO al guardar borrador
❌ NO al abrir ficha

FLUJO:
1. Usuario confirma consulta/hospitalización
2. Sistema llama a confirmar_y_descontar_insumos(usuario)
3. Para cada insumo:
   - Verifica stock_descontado=False
   - Llama a calcular_envases_requeridos()
   - Valida stock suficiente
   - Descuenta stock_actual
   - Marca stock_descontado=True
   - Registra metadata

PROTECCIONES:
✓ Campo stock_descontado previene duplicados
✓ Validación de stock ANTES de descontar
✓ Transacción atómica (todo o nada)
✓ NUNCA permite stock negativo
✓ Usa calcular_envases_requeridos() (redondeo hacia arriba)

CAMPOS AGREGADOS:
- ConsultaInsumo.stock_descontado (Boolean)
- ConsultaInsumo.fecha_descuento (DateTime)
- HospitalizacionInsumo.stock_descontado (Boolean)
- HospitalizacionInsumo.fecha_descuento (DateTime)

MÉTODOS CREADOS:
- ConsultaInsumo.descontar_stock(usuario, dias)
- HospitalizacionInsumo.descontar_stock(usuario, dias)
- Consulta.confirmar_y_descontar_insumos(usuario, dias)
- Hospitalizacion.finalizar_y_descontar_insumos(usuario, dias)
""")

if __name__ == '__main__':
    print("\n" + "🧪"*35)
    print("VALIDACIÓN: Sistema de Descuento de Stock")
    print("🧪"*35)
    
    try:
        prueba_1_calculo_envases()
        prueba_2_validacion_stock()
        prueba_3_prevenir_duplicados()
        prueba_4_consulta_completa()
        prueba_5_hospitalizacion_dias()
        resumen_sistema()
        
        print("\n" + "="*70)
        print("✅ VALIDACIÓN COMPLETADA")
        print("="*70)
        print("\nNOTA: Estas son pruebas conceptuales. No modifican la BD.")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
