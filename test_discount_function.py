"""
Script para probar la función de descuento de insumos de consulta
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from clinica.models import Consulta
from servicios.models import ServicioInsumo


def descontar_insumos_consulta(consulta):
    """Descuenta insumos de una consulta basándose en sus servicios"""
    consulta.refresh_from_db()
    
    if consulta.insumos_descontados:
        print("⚠️  Insumos ya descontados, no se hace nada")
        return
    
    print(f"➡️  Descontando insumos para consulta {consulta.id}")
    
    for servicio in consulta.servicios.all():
        relaciones = ServicioInsumo.objects.filter(servicio=servicio)
        
        for si in relaciones:
            insumo = si.insumo
            cantidad = si.cantidad
            
            print(
                f" - Insumo: {insumo.medicamento} | "
                f"Stock antes: {insumo.stock_actual} | "
                f"Cantidad: {cantidad}"
            )
            
            insumo.stock_actual -= cantidad
            insumo.save()
            
            print(f"   Stock después: {insumo.stock_actual}")
    
    consulta.insumos_descontados = True
    consulta.save()
    print("✅ Insumos descontados y consulta marcada")


if __name__ == "__main__":
    print("=" * 80)
    print("FUNCIÓN DE DESCUENTO DE INSUMOS - TEST")
    print("=" * 80)
    
    # Buscar una consulta de prueba
    consultas = Consulta.objects.all()
    
    if not consultas.exists():
        print("\n❌ No hay consultas en la base de datos")
    else:
        print(f"\n📋 Total de consultas: {consultas.count()}")
        
        # Mostrar consultas disponibles
        for c in consultas[:5]:
            print(f"  - Consulta {c.id}: {c.paciente.nombre} | Servicios: {c.servicios.count()} | Descontados: {c.insumos_descontados}")
        
        # Ejecutar la función si quieres probar con una consulta específica
        # Descomentar la siguiente línea y cambiar el ID
        # consulta_test = Consulta.objects.get(id=1)
        # descontar_insumos_consulta(consulta_test)
        
        print("\n💡 Para ejecutar la función, usa:")
        print("   consulta = Consulta.objects.get(id=X)")
        print("   descontar_insumos_consulta(consulta)")
    
    print("\n" + "=" * 80)
