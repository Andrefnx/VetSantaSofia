"""
Script de validación para calcular_envases_requeridos()
NO modifica la base de datos - SOLO validación de lógica
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from inventario.models import Insumo
from decimal import Decimal

def crear_producto_test(formato, **kwargs):
    """Crea un producto de prueba en memoria (sin guardar en BD)"""
    producto = Insumo(
        medicamento=kwargs.get('nombre', f'Producto Test {formato}'),
        formato=formato,
        **{k: v for k, v in kwargs.items() if k != 'nombre'}
    )
    return producto

def prueba_1():
    """Líquido: 60kg, 2ml/10kg, envase 10ml → debe dar 2 envases"""
    print("\n" + "="*70)
    print("PRUEBA 1: Líquido oral - 60kg, 2ml por 10kg, envase de 10ml")
    print("="*70)
    
    producto = crear_producto_test(
        'liquido',
        nombre='Antibiótico Líquido',
        dosis_ml=Decimal('2.0'),
        peso_kg=Decimal('10.0'),
        ml_contenedor=Decimal('10.0')
    )
    
    resultado = producto.calcular_envases_requeridos(peso_paciente_kg=60, dias_tratamiento=1)
    
    print(f"Formato: {producto.formato}")
    print(f"Dosis: {producto.dosis_ml} ml por {producto.peso_kg} kg")
    print(f"Contenido envase: {producto.ml_contenedor} ml")
    print(f"\nPeso paciente: 60 kg")
    print(f"Días tratamiento: 1")
    print(f"\n{'='*50}")
    print(f"Resultado:")
    print(f"  - Envases requeridos: {resultado['envases_requeridos']}")
    print(f"  - Cálculo automático: {resultado['calculo_automatico']}")
    print(f"  - Dosis calculada: {resultado['dosis_calculada']:.2f} ml")
    print(f"  - Contenido envase: {resultado['contenido_envase']:.2f} ml")
    print(f"  - Detalle: {resultado['detalle']}")
    print(f"\n✓ ESPERADO: 2 envases (60kg/10kg = 6, 6*2ml = 12ml, 12ml/10ml = 1.2 → ceil = 2)")
    print(f"✓ RESULTADO: {'✅ CORRECTO' if resultado['envases_requeridos'] == 2 else '❌ ERROR'}")

def prueba_2():
    """Pastilla: 12kg, 1 pastilla/día, envase 10 pastillas → debe dar 1 envase"""
    print("\n" + "="*70)
    print("PRUEBA 2: Pastillas - 12kg, 1 pastilla/día, envase de 10 pastillas")
    print("="*70)
    
    producto = crear_producto_test(
        'pastilla',
        nombre='Desparasitante',
        cantidad_pastillas=1,  # 1 pastilla por dosis
        peso_kg=Decimal('10.0'),
        peso_min_kg=Decimal('5.0'),
        peso_max_kg=Decimal('15.0'),
        tiene_rango_peso=True
    )
    
    # Simular contenido del envase = 10 pastillas
    # cantidad_pastillas en el modelo representa la DOSIS, no el contenido del envase
    # Necesitamos ajustar esto...
    
    # CORRECCIÓN: cantidad_pastillas debe representar el contenido del envase
    producto.cantidad_pastillas = 10  # 10 pastillas por envase
    
    resultado = producto.calcular_envases_requeridos(peso_paciente_kg=12, dias_tratamiento=1)
    
    print(f"Formato: {producto.formato}")
    print(f"Pastillas por envase: {producto.cantidad_pastillas}")
    print(f"Peso rango: {producto.peso_min_kg} - {producto.peso_max_kg} kg")
    print(f"\nPeso paciente: 12 kg")
    print(f"Días tratamiento: 1")
    print(f"\n{'='*50}")
    print(f"Resultado:")
    print(f"  - Envases requeridos: {resultado['envases_requeridos']}")
    print(f"  - Cálculo automático: {resultado['calculo_automatico']}")
    print(f"  - Dosis calculada: {resultado['dosis_calculada']:.2f} pastillas")
    print(f"  - Contenido envase: {resultado['contenido_envase']:.2f} pastillas")
    print(f"  - Detalle: {resultado['detalle']}")
    print(f"\n✓ ESPERADO: 1 envase (1 pastilla/día * 1 día = 1 pastilla, 1/10 = 0.1 → ceil = 1)")
    print(f"✓ RESULTADO: {'✅ CORRECTO' if resultado['envases_requeridos'] == 1 else '❌ ERROR'}")

def prueba_3():
    """Inyectable: 5kg, 0.5ml/kg, envase 5ml → debe dar 1 envase"""
    print("\n" + "="*70)
    print("PRUEBA 3: Inyectable - 5kg, 0.5ml por kg, envase de 5ml")
    print("="*70)
    
    producto = crear_producto_test(
        'inyectable',
        nombre='Vacuna Injectable',
        dosis_ml=Decimal('0.5'),
        peso_kg=Decimal('1.0'),  # 0.5ml POR kg
        ml_contenedor=Decimal('5.0')
    )
    
    resultado = producto.calcular_envases_requeridos(peso_paciente_kg=5, dias_tratamiento=1)
    
    print(f"Formato: {producto.formato}")
    print(f"Dosis: {producto.dosis_ml} ml por {producto.peso_kg} kg")
    print(f"Contenido envase: {producto.ml_contenedor} ml")
    print(f"\nPeso paciente: 5 kg")
    print(f"Días tratamiento: 1")
    print(f"\n{'='*50}")
    print(f"Resultado:")
    print(f"  - Envases requeridos: {resultado['envases_requeridos']}")
    print(f"  - Cálculo automático: {resultado['calculo_automatico']}")
    print(f"  - Dosis calculada: {resultado['dosis_calculada']:.2f} ml")
    print(f"  - Contenido envase: {resultado['contenido_envase']:.2f} ml")
    print(f"  - Detalle: {resultado['detalle']}")
    print(f"\n✓ ESPERADO: 1 envase (5kg * 0.5ml/kg = 2.5ml, 2.5ml/5ml = 0.5 → ceil = 1)")
    print(f"✓ RESULTADO: {'✅ CORRECTO' if resultado['envases_requeridos'] == 1 else '❌ ERROR'}")

def prueba_4():
    """Pipeta: 8kg (rango 5-10kg), 1 unidad, caja con 3 pipetas → debe dar 1 envase"""
    print("\n" + "="*70)
    print("PRUEBA 4: Pipeta - 8kg (rango 5-10kg), caja de 3 pipetas")
    print("="*70)
    
    producto = crear_producto_test(
        'pipeta',
        nombre='Antiparasitario Pipeta',
        unidades_pipeta=3,  # 3 pipetas por caja
        peso_min_kg=Decimal('5.0'),
        peso_max_kg=Decimal('10.0'),
        tiene_rango_peso=True
    )
    
    resultado = producto.calcular_envases_requeridos(peso_paciente_kg=8, dias_tratamiento=1)
    
    print(f"Formato: {producto.formato}")
    print(f"Pipetas por caja: {producto.unidades_pipeta}")
    print(f"Peso rango: {producto.peso_min_kg} - {producto.peso_max_kg} kg")
    print(f"\nPeso paciente: 8 kg")
    print(f"Días tratamiento: 1")
    print(f"\n{'='*50}")
    print(f"Resultado:")
    print(f"  - Envases requeridos: {resultado['envases_requeridos']}")
    print(f"  - Cálculo automático: {resultado['calculo_automatico']}")
    print(f"  - Dosis calculada: {resultado['dosis_calculada']:.2f} pipetas")
    print(f"  - Contenido envase: {resultado['contenido_envase']:.2f} pipetas")
    print(f"  - Detalle: {resultado['detalle']}")
    print(f"\n✓ ESPERADO: 1 envase (1 pipeta * 1 día = 1 pipeta, 1/3 = 0.33 → ceil = 1)")
    print(f"✓ RESULTADO: {'✅ CORRECTO' if resultado['envases_requeridos'] == 1 else '❌ ERROR'}")

def prueba_5():
    """Tratamiento múltiple: 30kg, 1ml/5kg, 3 días, envase 10ml → debe dar 2 envases"""
    print("\n" + "="*70)
    print("PRUEBA 5: Tratamiento 3 días - 30kg, 1ml por 5kg, envase 10ml")
    print("="*70)
    
    producto = crear_producto_test(
        'liquido',
        nombre='Antiinflamatorio 3 días',
        dosis_ml=Decimal('1.0'),
        peso_kg=Decimal('5.0'),
        ml_contenedor=Decimal('10.0')
    )
    
    resultado = producto.calcular_envases_requeridos(peso_paciente_kg=30, dias_tratamiento=3)
    
    print(f"Formato: {producto.formato}")
    print(f"Dosis: {producto.dosis_ml} ml por {producto.peso_kg} kg")
    print(f"Contenido envase: {producto.ml_contenedor} ml")
    print(f"\nPeso paciente: 30 kg")
    print(f"Días tratamiento: 3")
    print(f"\n{'='*50}")
    print(f"Resultado:")
    print(f"  - Envases requeridos: {resultado['envases_requeridos']}")
    print(f"  - Cálculo automático: {resultado['calculo_automatico']}")
    print(f"  - Dosis calculada: {resultado['dosis_calculada']:.2f} ml")
    print(f"  - Contenido envase: {resultado['contenido_envase']:.2f} ml")
    print(f"  - Detalle: {resultado['detalle']}")
    print(f"\n✓ ESPERADO: 2 envases (30kg/5kg = 6, 6*1ml = 6ml/día, 6ml*3días = 18ml, 18ml/10ml = 1.8 → ceil = 2)")
    print(f"✓ RESULTADO: {'✅ CORRECTO' if resultado['envases_requeridos'] == 2 else '❌ ERROR'}")

def prueba_6():
    """Sin datos suficientes → debe dar 1 envase (manual)"""
    print("\n" + "="*70)
    print("PRUEBA 6: Sin datos suficientes (sin dosis definida)")
    print("="*70)
    
    producto = crear_producto_test(
        'liquido',
        nombre='Producto sin datos completos',
        ml_contenedor=Decimal('10.0')
        # SIN dosis_ml
    )
    
    resultado = producto.calcular_envases_requeridos(peso_paciente_kg=20, dias_tratamiento=1)
    
    print(f"Formato: {producto.formato}")
    print(f"Dosis: No definida")
    print(f"Contenido envase: {producto.ml_contenedor} ml")
    print(f"\n{'='*50}")
    print(f"Resultado:")
    print(f"  - Envases requeridos: {resultado['envases_requeridos']}")
    print(f"  - Cálculo automático: {resultado['calculo_automatico']}")
    print(f"  - Detalle: {resultado['detalle']}")
    print(f"\n✓ ESPERADO: 1 envase (cálculo manual), calculo_automatico=False")
    print(f"✓ RESULTADO: {'✅ CORRECTO' if resultado['envases_requeridos'] == 1 and not resultado['calculo_automatico'] else '❌ ERROR'}")

def resumen():
    """Tabla resumen de mapeo formato → campo contenedor"""
    print("\n" + "="*70)
    print("RESUMEN: MAPEO FORMATO → CAMPO CONTENEDOR")
    print("="*70)
    print(f"{'Formato':<15} {'Campo Contenedor':<25} {'Ejemplo'}")
    print("-"*70)
    print(f"{'liquido':<15} {'ml_contenedor':<25} Frasco de 100ml")
    print(f"{'inyectable':<15} {'ml_contenedor':<25} Ampolla de 10ml")
    print(f"{'pastilla':<15} {'cantidad_pastillas':<25} Blister de 10 pastillas")
    print(f"{'pipeta':<15} {'unidades_pipeta':<25} Caja con 3 pipetas")
    print(f"{'polvo':<15} {'ml_contenedor (gen.)':<25} Frasco de 50g")
    print(f"{'crema':<15} {'ml_contenedor (gen.)':<25} Tubo de 30g")
    print(f"{'otro':<15} {'ml_contenedor (gen.)':<25} Sin unidad específica")
    print("\n✓ stock_actual = número de ENVASES completos")
    print("✓ Cálculo siempre redondea HACIA ARRIBA (ceil)")
    print("✓ Sin datos suficientes → envases_requeridos = 1 (manual)")

if __name__ == '__main__':
    print("\n" + "🔬"*35)
    print("VALIDACIÓN: calcular_envases_requeridos()")
    print("Usando SOLO campos existentes del modelo Inventario")
    print("🔬"*35)
    
    try:
        resumen()
        prueba_1()
        prueba_2()
        prueba_3()
        prueba_4()
        prueba_5()
        prueba_6()
        
        print("\n" + "="*70)
        print("✅ VALIDACIÓN COMPLETADA")
        print("="*70)
        print("\nNOTA: Este script NO modifica la base de datos.")
        print("Los productos fueron creados en memoria únicamente para validar la lógica.")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
