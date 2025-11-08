from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages


# Create your views here.
def login_user(request):
    
    if request.method == 'POST':
        
        rut = request.POST.get("rut_input")
        password = request.POST.get("psw_input")
        
        user = authenticate(request, username=rut, password=password)
        if user is not None:
            login(request, user)
            return redirect('dashboard')
        else:
            messages.error(request, "Usuario o contraseña incorrecta")
            return redirect('login')
        
        
    else: 
        return render(request, 'validacion/login.html', {})
    
def register_user(request):
    return render(request, 'validacion/register.html', {})
