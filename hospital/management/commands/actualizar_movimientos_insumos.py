from django.core.management.base import BaseCommand
from django.utils import timezone
from hospital.models import Insumo

class Command(BaseCommand):
    help = 'Actualiza los campos de movimiento de insumos existentes'

    def handle(self, *args, **options):
        insumos = Insumo.objects.all()
        actualizados = 0
        
        for insumo in insumos:
            # Si no tiene fecha de creación, asignar la actual
            if not insumo.fecha_creacion:
                insumo.fecha_creacion = timezone.now()
            
            # Si tiene stock pero no tiene movimientos registrados
            if insumo.stock_actual > 0:
                if not insumo.ultimo_ingreso:
                    insumo.ultimo_ingreso = insumo.fecha_creacion or timezone.now()
                if not insumo.ultimo_movimiento:
                    insumo.ultimo_movimiento = insumo.fecha_creacion or timezone.now()
                if not insumo.tipo_ultimo_movimiento:
                    insumo.tipo_ultimo_movimiento = 'registro_inicial'
            
            insumo.save()
            actualizados += 1
            
        self.stdout.write(
            self.style.SUCCESS(f'Se actualizaron {actualizados} insumos correctamente')
        )