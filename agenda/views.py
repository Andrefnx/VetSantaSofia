from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import Cita
from hospital.models import Mascota
import json
from datetime import datetime
from django.contrib.auth import get_user_model

@login_required
def agenda(request):
    horas = ["08","09","10","11","12","13","14","15","16","17"]
    minutos = ["00", "15", "30", "45"]

    mascotas = Mascota.objects.all()
    User = get_user_model()
    veterinarios = User.objects.filter(rol="veterinario")

    return render(request, 'agenda/agenda.html', {
        "horas": horas,
        "minutos": minutos,
        "mascotas": mascotas,
        'veterinarios': veterinarios,
    })
@login_required
def citas_dia(request, fecha):
    fecha = datetime.strptime(fecha, "%Y-%m-%d").date()
    citas = Cita.objects.filter(fecha=fecha)

    data = []
    for c in citas:
        data.append({
            "id": c.id,
            "hora": c.hora.strftime("%H:%M"),
            "duracion": c.duracion,
            "tipo": c.get_tipo_display(),
            "mascota": c.mascota.nombre,
            "veterinario": f"{c.veterinario.nombre} {c.veterinario.apellido}" if c.veterinario else "",
            "notas": c.notas or "",
        })

    return JsonResponse({"citas": data})


@csrf_exempt
@login_required
def crear_cita(request):
    if request.method == "POST":
        data = json.loads(request.body)
        mascota = Mascota.objects.get(id=data["mascota_id"])
        User = get_user_model()
        veterinario = User.objects.get(id=data["veterinario_id"])  # <-- usa el id enviado

        nueva = Cita.objects.create(
            mascota=mascota,
            veterinario=veterinario,
            fecha=data["fecha"],
            hora=data["hora"],
            duracion=data["duracion"],
            tipo=data["tipo"],
            notas=data.get("notas", ""),
        )

        return JsonResponse({"success": True, "id": nueva.id})

    return JsonResponse({"error": "Método no permitido"}, status=405)
