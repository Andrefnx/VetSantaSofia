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
        rut_input = request.POST.get('rut_input', '').strip()  # Cambiar 'rut' por 'rut_input'
        password = request.POST.get('password', '')
        
        # Normalizar RUT: remover puntos y espacios
        rut_clean = rut_input.replace('.', '').replace(' ', '').upper()
        
        # Crear variaciones para buscar
        # Variación 1: Con guión (ej: 20776187-7)
        if '-' not in rut_clean and len(rut_clean) >= 2:
            rut_with_guion = f"{rut_clean[:-1]}-{rut_clean[-1]}"
        else:
            rut_with_guion = rut_clean
        
        # Variación 2: Sin guión (ej: 207761877)
        rut_sin_guion = rut_clean.replace('-', '')
        
        # Buscar usuario primero por RUT
        user = User.objects.filter(rut__iexact=rut_with_guion).first()
        
        if not user:
            user = User.objects.filter(rut__iexact=rut_sin_guion).first()
        
        if not user:
            # Si aún no encuentra, intenta búsqueda que contenga los números sin guión
            try:
                all_users = User.objects.all()
                for u in all_users:
                    if u.rut.replace('-', '').replace('.', '').upper() == rut_sin_guion:
                        user = u
                        break
            except:
                pass
        
        # Si encontró usuario, verificar contraseña
        if user is not None:
            if user.check_password(password):
                # Establecer el backend para evitar múltiples backends configurados
                user.backend = 'cuentas.backends.RutBackend'
                login(request, user, backend='cuentas.backends.RutBackend')
                return redirect('dashboard:dashboard')
            else:
                messages.error(request, 'RUT o contraseña incorrectos')
        else:
            messages.error(request, 'RUT o contraseña incorrectos')
    
    return render(request, 'validacion/login.html')

def forgot_password_view(request):
    """Vista para recuperación de contraseña por RUT"""
    if request.method == 'POST':
        rut_input = request.POST.get('rut', '').strip()
        new_password = request.POST.get('new_password', '')
        confirm_password = request.POST.get('confirm_password', '')
        
        # Limpiar RUT: remover puntos y espacios
        rut_clean = rut_input.replace('.', '').replace(' ', '').upper()
        
        # Crear variaciones para buscar
        # Variación 1: Con guión (ej: 20776187-7)
        if '-' not in rut_clean and len(rut_clean) >= 2:
            rut_with_guion = f"{rut_clean[:-1]}-{rut_clean[-1]}"
        else:
            rut_with_guion = rut_clean
        
        # Variación 2: Sin guión (ej: 207761877)
        rut_sin_guion = rut_clean.replace('-', '')
        
        # Buscar usuario - intenta ambas variaciones con iexact (case-insensitive)
        user = User.objects.filter(rut__iexact=rut_with_guion).first()
        
        if not user:
            user = User.objects.filter(rut__iexact=rut_sin_guion).first()
        
        if not user:
            # Si aún no encuentra, intenta búsqueda que contenga los números sin guión
            try:
                all_users = User.objects.all()
                for u in all_users:
                    if u.rut.replace('-', '').replace('.', '').upper() == rut_sin_guion:
                        user = u
                        break
            except:
                pass
        
        if not user:
            messages.error(request, f'El RUT "{rut_input}" no está registrado en el sistema')
            return render(request, 'validacion/forgot_password.html')
        
        # Validar contraseñas
        if new_password != confirm_password:
            messages.error(request, 'Las contraseñas no coinciden')
            return render(request, 'validacion/forgot_password.html')
        
        if len(new_password) < 6:
            messages.error(request, 'La contraseña debe tener al menos 6 caracteres')
            return render(request, 'validacion/forgot_password.html')
        
        try:
            # Cambiar contraseña
            user.set_password(new_password)
            user.save()
            
            messages.success(request, 'Contraseña actualizada exitosamente. Por favor inicia sesión.')
            return redirect('login')
            
        except Exception as e:
            messages.error(request, f'Error al cambiar contraseña: {str(e)}')
            return render(request, 'validacion/forgot_password.html')
    
    return render(request, 'validacion/forgot_password.html')
    
    return render(request, 'validacion/forgot_password.html')

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