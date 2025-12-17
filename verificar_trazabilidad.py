from pacientes.models import Paciente
from servicios.models import Servicio

print('✅ PACIENTE')
campos_paciente = [f.name for f in Paciente._meta.fields if 'movimiento' in f.name or 'modificacion' in f.name or f.name == 'activo']
print(f'   Campos de trazabilidad: {len(campos_paciente)}')
for campo in sorted(campos_paciente):
    print(f'   - {campo}')

print('')
print('✅ SERVICIO')
campos_servicio = [f.name for f in Servicio._meta.fields if 'movimiento' in f.name or 'modificacion' in f.name or f.name == 'activo']
print(f'   Campos de trazabilidad: {len(campos_servicio)}')
for campo in sorted(campos_servicio):
    print(f'   - {campo}')

print('')
print('✅ INVENTARIO (referencia)')
from inventario.models import Insumo
campos_inventario = [f.name for f in Insumo._meta.fields if 'movimiento' in f.name or 'modificacion' in f.name or 'usuario' in f.name]
print(f'   Campos de trazabilidad: {len(campos_inventario)}')
for campo in sorted(campos_inventario):
    print(f'   - {campo}')
