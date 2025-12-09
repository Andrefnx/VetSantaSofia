from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model

User = get_user_model()

def login_view(request):
    """Vista de login - NO debe tener @login_required"""
    if request.user.is_authenticated:
        return redirect('dashboard:dashboard')
    
    if request.method == 'POST':
        rut = request.POST.get('rut')
        password = request.POST.get('password')
        
        user = authenticate(request, username=rut, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('dashboard:dashboard')
        else:
            messages.error(request, 'RUT o contraseña incorrectos')
    
    return render(request, 'validacion/login.html')

def register_view(request):
    """Vista de registro"""
    if request.method == 'POST':
        rut = request.POST.get('rut_input')
        nombre = request.POST.get('nombre')
        apellido = request.POST.get('apellido')
        correo = request.POST.get('correo')
        telefono = request.POST.get('telefono')
        direccion = request.POST.get('direccion')
        tipo_contrato = request.POST.get('tipo_contrato')
        password = request.POST.get('psw_input')
        confirm_password = request.POST.get('confirm_psw')
        
        # Validaciones
        if password != confirm_password:
            messages.error(request, 'Las contraseñas no coinciden')
            return render(request, 'validacion/register.html')
        
        if User.objects.filter(correo=correo).exists():
            messages.error(request, 'El email ya está registrado')
            return render(request, 'validacion/register.html')
        
        if User.objects.filter(rut=rut).exists():
            messages.error(request, 'El RUT ya está registrado')
            return render(request, 'validacion/register.html')
        
        # Crear usuario
        try:
            is_staff = True if tipo_contrato == 'administracion' else False

            user = User.objects.create_user(
                rut=rut,
                password=password,
                nombre=nombre,
                apellido=apellido,
                correo=correo,
                telefono=telefono,
                direccion=direccion,
                tipo_contrato=tipo_contrato,
                rol=tipo_contrato,
                is_staff=is_staff
            )
            messages.success(request, 'Registro exitoso. Por favor inicia sesión.')
            return redirect('login')
        except Exception as e:
            messages.error(request, f'Error al registrar: {str(e)}')
    
    return render(request, 'validacion/register.html')

def logout_view(request):
    """Vista de logout"""
    logout(request)
    return redirect('login')