from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def caja(request):
    return render(request, 'cash_register.html')

@login_required
def reporte(request):
    return render(request, 'reporte.html')