from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def agenda(request):
    horas = [f"{h:02d}" for h in range(8, 20)]  # 08 a 19
    minutos = ["00", "15", "30", "45"]
    return render(request, "agenda/agenda.html", {"horas": horas, "minutos": minutos})