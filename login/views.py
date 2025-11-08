from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model

User = get_user_model()

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        rut = request.POST.get('rut_input')
        password = request.POST.get('password')
        
        # Debug: verifica que los datos lleguen
        print(f"RUT recibido: {rut}")
        print(f"Password recibido: {'***' if password else 'vacío'}")
        
        # Intentar autenticar con el RUT como username
        user = authenticate(request, username=rut, password=password)
        
        # Si no funciona, intenta buscar el usuario directamente
        if user is None:
            try:
                user_obj = User.objects.get(rut=rut)
                print(f"Usuario encontrado: {user_obj.rut}")
                # Verificar contraseña manualmente
                if user_obj.check_password(password):
                    auth_login(request, user_obj)
                    messages.success(request, f'Bienvenido {user_obj.nombre} {user_obj.apellido}')
                    return redirect('dashboard')
                else:
                    print("Contraseña incorrecta")
                    messages.error(request, 'RUT o contraseña incorrectos')
            except User.DoesNotExist:
                print("Usuario no encontrado")
                messages.error(request, 'RUT o contraseña incorrectos')
        else:
            auth_login(request, user)
            messages.success(request, f'Bienvenido {user.nombre} {user.apellido}')
            return redirect('dashboard')
    
    return render(request, 'validacion/login.html')

def register_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        # Obtener datos del formulario
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
            user = User(
                rut=rut,
                nombre=nombre,
                apellido=apellido,
                correo=correo,
                telefono=telefono,
                direccion=direccion,
                tipo_contrato=tipo_contrato
            )
            user.set_password(password)  # Encripta la contraseña
            user.save()
            messages.success(request, 'Registro exitoso. Por favor inicia sesión.')
            return redirect('login')
        except Exception as e:
            messages.error(request, f'Error al registrar: {str(e)}')
    
    return render(request, 'validacion/register.html')

def logout_view(request):
    """Vista de logout que cierra sesión y redirige inmediatamente al login"""
    if request.method == 'POST':
        auth_logout(request)
        messages.success(request, 'Has cerrado sesión exitosamente')
    return redirect('login')