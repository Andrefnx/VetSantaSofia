"""
Script para ejecutar la función de descuento de insumos
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
        print(f"\n🔧 Procesando servicio: {servicio.nombre}")
        relaciones = ServicioInsumo.objects.filter(servicio=servicio)
        
        if not relaciones.exists():
            print(f"   ℹ️  Este servicio no tiene insumos asociados")
            continue
        
        for si in relaciones:
            insumo = si.insumo
            cantidad = si.cantidad
            
            print(
                f" - Insumo: {insumo.medicamento} | "
                f"Stock antes: {insumo.stock_actual} | "
                f"Cantidad a descontar: {cantidad}"
            )
            
            if insumo.stock_actual < cantidad:
                print(f"   ⚠️  ADVERTENCIA: Stock insuficiente!")
                print(f"   Continuando de todas formas (puede resultar en stock negativo)")
            
            insumo.stock_actual -= cantidad
            insumo.save()
            
            print(f"   ✅ Stock después: {insumo.stock_actual}")
    
    consulta.insumos_descontados = True
    consulta.save()
    print("\n✅ Insumos descontados y consulta marcada como procesada")


if __name__ == "__main__":
    print("=" * 80)
    print("EJECUTANDO DESCUENTO DE INSUMOS")
    print("=" * 80)
    
    # Buscar la consulta ID 1
    try:
        consulta = Consulta.objects.get(id=1)
        print(f"\n📋 Consulta encontrada:")
        print(f"   ID: {consulta.id}")
        print(f"   Paciente: {consulta.paciente.nombre}")
        print(f"   Servicios asociados: {consulta.servicios.count()}")
        print(f"   Insumos ya descontados: {consulta.insumos_descontados}")
        
        if consulta.servicios.count() == 0:
            print("\n⚠️  Esta consulta no tiene servicios asociados")
            print("   No hay insumos para descontar")
        else:
            print("\n🚀 Iniciando descuento...")
            print("-" * 80)
            descontar_insumos_consulta(consulta)
            print("-" * 80)
        
    except Consulta.DoesNotExist:
        print("\n❌ No se encontró la consulta con ID 1")
    
    print("\n" + "=" * 80)
