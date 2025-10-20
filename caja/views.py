from django.shortcuts import render

# Create your views here.
def cashregister(request):
    return render(request, 'cash_register.html')