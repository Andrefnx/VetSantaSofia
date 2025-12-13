import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from servicios.models import Servicio

# Datos de servicios
servicios_data = [
    # Servicios Veterinarios Comunes
    {'nombre': 'Consulta General', 'categoria': 'Servicios Veterinarios Comunes', 'descripcion': 'Consulta médica veterinaria general', 'precio': 25000, 'duracion': 30},
    {'nombre': 'Vacunación Antirrábica', 'categoria': 'Servicios Veterinarios Comunes', 'descripcion': 'Aplicación de vacuna antirrábica', 'precio': 20000, 'duracion': 15},
    {'nombre': 'Desparasitación', 'categoria': 'Servicios Veterinarios Comunes', 'descripcion': 'Desparasitación interna y externa', 'precio': 15000, 'duracion': 10},
    {'nombre': 'Control de Salud', 'categoria': 'Servicios Veterinarios Comunes', 'descripcion': 'Control periódico de salud', 'precio': 20000, 'duracion': 25},
    {'nombre': 'Vacunación Múltiple', 'categoria': 'Servicios Veterinarios Comunes', 'descripcion': 'Aplicación de vacunas múltiples', 'precio': 35000, 'duracion': 20},
    
    # Servicios de Diagnóstico
    {'nombre': 'Radiografía', 'categoria': 'Servicios de Diagnóstico', 'descripcion': 'Estudio radiográfico', 'precio': 45000, 'duracion': 30},
    {'nombre': 'Ecografía', 'categoria': 'Servicios de Diagnóstico', 'descripcion': 'Estudio ecográfico', 'precio': 50000, 'duracion': 40},
    {'nombre': 'Análisis de Sangre', 'categoria': 'Servicios de Diagnóstico', 'descripcion': 'Hemograma completo', 'precio': 40000, 'duracion': 15},
    {'nombre': 'Examen de Orina', 'categoria': 'Servicios de Diagnóstico', 'descripcion': 'Análisis completo de orina', 'precio': 25000, 'duracion': 10},
    {'nombre': 'Electrocardiograma', 'categoria': 'Servicios de Diagnóstico', 'descripcion': 'Evaluación cardíaca', 'precio': 55000, 'duracion': 25},
    
    # Procedimientos clínicos
    {'nombre': 'Curación de Heridas', 'categoria': 'Procedimientos clínicos', 'descripcion': 'Limpieza y curación de heridas', 'precio': 30000, 'duracion': 30},
    {'nombre': 'Extracción Dental', 'categoria': 'Procedimientos clínicos', 'descripcion': 'Extracción de piezas dentales', 'precio': 40000, 'duracion': 45},
    {'nombre': 'Limpieza Dental', 'categoria': 'Procedimientos clínicos', 'descripcion': 'Profilaxis dental completa', 'precio': 50000, 'duracion': 60},
    {'nombre': 'Drenaje de Abscesos', 'categoria': 'Procedimientos clínicos', 'descripcion': 'Drenaje y limpieza de abscesos', 'precio': 35000, 'duracion': 40},
    {'nombre': 'Colocación de Sonda', 'categoria': 'Procedimientos clínicos', 'descripcion': 'Colocación de sonda urinaria o nasogástrica', 'precio': 25000, 'duracion': 20},
    
    # Cirugía
    {'nombre': 'Esterilización Hembra', 'categoria': 'Cirugía', 'descripcion': 'Ovariohisterectomía', 'precio': 80000, 'duracion': 90},
    {'nombre': 'Castración Macho', 'categoria': 'Cirugía', 'descripcion': 'Orquiectomía', 'precio': 60000, 'duracion': 60},
    {'nombre': 'Cirugía de Tejidos Blandos', 'categoria': 'Cirugía', 'descripcion': 'Cirugía general de tejidos blandos', 'precio': 100000, 'duracion': 120},
    {'nombre': 'Cesárea', 'categoria': 'Cirugía', 'descripcion': 'Cirugía cesárea de emergencia o programada', 'precio': 150000, 'duracion': 90},
    {'nombre': 'Cirugía Ortopédica', 'categoria': 'Cirugía', 'descripcion': 'Procedimientos ortopédicos', 'precio': 200000, 'duracion': 180},
    
    # Servicios Complementarios
    {'nombre': 'Baño Medicado', 'categoria': 'Servicios Complementarios', 'descripcion': 'Baño con productos medicinales', 'precio': 30000, 'duracion': 45},
    {'nombre': 'Peluquería Canina', 'categoria': 'Servicios Complementarios', 'descripcion': 'Corte y arreglo estético', 'precio': 35000, 'duracion': 60},
    {'nombre': 'Corte de Uñas', 'categoria': 'Servicios Complementarios', 'descripcion': 'Corte y limado de uñas', 'precio': 10000, 'duracion': 15},
    {'nombre': 'Limpieza de Oídos', 'categoria': 'Servicios Complementarios', 'descripcion': 'Limpieza e higiene auricular', 'precio': 15000, 'duracion': 20},
    {'nombre': 'Microchip', 'categoria': 'Servicios Complementarios', 'descripcion': 'Implantación de microchip de identificación', 'precio': 40000, 'duracion': 15},
    
    # Otro
    {'nombre': 'Hospedaje Diurno', 'categoria': 'Otro', 'descripcion': 'Cuidado diurno de mascotas', 'precio': 25000, 'duracion': 480},
    {'nombre': 'Eutanasia', 'categoria': 'Otro', 'descripcion': 'Procedimiento de eutanasia humanitaria', 'precio': 50000, 'duracion': 30},
    {'nombre': 'Certificado Veterinario', 'categoria': 'Otro', 'descripcion': 'Emisión de certificado de salud', 'precio': 20000, 'duracion': 20},
    {'nombre': 'Asesoría Nutricional', 'categoria': 'Otro', 'descripcion': 'Consulta nutricional especializada', 'precio': 30000, 'duracion': 40},
    {'nombre': 'Urgencia 24h', 'categoria': 'Otro', 'descripcion': 'Atención de urgencia fuera de horario', 'precio': 80000, 'duracion': 60}
]

# Actualizar/Crear servicios
print("Actualizando servicios...")
for servicio_data in servicios_data:
    servicio, created = Servicio.objects.update_or_create(
        nombre=servicio_data['nombre'],
        defaults=servicio_data
    )
    if created:
        print(f"  ✓ Creado: {servicio.nombre} ({servicio.categoria})")
    else:
        print(f"  ↻ Actualizado: {servicio.nombre} ({servicio.categoria})")

print(f"\n✅ Se crearon exitosamente {len(servicios_data)} servicios")

# Mostrar resumen por categoría
print("\n📊 Resumen por categoría:")
categorias = Servicio.objects.values_list('categoria', flat=True).distinct()
for categoria in categorias:
    count = Servicio.objects.filter(categoria=categoria).count()
    print(f"  • {categoria}: {count} servicios")
