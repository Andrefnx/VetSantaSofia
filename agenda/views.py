from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def agenda(request):
    return render(request, 'agenda/agenda.html')