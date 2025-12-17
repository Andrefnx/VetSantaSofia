"""
Script para crear 15 servicios veterinarios en la base de datos.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'veteriaria.settings')
django.setup()

from servicios.models import Servicio

def crear_servicios():
    """Crea 15 servicios veterinarios comunes."""
    
    servicios_data = [
        {
            'nombre': 'Consulta Veterinaria General',
            'descripcion': 'Consulta general de rutina, examen físico completo y diagnóstico inicial',
            'categoria': 'Consultas',
            'precio': 25000,
            'duracion': 30
        },
        {
            'nombre': 'Vacunación Antirrábica',
            'descripcion': 'Aplicación de vacuna antirrábica obligatoria',
            'categoria': 'Vacunación',
            'precio': 15000,
            'duracion': 15
        },
        {
            'nombre': 'Vacunación Múltiple (Séxtuple/Óctuple)',
            'descripcion': 'Vacuna múltiple que protege contra diversas enfermedades',
            'categoria': 'Vacunación',
            'precio': 30000,
            'duracion': 15
        },
        {
            'nombre': 'Desparasitación Interna',
            'descripcion': 'Desparasitación con medicamento oral o inyectable',
            'categoria': 'Medicina Preventiva',
            'precio': 12000,
            'duracion': 15
        },
        {
            'nombre': 'Esterilización/Castración Canino',
            'descripcion': 'Cirugía de esterilización o castración para perros',
            'categoria': 'Cirugía',
            'precio': 80000,
            'duracion': 90
        },
        {
            'nombre': 'Esterilización/Castración Felino',
            'descripcion': 'Cirugía de esterilización o castración para gatos',
            'categoria': 'Cirugía',
            'precio': 60000,
            'duracion': 60
        },
        {
            'nombre': 'Limpieza Dental con Anestesia',
            'descripcion': 'Profilaxis dental completa bajo anestesia general',
            'categoria': 'Odontología',
            'precio': 70000,
            'duracion': 60
        },
        {
            'nombre': 'Corte de Uñas',
            'descripcion': 'Corte y limado de uñas profesional',
            'categoria': 'Estética',
            'precio': 8000,
            'duracion': 15
        },
        {
            'nombre': 'Baño y Peluquería Completa',
            'descripcion': 'Baño, secado, corte de pelo y arreglo completo',
            'categoria': 'Estética',
            'precio': 35000,
            'duracion': 60
        },
        {
            'nombre': 'Radiografía Digital',
            'descripcion': 'Toma e interpretación de radiografía digital',
            'categoria': 'Diagnóstico',
            'precio': 40000,
            'duracion': 30
        },
        {
            'nombre': 'Análisis de Sangre Básico',
            'descripcion': 'Hemograma y perfil bioquímico básico',
            'categoria': 'Laboratorio',
            'precio': 45000,
            'duracion': 15
        },
        {
            'nombre': 'Ecografía Abdominal',
            'descripcion': 'Ecografía de cavidad abdominal completa',
            'categoria': 'Diagnóstico',
            'precio': 55000,
            'duracion': 45
        },
        {
            'nombre': 'Hospitalización por Día',
            'descripcion': 'Internación con monitoreo y cuidados veterinarios 24 horas',
            'categoria': 'Hospitalización',
            'precio': 50000,
            'duracion': 1440  # 24 horas en minutos
        },
        {
            'nombre': 'Curación de Heridas',
            'descripcion': 'Limpieza, desinfección y vendaje de heridas',
            'categoria': 'Curaciones',
            'precio': 18000,
            'duracion': 30
        },
        {
            'nombre': 'Aplicación de Medicamento Inyectable',
            'descripcion': 'Administración de medicamento por vía subcutánea, intramuscular o endovenosa',
            'categoria': 'Medicina General',
            'precio': 10000,
            'duracion': 15
        }
    ]
    
    servicios_creados = 0
    servicios_existentes = 0
    
    print("=" * 60)
    print("CREACIÓN DE SERVICIOS VETERINARIOS")
    print("=" * 60)
    print()
    
    for servicio_data in servicios_data:
        # Verificar si el servicio ya existe
        if Servicio.objects.filter(nombre=servicio_data['nombre']).exists():
            print(f"⚠️  '{servicio_data['nombre']}' ya existe - Omitido")
            servicios_existentes += 1
        else:
            servicio = Servicio.objects.create(**servicio_data)
            print(f"✅ '{servicio.nombre}' - Precio: ${servicio.precio:,} - Duración: {servicio.duracion} min")
            servicios_creados += 1
    
    print()
    print("=" * 60)
    print(f"RESUMEN:")
    print(f"  - Servicios creados: {servicios_creados}")
    print(f"  - Servicios ya existentes: {servicios_existentes}")
    print(f"  - Total en base de datos: {Servicio.objects.count()}")
    print("=" * 60)

if __name__ == '__main__':
    crear_servicios()
