from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib import messages
from .forms import UsuarioRegistroForm

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        remember = request.POST.get('remember')
        
        # Remove formatting from RUT (dots and hyphen)
        if username:
            username = username.replace('.', '').replace('-', '')
        
        # Authenticate user
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # Login successful
            auth_login(request, user)
            
            # Handle "Remember me" checkbox
            if not remember:
                request.session.set_expiry(0)  # Session expires when browser closes
            
            messages.success(request, f'¡Bienvenido {user.get_full_name()}!')
            return redirect('dashboard')
        else:
            # Login failed
            messages.error(request, 'RUT o contraseña incorrectos. Por favor, verifica tus datos.')
    
    return render(request, 'login.html')  # Cambiado de 'login/login.html' a 'login.html'

def logout_view(request):
    auth_logout(request)
    messages.success(request, 'Has cerrado sesión exitosamente.')
    return redirect('login')

def register_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        form = UsuarioRegistroForm(request.POST)
        if form.is_valid():
            user = form.save()
            messages.success(request, '¡Registro exitoso! Ahora puedes iniciar sesión.')
            return redirect('login')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f'{error}')
    else:
        form = UsuarioRegistroForm()
    
    return render(request, 'register.html', {'form': form})  # Cambiado de 'login/register.html' a 'register.html'