from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from gestion.models import Mascota, Cliente, Consulta

# Dashboard principal
def dashboard_pacientes(request):
    return render(request, 'dashboard_pacientes.html')

# --- CONSULTAS ---
def consulta_view(request):
    return render(request, 'consultas/consulta.html')

# --- HOSPITALIZACIÓN ---
def hospital_view(request):
    return render(request, 'hospitalizacion/hospital.html')

# --- PACIENTES ---
def pacientes_view(request):
    mascotas = Mascota.objects.all()

    # Get filter parameters from GET request
    especie_filter = request.GET.get('especie', '')
    sexo_filter = request.GET.get('sexo', '')

    # Apply filters if provided
    if especie_filter:
        mascotas = mascotas.filter(animal_mascota=especie_filter)
    if sexo_filter:
        mascotas = mascotas.filter(sexo=sexo_filter)

    context = {
        'mascotas': mascotas,
        'especie_filter': especie_filter,
        'sexo_filter': sexo_filter,
    }
    return render(request, 'pacientes/pacientes.html', context)


@csrf_exempt
def crear_mascota(request):
    if request.method == 'POST':
        try:
            nombre = request.POST.get('nombre')
            especie = request.POST.get('especie')
            raza = request.POST.get('raza', '')
            edad = int(request.POST.get('edad', 0))
            sexo = request.POST.get('sexo', 'desconocido')
            peso = float(request.POST.get('peso', 0.0))

            # Cliente data
            rutCliente = int(request.POST.get('rutCliente'))
            dvCliente = int(request.POST.get('dvCliente'))
            nombreCliente = request.POST.get('nombreCliente')
            telCliente = request.POST.get('telCliente', '')
            emailCliente = request.POST.get('emailCliente', '')
            direccion = request.POST.get('direccion', '')

            # Find or create Cliente
            cliente, created = Cliente.objects.get_or_create(
                rutCliente=rutCliente,
                dvCliente=dvCliente,
                defaults={
                    'nombreCliente': nombreCliente,
                    'telCliente': telCliente,
                    'emailCliente': emailCliente,
                    'direccion': direccion
                }
            )

            # Update cliente if it was found but data differs
            if not created:
                cliente.nombreCliente = nombreCliente
                cliente.telCliente = telCliente
                cliente.emailCliente = emailCliente
                cliente.direccion = direccion
                cliente.save()

            # Create Mascota
            mascota = Mascota.objects.create(
                nombreMascota=nombre,
                animal_mascota=especie,
                raza_mascota=raza,
                edad=edad,
                peso=peso,
                sexo=sexo,
                idCliente=cliente
            )

            return JsonResponse({'success': True, 'mascota_id': mascota.idMascota})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Método no permitido'})


def ficha_mascota(request, mascota_id):
    try:
        mascota = Mascota.objects.select_related('idCliente').get(idMascota=mascota_id)
        consultas = Consulta.objects.filter(idMascota=mascota).order_by('-fecha_consulta')
        return render(request, 'pacientes/ficha_mascota.html', {
            'mascota': mascota,
            'consultas': consultas
        })
    except Mascota.DoesNotExist:
        return render(request, 'pacientes/ficha_mascota.html', {'error': 'Mascota no encontrada'})

# --- VETERINARIOS ---

def vet_view(request):
    return render(request, 'veterinarios/veterinarios.html')
def vet_ficha_view(request):
    dias = range(1, 32)  # Días del 1 al 31
    return render(request, 'veterinarios/vet_ficha.html', {'dias': dias})

# --- INVENTARIO ---

def inventario(request):
    return render(request, 'inventario/inventario.html')

# --- SERVICIOS ---

def servicios(request):
    return render(request, 'inventario/servicios.html')

def test_view(request):
    return render(request, 'inventario/test.html')


def get_mascota_data(request, mascota_id):
    try:
        mascota = Mascota.objects.select_related('idCliente').get(idMascota=mascota_id)
        data = {
            'idMascota': mascota.idMascota,
            'nombreMascota': mascota.nombreMascota,
            'animal_mascota': mascota.animal_mascota,
            'raza_mascota': mascota.raza_mascota,
            'edad': mascota.edad,
            'peso': float(mascota.peso),
            'sexo': mascota.sexo,
            'chip': mascota.chip,
            'idCliente': {
                'idCliente': mascota.idCliente.idCliente,
                'rutCliente': mascota.idCliente.rutCliente,
                'dvCliente': mascota.idCliente.dvCliente,
                'nombreCliente': mascota.idCliente.nombreCliente,
                'telCliente': mascota.idCliente.telCliente,
                'emailCliente': mascota.idCliente.emailCliente,
                'direccion': mascota.idCliente.direccion,
            }
        }
        return JsonResponse(data)
    except Mascota.DoesNotExist:
        return JsonResponse({'error': 'Mascota no encontrada'}, status=404)


@csrf_exempt
def editar_mascota(request, mascota_id):
    if request.method == 'POST':
        try:
            mascota = Mascota.objects.select_related('idCliente').get(idMascota=mascota_id)

            # Update Mascota data
            mascota.nombreMascota = request.POST.get('nombre')
            mascota.animal_mascota = request.POST.get('especie')
            mascota.raza_mascota = request.POST.get('raza', '')
            mascota.edad = int(request.POST.get('edad', 0))
            mascota.sexo = request.POST.get('sexo', 'desconocido')
            mascota.peso = float(request.POST.get('peso', 0.0))
            mascota.chip = request.POST.get('chip', '')
            mascota.save()

            # Update Cliente data
            cliente = mascota.idCliente
            cliente.rutCliente = int(request.POST.get('rutCliente'))
            cliente.dvCliente = int(request.POST.get('dvCliente'))
            cliente.nombreCliente = request.POST.get('nombreCliente')
            cliente.telCliente = request.POST.get('telCliente', '')
            cliente.emailCliente = request.POST.get('emailCliente', '')
            cliente.direccion = request.POST.get('direccion', '')
            cliente.save()

            return JsonResponse({'success': True})
        except Mascota.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Mascota no encontrada'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Método no permitido'})
