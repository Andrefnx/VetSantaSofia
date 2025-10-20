from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib import messages

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        # Remove formatting from RUT (dots and hyphen)
        if username:
            username = username.replace('.', '').replace('-', '')
        
        # Authenticate user
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # Login successful
            auth_login(request, user)
            return redirect('dashboard')
        else:
            # Login failed
            messages.error(request, 'RUT o contraseña incorrectos. Por favor, verifica tus datos.')
            return render(request, 'login.html')
    
    return render(request, 'login.html')

def logout_view(request):
    auth_logout(request)
    messages.success(request, 'Has cerrado sesión exitosamente.')
    return redirect('login')

def register_view(request):
    return render(request, 'register.html')