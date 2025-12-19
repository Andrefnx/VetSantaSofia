# FLUJOS PRINCIPALES DEL SISTEMA

## Descripción Técnica de Procesos de Negocio

---

## 1. REGISTRO Y AUTENTICACIÓN

### 1.1 Módulos Participantes

**Módulo Principal**: `cuentas/`
- `models.py`: Define `CustomUser` y `CustomUserManager`
- `backends.py`: Implementa `RutBackend` para autenticación personalizada

**Módulo Secundario**: `login/`
- `views.py`: Maneja vistas de login, logout y recuperación de contraseña
- `urls.py`: Define rutas de acceso

**Módulo de Control**: `historial/`
- `middleware.py`: Captura usuario autenticado en thread-locals

### 1.2 Modelos Utilizados

#### CustomUser (AUTH_USER_MODEL)
```python
class CustomUser(AbstractBaseUser, PermissionsMixin):
    rut = models.CharField(max_length=12, unique=True)  # USERNAME_FIELD
    username = models.CharField(max_length=20, unique=True, editable=False)
    nombre = models.CharField(max_length=50)
    apellido = models.CharField(max_length=50)
    correo = models.EmailField(unique=True)
    rol = models.CharField(max_length=20, choices=ROLES)  # administracion, veterinario, recepcion
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
```

**Características técnicas**:
- Hereda de `AbstractBaseUser` (no usa modelo User de Django)
- `USERNAME_FIELD = 'rut'`: Autenticación mediante RUT chileno en lugar de username
- `username` se genera automáticamente desde RUT (sin puntos ni guiones)
- Manager personalizado: `CustomUserManager` con `normalize_rut()`

### 1.3 Flujo de Autenticación

#### Paso 1: Normalización de RUT (Pre-procesamiento)

**Ubicación**: `login/views.py` → `login_view()`

**Proceso**:
```python
# Input del usuario: "20.776.187-7" o "20776187-7" o "207761877"
rut_input = request.POST.get('rut_input', '').strip()

# Normalización:
rut_clean = rut_input.replace('.', '').replace(' ', '').upper()

# Generación de variaciones:
# Variación 1: Con guión (20776187-7)
if '-' not in rut_clean and len(rut_clean) >= 2:
    rut_with_guion = f"{rut_clean[:-1]}-{rut_clean[-1]}"
else:
    rut_with_guion = rut_clean

# Variación 2: Sin guión (207761877)
rut_sin_guion = rut_clean.replace('-', '')
```

**Justificación técnica**: Los usuarios pueden ingresar RUT en múltiples formatos. La normalización garantiza que cualquier formato válido sea reconocido sin requerir entrada exacta.

#### Paso 2: Búsqueda de Usuario (Múltiples Intentos)

**Estrategia de búsqueda progresiva**:

```python
# Intento 1: Búsqueda exacta con guión (case-insensitive)
user = User.objects.filter(rut__iexact=rut_with_guion).first()

# Intento 2: Búsqueda sin guión
if not user:
    user = User.objects.filter(rut__iexact=rut_sin_guion).first()

# Intento 3: Búsqueda exhaustiva (fallback)
if not user:
    all_users = User.objects.all()
    for u in all_users:
        if u.rut.replace('-', '').replace('.', '').upper() == rut_sin_guion:
            user = u
            break
```

**Justificación técnica**: 
- Queries indexadas en primeros intentos (performance)
- Fallback exhaustivo solo si necesario (compatibilidad con datos históricos inconsistentes)
- `iexact` garantiza case-insensitivity

#### Paso 3: Verificación de Contraseña

**Backend personalizado**: `cuentas/backends.py` → `RutBackend`

```python
class RutBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        # username contiene el RUT normalizado
        rut = username.strip().replace('.', '').replace(' ', '').upper()
        
        if '-' not in rut and len(rut) >= 2:
            rut = f"{rut[:-1]}-{rut[-1]}"
        
        try:
            user = User.objects.get(rut=rut)
            if user.check_password(password):  # Hash bcrypt verificado aquí
                return user
        except User.DoesNotExist:
            return None
```

**Justificación técnica**:
- `check_password()` usa hashing seguro (PBKDF2 o bcrypt según settings)
- No almacena contraseñas en texto plano
- Backend personalizado permite autenticación por campo no-username

#### Paso 4: Establecimiento de Sesión

**Ubicación**: `login/views.py`

```python
if user is not None:
    if user.check_password(password):
        # Establecer backend explícitamente (evita errores con múltiples backends)
        user.backend = 'cuentas.backends.RutBackend'
        login(request, user, backend='cuentas.backends.RutBackend')
        return redirect('dashboard:dashboard')
```

**Resultado**:
- Django crea sesión en tabla `django_session`
- Cookie `sessionid` enviada al cliente
- Middleware `AuthenticationMiddleware` autentica requests subsiguientes
- `CurrentUserMiddleware` captura usuario en thread-locals para signals

### 1.4 Validaciones Implementadas

#### Nivel de Modelo (CustomUser)

**1. Normalización automática en `save()`**:
```python
def save(self, *args, **kwargs):
    if self.rut:
        # Eliminar puntos, espacios
        self.rut = self.rut.strip().replace('.', '').replace(' ', '').upper()
        # Agregar guión si falta
        if '-' not in self.rut and len(self.rut) >= 2:
            self.rut = f"{self.rut[:-1]}-{self.rut[-1]}"
        # Generar username automático
        self.username = self.rut.replace('.', '').replace('-', '').replace(' ', '')
    super().save(*args, **kwargs)
```

**Garantiza**: Consistencia de formato en base de datos independiente de input.

**2. Constraints de base de datos**:
- `rut` con `unique=True` → PostgreSQL crea `UNIQUE INDEX`
- `correo` con `unique=True` → Previene emails duplicados
- `username` con `unique=True` → Necesario para compatibilidad con Django auth

#### Nivel de Vista (login_view)

**1. Validación de campos requeridos**:
```python
if request.method == 'POST':
    rut_input = request.POST.get('rut_input', '').strip()
    password = request.POST.get('password', '')
    
    if not rut_input or not password:
        messages.error(request, 'RUT y contraseña son requeridos')
        return render(request, 'validacion/login.html')
```

**2. Mensajes de error genéricos**:
```python
if user is not None:
    if user.check_password(password):
        # Login exitoso
    else:
        messages.error(request, 'RUT o contraseña incorrectos')
else:
    messages.error(request, 'RUT o contraseña incorrectos')
```

**Justificación de seguridad**: No revelar si el RUT existe o la contraseña es incorrecta (previene enumeración de usuarios).

#### Nivel de Middleware

**CurrentUserMiddleware**:
```python
class CurrentUserMiddleware:
    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            set_current_user(request.user)
        else:
            set_current_user(None)
        
        response = self.get_response(request)
        set_current_user(None)  # Limpiar después
        return response
```

**Garantiza**: Usuario disponible globalmente para signals sin pasarlo explícitamente.

### 1.5 Reglas de Negocio

#### RN-AUTH-01: Autenticación Obligatoria

**Implementación**: Decorador `@login_required` en vistas protegidas

```python
@login_required
def pacientes_view(request):
    # Solo usuarios autenticados acceden
```

Si usuario no autenticado intenta acceder, Django redirige a `LOGIN_URL` (configurado en settings).

#### RN-AUTH-02: Control de Acceso por Rol

**Implementación**: Decoradores personalizados

```python
def solo_admin_y_vet(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.user.rol not in ['administracion', 'veterinario']:
            return JsonResponse({'success': False, 'error': 'No tienes permiso'}, status=403)
        return view_func(request, *args, **kwargs)
    return wrapper

@login_required
@solo_admin_y_vet
def crear_insumo(request):
    # Solo admin y veterinarios pueden crear insumos
```

**Roles definidos**:
- `administracion`: Acceso total, gestión de usuarios
- `veterinario`: Gestión clínica, inventario, agenda
- `recepcion`: Agendamiento, caja (sin edición de inventario)

#### RN-AUTH-03: Sesiones con Timeout

**Configuración** en `settings.py`:
```python
SESSION_COOKIE_AGE = 86400  # 24 horas
SESSION_SAVE_EVERY_REQUEST = True  # Renueva en cada request
```

**Comportamiento**: Sesión expira después de 24 horas de inactividad, requiriendo re-autenticación.

#### RN-AUTH-04: Recuperación de Contraseña por RUT

**Flujo**: `login/views.py` → `forgot_password_view()`

```python
def forgot_password_view(request):
    if request.method == 'POST':
        rut_input = request.POST.get('rut', '').strip()
        new_password = request.POST.get('new_password', '')
        confirm_password = request.POST.get('confirm_password', '')
        
        # Validación 1: Contraseñas coinciden
        if new_password != confirm_password:
            messages.error(request, 'Las contraseñas no coinciden')
            return render(request, 'validacion/forgot_password.html')
        
        # Validación 2: Longitud mínima
        if len(new_password) < 8:
            messages.error(request, 'La contraseña debe tener al menos 8 caracteres')
            return render(request, 'validacion/forgot_password.html')
        
        # Buscar usuario por RUT (normalizado)
        user = User.objects.filter(rut__iexact=rut_normalizado).first()
        
        if user:
            user.set_password(new_password)  # Hash automático
            user.save()
            messages.success(request, 'Contraseña actualizada exitosamente')
            return redirect('login:login')
        else:
            messages.error(request, f'El RUT "{rut_input}" no está registrado')
```

**Justificación**: Sistema requiere identificación con RUT (sin email verificado necesariamente). En producción, debería agregarse verificación adicional (email, pregunta secreta, o código OTP).

---

## 2. GESTIÓN DE PACIENTES

### 2.1 Módulos Participantes

**Módulo Principal**: `pacientes/`
- `models.py`: Define `Propietario` y `Paciente`
- `views.py`: CRUD de propietarios y pacientes
- `signals.py`: Registra cambios en historial

**Módulos Relacionados**: 
- `clinica/`: Accede a pacientes para consultas y hospitalización
- `agenda/`: Referencia pacientes en citas
- `caja/`: Asocia ventas a pacientes

### 2.2 Modelos Utilizados

#### Propietario
```python
class Propietario(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
```

**Características**:
- Sin unique constraint a nivel de modelo en nombre/apellido (puede haber homónimos)
- Validación custom en `clean()` para unicidad de telefono/email

#### Paciente
```python
class Paciente(models.Model):
    nombre = models.CharField(max_length=100)
    especie = models.CharField(max_length=20, choices=ESPECIE_CHOICES)
    raza = models.CharField(max_length=100, blank=True, null=True)
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES)
    
    # Edad (múltiples formas de registrar)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    edad_anos = models.IntegerField(blank=True, null=True)
    edad_meses = models.IntegerField(blank=True, null=True)
    
    microchip = models.CharField(max_length=50, blank=True, null=True, unique=True)
    ultimo_peso = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    
    # Antecedentes médicos
    alergias = models.TextField(blank=True, null=True)
    enfermedades_cronicas = models.TextField(blank=True, null=True)
    medicamentos_actuales = models.TextField(blank=True, null=True)
    cirugia_previa = models.TextField(blank=True, null=True)
    
    propietario = models.ForeignKey(Propietario, on_delete=models.CASCADE, related_name='mascotas')
    activo = models.BooleanField(default=True)  # Soft delete
    
    # Trazabilidad
    ultimo_movimiento = models.DateTimeField(null=True, blank=True)
    tipo_ultimo_movimiento = models.CharField(max_length=50, null=True, blank=True)
    usuario_ultima_modificacion = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
```

**Relación**: Propietario → Pacientes (1:N con CASCADE)

### 2.3 Flujo de Registro de Paciente

#### Paso 1: Validación de Propietario (Anti-duplicados)

**Función**: `pacientes/views.py` → `validar_propietario_duplicado()`

**Proceso**:
```python
def validar_propietario_duplicado(nombre, apellido, telefono, email, propietario_id=None):
    # 1. Normalizar teléfono chileno
    telefono_normalizado = normalize_chile_phone(telefono)
    # Convierte: "956781234" → "+56956781234"
    #           "+56 9 5678 1234" → "+56956781234"
    
    # 2. Normalizar email (lowercase)
    email_normalizado = email.lower().strip()
    
    # 3. Normalizar nombre/apellido (sin tildes, lowercase)
    nombre_norm = normalizar_texto(nombre)  # "María" → "maria"
    apellido_norm = normalizar_texto(apellido)
    
    # 4. Buscar duplicados por nombre (WARNING, no bloquea)
    for prop in Propietario.objects.all():
        if normalizar_texto(prop.nombre) == nombre_norm and \
           normalizar_texto(prop.apellido) == apellido_norm:
            return {
                'valid': False,
                'type': 'nombre_duplicado',
                'warning': True,  # No bloquea, solo advierte
                'message': f'Ya existe un propietario con ese nombre...'
            }
    
    # 5. Buscar duplicados por teléfono (ERROR, bloquea)
    if Propietario.objects.filter(telefono=telefono_normalizado).exists():
        return {
            'valid': False,
            'type': 'telefono_duplicado',
            'message': 'Ya existe un propietario con ese teléfono'
        }
    
    # 6. Buscar duplicados por email (ERROR, bloquea)
    if Propietario.objects.filter(email__iexact=email_normalizado).exists():
        return {
            'valid': False,
            'type': 'email_duplicado',
            'message': 'Ya existe un propietario con ese email'
        }
    
    return {'valid': True}
```

**Estrategia de validación en capas**:
1. **Nombre duplicado**: Advierte pero permite continuar (pueden ser homónimos)
2. **Teléfono duplicado**: Bloquea (mismo teléfono = mismo propietario)
3. **Email duplicado**: Bloquea (mismo email = mismo propietario)

**Justificación técnica**: Evita duplicados reales pero permite casos legítimos (hermanos con misma mascota, cambio de teléfono).

#### Paso 2: Creación de Propietario

**Vista**: `pacientes/views.py` → Vista de creación (AJAX)

```python
@csrf_exempt
@login_required
def crear_propietario(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        
        # Validar duplicados
        validacion = validar_propietario_duplicado(
            nombre=data['nombre'],
            apellido=data['apellido'],
            telefono=data.get('telefono'),
            email=data.get('email')
        )
        
        if not validacion['valid'] and not validacion.get('warning'):
            return JsonResponse({'success': False, 'error': validacion['message']})
        
        # Crear propietario
        propietario = Propietario.objects.create(
            nombre=data['nombre'],
            apellido=data['apellido'],
            telefono=normalize_chile_phone(data.get('telefono')),
            email=data.get('email'),
            direccion=data.get('direccion')
        )
        
        return JsonResponse({
            'success': True,
            'propietario_id': propietario.id,
            'nombre_completo': propietario.nombre_completo
        })
```

#### Paso 3: Creación de Paciente

**Vista**: `pacientes/views.py` → Vista de creación (AJAX)

```python
@csrf_exempt
@login_required
def crear_paciente(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        
        # Obtener propietario existente o crear nuevo
        propietario_id = data.get('propietario_id')
        if propietario_id:
            propietario = Propietario.objects.get(id=propietario_id)
        else:
            # Crear propietario nuevo (validando duplicados)
            propietario = crear_propietario_interno(data['propietario'])
        
        # Crear paciente
        paciente = Paciente.objects.create(
            nombre=data['nombre'],
            especie=data['especie'],
            raza=data.get('raza'),
            sexo=data['sexo'],
            fecha_nacimiento=data.get('fecha_nacimiento'),
            edad_anos=data.get('edad_anos'),
            edad_meses=data.get('edad_meses'),
            microchip=data.get('microchip'),
            ultimo_peso=data.get('peso'),
            alergias=data.get('alergias'),
            enfermedades_cronicas=data.get('enfermedades_cronicas'),
            propietario=propietario,
            activo=True
        )
        
        # El signal registra automáticamente en historial
        return JsonResponse({'success': True, 'paciente_id': paciente.id})
```

#### Paso 4: Registro Automático en Historial

**Signal**: `pacientes/signals.py` → `post_save`

```python
@receiver(post_save, sender=Paciente)
def paciente_post_save(sender, instance, created, **kwargs):
    usuario = get_current_user()  # Del middleware
    
    if created:
        # Registro de creación
        RegistroHistorico.objects.create(
            entidad='paciente',
            objeto_id=instance.id,
            tipo_evento='creacion',
            usuario=usuario,
            descripcion=f"Paciente '{instance.nombre}' registrado",
            datos_cambio={
                'especie': instance.especie,
                'propietario': instance.propietario.nombre_completo,
                'peso': str(instance.ultimo_peso) if instance.ultimo_peso else None
            },
            criticidad='media'
        )
```

### 2.4 Validaciones Implementadas

#### Nivel de Modelo (Propietario)

**Método `clean()`**:
```python
def clean(self):
    super().clean()
    queryset = Propietario.objects.exclude(pk=self.pk) if self.pk else Propietario.objects.all()
    
    errors = {}
    
    # Validar teléfono único (case-insensitive)
    if self.telefono:
        if queryset.filter(telefono__iexact=self.telefono).exists():
            errors['telefono'] = ValidationError('Teléfono duplicado')
    
    # Validar email único (case-insensitive)
    if self.email:
        if queryset.filter(email__iexact=self.email).exists():
            errors['email'] = ValidationError('Email duplicado')
    
    if errors:
        raise ValidationError(errors)

def save(self, *args, **kwargs):
    self.full_clean()  # Ejecuta validaciones antes de guardar
    super().save(*args, **kwargs)
```

**Limitación**: `full_clean()` solo se ejecuta si `save()` se llama desde código que lo invoca. Django admin lo hace automáticamente, pero `objects.create()` NO lo hace.

**Solución**: Validación duplicada en vista (`validar_propietario_duplicado()`).

#### Nivel de Modelo (Paciente)

**Constraint a nivel de base de datos**:
```python
microchip = models.CharField(max_length=50, blank=True, null=True, unique=True)
```

PostgreSQL crea `UNIQUE INDEX` que previene microchips duplicados incluso si validación de aplicación falla.

#### Nivel de Vista

**1. Normalización de teléfono**:
```python
def normalize_chile_phone(phone):
    if not phone:
        return phone
    normalized = re.sub(r'[^\d+]', '', phone)  # Eliminar caracteres no numéricos
    if normalized.startswith('+56'):
        normalized = '+56' + re.sub(r'\D', '', normalized[3:])
    elif normalized.startswith('56'):
        normalized = '+56' + re.sub(r'\D', '', normalized[2:])
    else:
        normalized = '+56' + re.sub(r'\D', '', normalized)
    return normalized
```

**2. Normalización de texto (sin tildes)**:
```python
def normalizar_texto(texto):
    if not texto:
        return ''
    texto = texto.lower().strip()
    # Eliminar tildes usando NFD normalization
    texto = ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )
    return texto
```

**Justificación**: Usuarios pueden ingresar "María González" o "Maria Gonzalez". Normalización detecta duplicado.

### 2.5 Reglas de Negocio

#### RN-PAC-01: Propietario Obligatorio

**Implementación**: `ForeignKey` sin `null=True`

```python
propietario = models.ForeignKey(Propietario, on_delete=models.CASCADE, related_name='mascotas')
```

**Comportamiento**: No se puede crear paciente sin propietario. Vista valida existencia de propietario antes de crear paciente.

#### RN-PAC-02: Eliminación en Cascada

**Implementación**: `on_delete=models.CASCADE`

**Comportamiento**: Si se elimina propietario, **todos sus pacientes se eliminan automáticamente**.

**Justificación**: Paciente sin dueño no tiene sentido en contexto veterinario. En producción, debería usarse soft delete en propietarios para prevenir pérdida accidental.

#### RN-PAC-03: Soft Delete de Pacientes

**Implementación**: Campo `activo`

```python
activo = models.BooleanField(default=True)

# Archivado (no eliminación física)
paciente.activo = False
paciente.tipo_ultimo_movimiento = 'desactivacion'
paciente.save()  # Signal registra en historial
```

**Queries**:
```python
# Solo activos
pacientes_activos = Paciente.objects.filter(activo=True)

# Incluir archivados
todos_pacientes = Paciente.objects.all()
```

**Justificación**: Historial clínico debe preservarse. Paciente fallecido o transferido se archiva pero mantiene historial.

#### RN-PAC-04: Microchip Único

**Implementación**: `unique=True` a nivel de base de datos

**Comportamiento**: PostgreSQL previene insertar paciente con microchip duplicado.

**Manejo de error**:
```python
try:
    paciente = Paciente.objects.create(microchip='123456789', ...)
except IntegrityError:
    return JsonResponse({'success': False, 'error': 'Microchip duplicado'})
```

#### RN-PAC-05: Antecedentes Médicos Obligatorios en Consulta

**Implementación**: Validación en módulo `clinica/`

Antes de consulta, sistema valida que paciente tenga campos críticos llenos:
```python
def validar_antecedentes_paciente(paciente):
    warnings = []
    if not paciente.alergias:
        warnings.append('Alergias no registradas')
    if not paciente.enfermedades_cronicas:
        warnings.append('Enfermedades crónicas no registradas')
    return warnings
```

No bloquea consulta pero advierte al veterinario.

---

## 3. GESTIÓN DE INVENTARIO

### 3.1 Módulos Participantes

**Módulo Principal**: `inventario/`
- `models.py`: Define `Insumo`
- `views.py`: CRUD de insumos
- `signals.py`: Sincroniza cambios con historial

**Módulos Consumidores**:
- `clinica/`: Registra uso de insumos en consultas
- `caja/`: Descuenta stock al confirmar pagos
- `servicios/`: Asocia insumos a servicios (referencial)

### 3.2 Modelos Utilizados

#### Insumo
```python
class Insumo(models.Model):
    idInventario = models.AutoField(primary_key=True)
    medicamento = models.CharField(max_length=255)
    marca = models.CharField(max_length=100, blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    formato = models.CharField(max_length=50, choices=FORMATO_CHOICES)
    
    # Stock
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=10)
    stock_medio = models.IntegerField(default=20)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    archivado = models.BooleanField(default=False)  # Soft delete
    
    # Dosis según formato
    dosis_ml = models.DecimalField(max_digits=10, decimal_places=2, null=True)  # Dosis por kg
    ml_contenedor = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    cantidad_pastillas = models.IntegerField(null=True)  # Pastillas por envase
    unidades_pipeta = models.IntegerField(null=True)
    
    # Rango de peso
    tiene_rango_peso = models.BooleanField(default=False)
    peso_min_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    peso_max_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    
    # Trazabilidad
    ultimo_movimiento = models.DateTimeField(null=True)
    tipo_ultimo_movimiento = models.CharField(max_length=30, choices=TIPO_MOVIMIENTO_CHOICES)
    usuario_ultimo_movimiento = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
```

**Tipos de movimiento**:
- `ingreso_stock`: Aumentó stock
- `salida_stock`: Disminuyó stock (venta confirmada)
- `modificacion_informacion`: Cambio de descripción, marca, etc.
- `actualizacion_precio`: Cambio de precio

### 3.3 Flujo de Creación de Insumo

#### Paso 1: Validación de Permisos

**Decorador**: `solo_admin_y_vet`

```python
def solo_admin_y_vet(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.user.rol not in ['administracion', 'veterinario']:
            return JsonResponse({'success': False, 'error': 'Sin permiso'}, status=403)
        return view_func(request, *args, **kwargs)
    return wrapper

@csrf_exempt
@login_required
@solo_admin_y_vet
def crear_insumo(request):
    # Solo admin y veterinarios llegan aquí
```

**Justificación**: Recepcionistas no deben modificar inventario (riesgo de errores en medicamentos controlados).

#### Paso 2: Creación con Datos Completos

```python
@csrf_exempt
@login_required
@solo_admin_y_vet
def crear_insumo(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        
        insumo = Insumo.objects.create(
            medicamento=data.get('medicamento'),
            marca=data.get('marca', ''),
            sku=data.get('sku', ''),
            formato=data.get('formato'),
            stock_actual=int(data.get('stock_actual', 0)),
            precio_venta=Decimal(str(data.get('precio_venta'))) if data.get('precio_venta') else None,
            
            # Dosis según formato
            dosis_ml=Decimal(str(data.get('dosis_ml'))) if data.get('dosis_ml') else None,
            ml_contenedor=Decimal(str(data.get('ml_contenedor'))) if data.get('ml_contenedor') else None,
            
            usuario_ultimo_movimiento=request.user
        )
        
        # Si tiene stock inicial, registrar como ingreso
        if int(data.get('stock_actual', 0)) > 0:
            insumo.ultimo_movimiento = timezone.now()
            insumo.tipo_ultimo_movimiento = 'ingreso_stock'
            insumo.save()  # Signal registra en historial
        
        return JsonResponse({'success': True, 'insumo_id': insumo.idInventario})
```

#### Paso 3: Registro Automático en Historial

**Signal**: `inventario/signals.py`

```python
@receiver(pre_save, sender=Insumo)
def insumo_pre_save(sender, instance, **kwargs):
    """Captura estado anterior"""
    if instance.pk:
        anterior = Insumo.objects.get(pk=instance.pk)
        _insumo_anterior[instance.pk] = {
            'stock_actual': anterior.stock_actual,
            'precio_venta': anterior.precio_venta,
        }

@receiver(post_save, sender=Insumo)
def insumo_post_save(sender, instance, created, **kwargs):
    """Registra cambio en historial"""
    usuario = get_current_user()
    
    if created:
        registrar_creacion(
            entidad='inventario',
            objeto_id=instance.pk,
            usuario=usuario,
            descripcion=f"Insumo '{instance.medicamento}' creado"
        )
    else:
        anterior = _insumo_anterior.get(instance.pk, {})
        
        if instance.tipo_ultimo_movimiento == 'salida_stock':
            registrar_cambio_stock(
                entidad='inventario',
                objeto_id=instance.pk,
                usuario=usuario,
                stock_anterior=anterior['stock_actual'],
                stock_nuevo=instance.stock_actual,
                tipo_movimiento='salida_stock'
            )
```

### 3.4 Flujo de Edición de Insumo

#### Detección Automática de Tipo de Cambio

**Vista**: `inventario/views.py` → `editar_insumo()`

```python
def editar_insumo(request, insumo_id):
    insumo = get_object_or_404(Insumo, idInventario=insumo_id)
    data = json.loads(request.body)
    
    stock_anterior = insumo.stock_actual
    precio_anterior = insumo.precio_venta
    
    # Actualizar campos
    if 'precio_venta' in data:
        insumo.precio_venta = Decimal(str(data['precio_venta']))
    if 'stock_actual' in data:
        insumo.stock_actual = int(data['stock_actual'])
    
    # Detectar tipo de cambio (prioridad: stock > precio > información)
    if insumo.stock_actual != stock_anterior:
        if insumo.stock_actual > stock_anterior:
            insumo.tipo_ultimo_movimiento = 'ingreso_stock'
            insumo.ultimo_ingreso = timezone.now()
        else:
            insumo.tipo_ultimo_movimiento = 'salida_stock'
    elif insumo.precio_venta != precio_anterior:
        insumo.tipo_ultimo_movimiento = 'actualizacion_precio'
    else:
        insumo.tipo_ultimo_movimiento = 'modificacion_informacion'
    
    insumo.ultimo_movimiento = timezone.now()
    insumo.usuario_ultimo_movimiento = request.user
    insumo.save()  # Signal detecta tipo y registra en historial
```

**Justificación**: Un solo `save()` puede incluir múltiples cambios. Sistema prioriza el más crítico para registro de historial.

### 3.5 Flujo de Descuento de Stock (Crítico)

**Regla fundamental**: Stock se descuenta **SOLO** al confirmar pago, **NUNCA** antes.

#### Ubicación: `caja/services.py` → `descontar_stock_insumo()`

```python
def descontar_stock_insumo(detalle_venta):
    """
    Descuenta stock al confirmar pago.
    
    CRÍTICO: Esta es la ÚNICA función que descuenta stock.
    Se ejecuta dentro de transacción atómica en procesar_pago().
    """
    # Validación 1: No descontar dos veces
    if detalle_venta.stock_descontado:
        raise ValidationError(f"Stock ya descontado el {detalle_venta.fecha_descuento_stock}")
    
    # Validación 2: Verificar que exista insumo
    if not detalle_venta.insumo:
        raise ValidationError("Detalle sin insumo asociado")
    
    insumo = detalle_venta.insumo
    
    # Validación 3: Stock suficiente
    if insumo.stock_actual < detalle_venta.cantidad:
        raise ValidationError(
            f"Stock insuficiente de '{insumo.medicamento}'. "
            f"Disponible: {insumo.stock_actual}, Requerido: {detalle_venta.cantidad}"
        )
    
    # Descontar
    insumo.stock_actual -= int(detalle_venta.cantidad)
    insumo.tipo_ultimo_movimiento = 'salida_stock'
    insumo.ultimo_movimiento = timezone.now()
    insumo.usuario_ultimo_movimiento = detalle_venta.venta.usuario_creacion
    insumo.save(update_fields=['stock_actual', 'tipo_ultimo_movimiento', 
                                'ultimo_movimiento', 'usuario_ultimo_movimiento'])
    
    # Marcar como descontado
    detalle_venta.stock_descontado = True
    detalle_venta.fecha_descuento_stock = timezone.now()
    detalle_venta.save(update_fields=['stock_descontado', 'fecha_descuento_stock'])
```

**Llamada desde**: `caja/services.py` → `procesar_pago()`

```python
@transaction.atomic
def procesar_pago(venta, usuario, metodo_pago, sesion_caja):
    # Validaciones...
    
    # PASO 1: Descontar stock (si falla, rollback completo)
    for detalle in venta.detalles.filter(tipo='insumo', stock_descontado=False):
        descontar_stock_insumo(detalle)
    
    # PASO 2: Marcar como pagada (solo si descuento exitoso)
    venta.estado = 'pagado'
    venta.fecha_pago = timezone.now()
    venta.save()
    
    # Si algún paso falla, TODA la transacción se revierte
```

**Garantías transaccionales**:
- Si descuento falla → Venta NO queda pagada (rollback)
- Si descuento exitoso pero falla save de venta → Rollback de ambos
- Atomicidad ACID garantizada por PostgreSQL

### 3.6 Validaciones Implementadas

#### Nivel de Vista

**1. Validación de stock no negativo**:
```python
if 'stock_actual' in data:
    stock_nuevo = int(data['stock_actual'])
    if stock_nuevo < 0:
        return JsonResponse({'success': False, 'error': 'Stock no puede ser negativo'})
```

**2. Validación de formato de dosis según tipo**:
```python
if data.get('formato') == 'liquido':
    if not data.get('dosis_ml') or not data.get('ml_contenedor'):
        return JsonResponse({
            'success': False,
            'error': 'Líquidos requieren dosis_ml y ml_contenedor'
        })
```

#### Nivel de Servicio (descontar_stock_insumo)

**1. Prevención de doble descuento**:
```python
if detalle_venta.stock_descontado:
    raise ValidationError("Stock ya descontado")
```

**2. Validación de stock suficiente**:
```python
if insumo.stock_actual < detalle_venta.cantidad:
    raise ValidationError("Stock insuficiente")
```

**3. Validación de insumo no archivado** (en venta libre):
```python
if insumo.archivado:
    raise ValidationError(f"'{insumo.medicamento}' no está disponible (archivado)")
```

### 3.7 Reglas de Negocio

#### RN-INV-01: Stock No Negativo

**Implementación**: Validación en múltiples niveles

```python
# Nivel de aplicación
if insumo.stock_actual < cantidad_requerida:
    raise ValidationError("Stock insuficiente")

# Nivel de base de datos (opcional, no implementado actualmente)
class Meta:
    constraints = [
        models.CheckConstraint(check=models.Q(stock_actual__gte=0), name='stock_no_negativo')
    ]
```

**Comportamiento**: No se puede descontar más de lo disponible. Venta con stock insuficiente falla completamente (rollback).

#### RN-INV-02: Alertas de Stock Bajo

**Implementación**: Método en modelo

```python
def get_stock_nivel(self):
    if self.stock_actual <= self.stock_minimo:
        return 'bajo'  # Rojo
    elif self.stock_actual <= self.stock_medio:
        return 'medio'  # Naranja
    else:
        return 'alto'  # Verde
```

**Uso**: Dashboard muestra insumos en nivel 'bajo' para reorden.

#### RN-INV-03: Soft Delete de Insumos

**Implementación**: Campo `archivado`

```python
# Archivar (no eliminar)
insumo.archivado = True
insumo.tipo_ultimo_movimiento = 'modificacion_informacion'
insumo.save()

# Queries
insumos_activos = Insumo.objects.filter(archivado=False)
```

**Comportamiento**: Insumos archivados no aparecen en ventas libres ni nuevos servicios, pero mantienen historial y pueden aparecer en reportes históricos.

#### RN-INV-04: Trazabilidad Completa

**Implementación**: Campos de trazabilidad + signal + historial

```python
# Cada cambio registra:
insumo.ultimo_movimiento = timezone.now()
insumo.tipo_ultimo_movimiento = 'salida_stock'
insumo.usuario_ultimo_movimiento = request.user
insumo.save()

# Signal registra en RegistroHistorico
RegistroHistorico.objects.create(
    entidad='inventario',
    objeto_id=insumo.pk,
    tipo_evento='salida_stock',
    usuario=usuario,
    datos_cambio={
        'stock_anterior': 10,
        'stock_nuevo': 7,
        'cantidad_descontada': 3,
        'venta_numero': 'V20251219-0042'
    }
)
```

**Resultado**: Cada cambio de stock (ingreso o salida) queda registrado con usuario, fecha exacta y contexto (venta asociada).

#### RN-INV-05: Descuento Atómico con Venta

**Implementación**: `@transaction.atomic` en `procesar_pago()`

```python
@transaction.atomic
def procesar_pago(venta, ...):
    # Descontar stock
    for detalle in venta.detalles.filter(tipo='insumo'):
        descontar_stock_insumo(detalle)
    
    # Marcar venta como pagada
    venta.estado = 'pagado'
    venta.save()
    
    # Si cualquier paso falla, TODO se revierte
```

**Garantía**: Es imposible que una venta quede pagada sin descuento de stock, o que stock se descuente sin venta pagada.

---

## 4. GESTIÓN DE SERVICIOS

### 4.1 Módulos Participantes

**Módulo Principal**: `servicios/`
- `models.py`: Define `Servicio` y `ServicioInsumo`
- `views.py`: CRUD de servicios
- `signals.py`: Registra cambios en historial

**Módulos Consumidores**:
- `agenda/`: Asocia servicios a citas
- `clinica/`: Registra servicios en consultas
- `caja/`: Factura servicios

### 4.2 Modelos Utilizados

#### Servicio
```python
class Servicio(models.Model):
    idServicio = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    categoria = models.CharField(max_length=100)
    precio = models.PositiveIntegerField(default=0)
    duracion = models.PositiveIntegerField(default=0)  # Minutos
    
    activo = models.BooleanField(default=True)  # Soft delete
    
    # Trazabilidad
    ultimo_movimiento = models.DateTimeField(null=True)
    tipo_ultimo_movimiento = models.CharField(max_length=50, null=True)
    usuario_ultima_modificacion = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
```

#### ServicioInsumo (Tabla Through para Many-to-Many)
```python
class ServicioInsumo(models.Model):
    """
    Define qué insumos utiliza típicamente un servicio.
    
    IMPORTANTE: Es SOLO REFERENCIAL, NO automatiza descuento de stock.
    El descuento ocurre en caja/services.py al confirmar pago.
    """
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='insumos_requeridos')
    insumo = models.ForeignKey(Insumo, on_delete=models.CASCADE, related_name='servicios_relacionados')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    es_opcional = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['servicio', 'insumo']
```

**Relación**: Servicio ↔ Insumo (N:M con tabla through explícita)

**Propósito de ServicioInsumo**:
- Plantilla de insumos típicos del servicio
- Sugerencia al registrar consulta
- **NO automatiza** descuento de stock
- **NO valida** disponibilidad de stock

### 4.3 Flujo de Creación de Servicio

#### Paso 1: Creación de Servicio Base

```python
@login_required
def crear_servicio(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        
        servicio = Servicio(
            nombre=data.get('nombre'),
            descripcion=data.get('descripcion', ''),
            categoria=data.get('categoria', ''),
            precio=int(data.get('precio', 0)),
            duracion=int(data.get('duracion', 0))
        )
        
        # Establecer usuario para signal
        servicio._usuario_modificacion = request.user
        servicio.save()
        
        # Signal registra creación en historial
        
        return JsonResponse({'success': True, 'servicio_id': servicio.idServicio})
```

#### Paso 2: Asociación de Insumos (Opcional)

```python
def crear_servicio(request):
    # ... creación de servicio ...
    
    # Agregar insumos referenciales
    insumos = data.get('insumos', [])
    for insumo_data in insumos:
        insumo = get_object_or_404(Insumo, idInventario=insumo_data['id'])
        ServicioInsumo.objects.create(
            servicio=servicio,
            insumo=insumo,
            cantidad=int(insumo_data.get('cantidad', 1)),
            es_opcional=insumo_data.get('es_opcional', False)
        )
```

**Resultado**: Servicio tiene lista de insumos típicos, pero NO se descuentan automáticamente.

### 4.4 Flujo de Edición de Servicio

#### Detección de Tipo de Cambio

```python
@login_required
def editar_servicio(request, servicio_id):
    servicio = get_object_or_404(Servicio, idServicio=servicio_id)
    data = json.loads(request.body)
    
    precio_anterior = servicio.precio
    duracion_anterior = servicio.duracion
    
    servicio.nombre = data.get('nombre', servicio.nombre)
    servicio.precio = int(data.get('precio', servicio.precio))
    servicio.duracion = int(data.get('duracion', servicio.duracion))
    
    # Detectar tipo de cambio
    if servicio.precio != precio_anterior:
        servicio.tipo_ultimo_movimiento = 'cambio_precio_servicio'
    elif servicio.duracion != duracion_anterior:
        servicio.tipo_ultimo_movimiento = 'cambio_duracion'
    else:
        servicio.tipo_ultimo_movimiento = 'modificacion_informacion'
    
    servicio._usuario_modificacion = request.user
    servicio.save()  # Signal registra según tipo
    
    # Actualizar insumos asociados
    ServicioInsumo.objects.filter(servicio=servicio).delete()
    for insumo_data in data.get('insumos', []):
        insumo = get_object_or_404(Insumo, idInventario=insumo_data['id'])
        ServicioInsumo.objects.create(
            servicio=servicio,
            insumo=insumo,
            cantidad=int(insumo_data.get('cantidad', 1))
        )
```

### 4.5 Flujo de Eliminación/Desactivación

**Estrategia híbrida**: Soft delete si tiene referencias, hard delete si no.

```python
@csrf_exempt
@login_required
def eliminar_servicio(request, servicio_id):
    servicio = get_object_or_404(Servicio, idServicio=servicio_id)
    
    # Verificar referencias en otras tablas
    relaciones = []
    
    with connection.cursor() as cursor:
        # Citas en agenda
        cursor.execute('SELECT COUNT(*) FROM agenda_cita WHERE servicio_id = %s', [servicio_id])
        count_citas = cursor.fetchone()[0]
        if count_citas > 0:
            relaciones.append(f"{count_citas} citas")
        
        # Detalles de ventas
        cursor.execute('SELECT COUNT(*) FROM caja_detalleventa WHERE servicio_id = %s', [servicio_id])
        count_ventas = cursor.fetchone()[0]
        if count_ventas > 0:
            relaciones.append(f"{count_ventas} ventas")
    
    if relaciones:
        # SOFT DELETE: Tiene referencias, solo desactivar
        servicio.activo = False
        servicio.tipo_ultimo_movimiento = 'desactivacion'
        servicio._usuario_modificacion = request.user
        servicio.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Servicio desactivado (tiene {", ".join(relaciones)})'
        })
    else:
        # HARD DELETE: Sin referencias, eliminar físicamente
        nombre = servicio.nombre
        servicio.delete()  # CASCADE elimina ServicioInsumo automáticamente
        
        return JsonResponse({
            'success': True,
            'message': f'Servicio "{nombre}" eliminado completamente'
        })
```

**Justificación**:
- Servicios con historial (citas, ventas) se preservan para auditoría
- Servicios sin referencias (creados por error) se eliminan completamente
- Consulta de referencias usa SQL directo (más eficiente que ORM para conteos)

### 4.6 Validaciones Implementadas

#### Nivel de Modelo

**1. Validación de precio positivo**:
```python
precio = models.PositiveIntegerField(default=0)
```

PostgreSQL crea constraint `CHECK (precio >= 0)`.

**2. Validación de duración positiva**:
```python
duracion = models.PositiveIntegerField(default=0)
```

#### Nivel de Vista

**1. Validación de servicio activo en venta**:
```python
# En caja/services.py → crear_venta_libre()
servicio = Servicio.objects.get(pk=item['servicio_id'])
if not servicio.activo:
    raise ValidationError(f'Servicio "{servicio.nombre}" no está disponible (inactivo)')
```

**2. Validación de campos requeridos**:
```python
if not data.get('nombre'):
    return JsonResponse({'success': False, 'error': 'Nombre es requerido'})
if not data.get('categoria'):
    return JsonResponse({'success': False, 'error': 'Categoría es requerida'})
```

#### Nivel de ServicioInsumo

**1. Unique constraint**:
```python
class Meta:
    unique_together = ['servicio', 'insumo']
```

Previene agregar el mismo insumo dos veces a un servicio.

### 4.7 Reglas de Negocio

#### RN-SRV-01: Servicios Referenciales (NO Automatizan Stock)

**Documentación explícita en modelo**:
```python
"""
NOTA TÉCNICA IMPORTANTE:

El modelo ServicioInsumo es ÚNICAMENTE REFERENCIAL/PLANTILLA.
NO automatiza el descuento de inventario.
NO valida stock disponible.

FLUJO DE INVENTARIO:
El descuento de inventario ocurre EXCLUSIVAMENTE en caja/services.py
cuando se confirma el pago de una venta.

ServicioInsumo sirve solo como:
- Plantilla de insumos típicos del servicio
- Sugerencia al registrar consulta
- Guía para el personal
"""
```

**Flujo real**:
1. Servicio tiene insumos asociados en `ServicioInsumo` (plantilla)
2. Al crear consulta, veterinario ve sugerencia de insumos
3. Veterinario confirma o modifica cantidades manualmente
4. Insumos se registran en `ConsultaInsumo`
5. Al pagar, `caja/services.py` descuenta de `ConsultaInsumo`, **NO de `ServicioInsumo`**

#### RN-SRV-02: Soft Delete Condicional

**Implementación**:
- Si servicio tiene citas o ventas → `activo=False` (soft delete)
- Si servicio sin referencias → `.delete()` (hard delete)

**Justificación**: Preservar historial pero evitar acumulación de registros inútiles.

#### RN-SRV-03: Trazabilidad de Cambios de Precio

**Implementación**: Signal registra cambios de precio

```python
@receiver(pre_save, sender=Servicio)
def servicio_pre_save(sender, instance, **kwargs):
    if instance.pk:
        anterior = Servicio.objects.get(pk=instance.pk)
        _servicio_anterior[instance.pk] = {
            'precio': anterior.precio,
            'duracion': anterior.duracion
        }

@receiver(post_save, sender=Servicio)
def servicio_post_save(sender, instance, created, **kwargs):
    if not created:
        anterior = _servicio_anterior.get(instance.pk, {})
        if anterior.get('precio') != instance.precio:
            registrar_cambio_precio(
                entidad='servicio',
                objeto_id=instance.pk,
                usuario=getattr(instance, '_usuario_modificacion', None),
                precio_anterior=anterior['precio'],
                precio_nuevo=instance.precio
            )
```

**Resultado**: Historial completo de precios de cada servicio (crítico para análisis financiero).

#### RN-SRV-04: Duración para Agendamiento

**Implementación**: Campo `duracion` usado por módulo `agenda/`

```python
# Al crear cita en agenda
servicio = Servicio.objects.get(pk=servicio_id)
duracion_bloques = servicio.duracion // 15  # Convertir a bloques de 15 min

cita = Cita.objects.create(
    servicio=servicio,
    hora_inicio=hora_inicio,
    cantidad_bloques=duracion_bloques  # Ocupa N bloques en timeline
)
```

**Resultado**: Servicios de 30 min ocupan 2 bloques, de 60 min ocupan 4 bloques.

#### RN-SRV-05: Precio Copiado en Venta

**Implementación**: `DetalleVenta` copia precio al momento de venta

```python
# En caja/services.py
DetalleVenta.objects.create(
    venta=venta,
    tipo='servicio',
    servicio=servicio,
    descripcion=servicio.nombre,  # Copiado
    precio_unitario=servicio.precio  # Copiado
)
```

**Justificación**: Si precio del servicio cambia después, ventas históricas mantienen precio al que se facturó.

---

## SÍNTESIS DE FLUJOS

### Principios Arquitectónicos Aplicados

**1. Validación en Múltiples Niveles**
- Vista: Valida datos de entrada y reglas de negocio de alto nivel
- Modelo: Valida integridad de datos individuales
- Base de Datos: Constraints finales (UNIQUE, FOREIGN KEY, CHECK)

**2. Transaccionalidad Explícita**
- Operaciones críticas (pago + descuento stock) usan `@transaction.atomic`
- Garantiza consistencia: TODO o NADA

**3. Trazabilidad Automática**
- Signals registran cambios sin código repetitivo
- Middleware captura usuario sin acoplamiento
- Historial append-only inmutable

**4. Soft Delete Preferido**
- Entidades transaccionales (Paciente, Insumo, Servicio) usan flags booleanos
- Hard delete solo cuando sin referencias o errores de entrada

**5. Normalización de Datos**
- RUT, teléfonos, emails normalizados antes de almacenar
- Previene duplicados por diferencias de formato

**6. Separación de Responsabilidades**
- Vista: Coordinación y preparación de datos
- Servicio: Lógica de negocio compleja
- Modelo: Validaciones de dominio
- Signal: Efectos secundarios (historial, notificaciones)

Estos flujos demuestran un sistema técnicamente robusto con validaciones exhaustivas, trazabilidad completa, y garantías de consistencia mediante transacciones ACID.
---

## 5. ATENCIÓN CLÍNICA

### 5.1 Descripción General

El flujo de atención clínica gestiona las consultas veterinarias, incluyendo el registro de signos vitales, diagnóstico, tratamiento, asociación de servicios e insumos, y la generación automática de cobros pendientes para caja.

**Característica crítica**: El sistema implementa un **descuento de stock centralizado en el módulo de caja**, NO en el módulo clínico. Esto previene descuentos duplicados y asegura que el stock solo se descuente cuando el pago es confirmado.

### 5.2 Módulos Participantes

- **clinica/**: Gestión de consultas y modelos clínicos
- **agenda/**: Citas que pueden generar consultas
- **servicios/**: Servicios aplicados en consulta
- **inventario/**: Insumos y medicamentos utilizados
- **pacientes/**: Pacientes atendidos
- **cuentas/**: Veterinarios responsables
- **caja/**: Generación de cobros y descuento de stock

### 5.3 Modelos Utilizados

#### Consulta
```python
class Consulta(models.Model):
    """Consulta veterinaria con servicios e insumos"""
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE)
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    fecha = models.DateTimeField()
    tipo_consulta = models.CharField(max_length=50, choices=TIPO_CONSULTA_CHOICES)
    
    # Signos vitales
    temperatura = models.DecimalField(max_digits=4, decimal_places=1)
    peso = models.DecimalField(max_digits=5, decimal_places=2)
    frecuencia_cardiaca = models.IntegerField()
    frecuencia_respiratoria = models.IntegerField()
    
    # Información clínica
    motivo_consulta = models.TextField()
    anamnesis = models.TextField()
    diagnostico = models.TextField()
    tratamiento = models.TextField()
    
    # Relaciones con servicios e insumos
    servicios = models.ManyToManyField(Servicio)
    medicamentos = models.ManyToManyField(Insumo, through='ConsultaInsumo')
    
    # Control de descuento
    insumos_descontados = models.BooleanField(default=False)
```

#### ConsultaInsumo
```python
class ConsultaInsumo(models.Model):
    """Tabla intermedia con cálculo automático de cantidades por dosis"""
    consulta = models.ForeignKey(Consulta, on_delete=models.CASCADE, related_name='insumos_detalle')
    insumo = models.ForeignKey(Insumo, on_delete=models.PROTECT)
    
    # Datos para cálculo automático
    peso_paciente = models.DecimalField(max_digits=6, decimal_places=2)
    dosis_ml_por_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dosis_total_ml = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ml_por_contenedor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Cantidades
    cantidad_calculada = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    cantidad_manual = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cantidad_final = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    
    # Control
    calculo_automatico = models.BooleanField(default=False)
    requiere_confirmacion = models.BooleanField(default=False)
    stock_descontado = models.BooleanField(default=False)
    fecha_descuento = models.DateTimeField(null=True, blank=True)
    
    def calcular_cantidad(self):
        """Calcula cantidad de contenedores basándose en dosis y peso"""
        from decimal import Decimal, ROUND_UP
        
        if self.cantidad_manual:
            self.cantidad_final = self.cantidad_manual
            self.calculo_automatico = False
            return
        
        if not all([self.peso_paciente, self.dosis_ml_por_kg, self.ml_por_contenedor]):
            self.requiere_confirmacion = True
            self.cantidad_final = Decimal('1')
            return
        
        # Dosis total = peso × dosis/kg
        self.dosis_total_ml = self.peso_paciente * self.dosis_ml_por_kg
        
        # Cantidad = dosis_total ÷ ml_por_contenedor (redondear arriba)
        self.cantidad_calculada = (
            self.dosis_total_ml / self.ml_por_contenedor
        ).quantize(Decimal('1'), rounding=ROUND_UP)
        
        self.cantidad_final = self.cantidad_calculada
        self.calculo_automatico = True
    
    def save(self, *args, **kwargs):
        """Calcula cantidad antes de guardar"""
        self.calcular_cantidad()
        super().save(*args, **kwargs)
```

#### Venta y DetalleVenta (en caja/)
```python
class Venta(models.Model):
    """Cobro generado desde consulta o venta libre"""
    TIPO_ORIGEN_CHOICES = [
        ('consulta', 'Consulta'),
        ('hospitalizacion', 'Hospitalización'),
        ('venta_libre', 'Venta Libre'),
    ]
    
    tipo_origen = models.CharField(max_length=20, choices=TIPO_ORIGEN_CHOICES)
    consulta = models.OneToOneField(Consulta, on_delete=models.PROTECT, null=True, related_name='venta')
    paciente = models.ForeignKey(Paciente, on_delete=models.PROTECT)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES)
    sesion_caja = models.ForeignKey(SesionCaja, on_delete=models.PROTECT, null=True)
    metodo_pago = models.CharField(max_length=20)
    total = models.DecimalField(max_digits=12, decimal_places=2)


class DetalleVenta(models.Model):
    """Detalle de venta con control de descuento"""
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name='detalles')
    tipo = models.CharField(max_length=10, choices=[('servicio', 'Servicio'), ('insumo', 'Insumo')])
    servicio = models.ForeignKey(Servicio, on_delete=models.PROTECT, null=True)
    insumo = models.ForeignKey(Insumo, on_delete=models.PROTECT, null=True)
    descripcion = models.CharField(max_length=255)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Control de descuento
    stock_descontado = models.BooleanField(default=False)
    fecha_descuento_stock = models.DateTimeField(null=True, blank=True)
```

### 5.4 Flujo Técnico Detallado

#### FASE 1: Creación de Consulta

**Entrada**: Veterinario selecciona paciente y completa formulario de consulta

**Proceso**:
1. Validar que el paciente exista y esté activo
2. Registrar signos vitales obligatorios (temperatura, peso, frecuencias)
3. Registrar información clínica (motivo, anamnesis, diagnóstico, tratamiento)
4. Asociar servicios aplicados (relación ManyToMany)
5. Guardar consulta en estado borrador

**Código relevante**:
```python
# clinica/views.py
@transaction.atomic
def crear_consulta(request):
    """Crea consulta con validaciones de signos vitales"""
    consulta = Consulta(
        paciente=paciente,
        veterinario=request.user,
        fecha=timezone.now(),
        tipo_consulta=tipo_consulta,
        temperatura=temperatura,
        peso=peso,
        frecuencia_cardiaca=frecuencia_cardiaca,
        frecuencia_respiratoria=frecuencia_respiratoria,
        motivo_consulta=motivo_consulta,
        # ... resto de campos
    )
    consulta.save()
    
    # Asociar servicios
    for servicio_id in servicios_ids:
        consulta.servicios.add(servicio_id)
```

**Validaciones**:
- RN-CLI-01: Temperatura debe estar entre 35°C y 42°C
- RN-CLI-02: Peso debe ser mayor a 0
- RN-CLI-03: Frecuencias deben ser valores positivos
- RN-CLI-04: Motivo de consulta obligatorio

#### FASE 2: Asociación de Insumos con Cálculo Automático

**Entrada**: Veterinario selecciona medicamentos/insumos a aplicar

**Proceso**:
1. Crear registro en `ConsultaInsumo` con peso del paciente
2. Obtener dosis del insumo (ml/kg) y ml_por_contenedor
3. Calcular cantidad automáticamente vía `calcular_cantidad()`
4. Si faltan datos (dosis o ml_contenedor), marcar `requiere_confirmacion=True`
5. Permitir ajuste manual de cantidad si es necesario

**Ejemplo de cálculo automático**:
```
Paciente: 8.5 kg
Insumo: Antibiótico con dosis 0.5 ml/kg
Contenedor: 5 ml por frasco

dosis_total_ml = 8.5 kg × 0.5 ml/kg = 4.25 ml
cantidad_calculada = ⌈4.25 ml ÷ 5 ml⌉ = ⌈0.85⌉ = 1 frasco
```

**Código relevante**:
```python
# clinica/models.py - Método de ConsultaInsumo
def calcular_cantidad(self):
    from decimal import Decimal, ROUND_UP
    
    # Si tiene cantidad manual, usar esa
    if self.cantidad_manual:
        self.cantidad_final = self.cantidad_manual
        self.calculo_automatico = False
        return
    
    # Verificar datos mínimos
    if not all([self.peso_paciente, self.dosis_ml_por_kg, self.ml_por_contenedor]):
        self.requiere_confirmacion = True
        self.cantidad_final = Decimal('1')  # Default
        return
    
    # Calcular dosis total
    self.dosis_total_ml = self.peso_paciente * self.dosis_ml_por_kg
    
    # Calcular cantidad de contenedores (SIEMPRE redondear arriba)
    self.cantidad_calculada = (
        self.dosis_total_ml / self.ml_por_contenedor
    ).quantize(Decimal('1'), rounding=ROUND_UP)
    
    self.cantidad_final = self.cantidad_calculada
    self.calculo_automatico = True
    self.requiere_confirmacion = False
```

**Validaciones**:
- RN-CLI-05: Peso del paciente obligatorio para cálculo automático
- RN-CLI-06: Dosis ml/kg del insumo debe estar configurada
- RN-CLI-07: ML por contenedor del insumo debe estar configurado
- RN-CLI-08: Cantidad manual debe ser mayor a 0 si se especifica

#### FASE 3: Generación Automática de Cobro Pendiente

**Entrada**: Consulta con servicios e insumos asociados

**Proceso**:
1. Llamar a `crear_cobro_pendiente_desde_consulta()` en `caja/services.py`
2. Crear o actualizar `Venta` con `tipo_origen='consulta'` y `estado='pendiente'`
3. Si la venta ya existe (edición de consulta), eliminar `DetalleVenta` antiguos
4. Crear `DetalleVenta` por cada servicio con `tipo='servicio'`
5. Crear `DetalleVenta` por cada insumo con `tipo='insumo'`
6. Calcular totales de la venta
7. Registrar auditoría

**Código relevante**:
```python
# caja/services.py
@transaction.atomic
def crear_cobro_pendiente_desde_consulta(consulta, usuario):
    """Crea venta pendiente desde consulta"""
    # Verificar si ya existe venta (edición de consulta)
    if hasattr(consulta, 'venta') and consulta.venta:
        venta = consulta.venta
        venta.detalles.all().delete()  # Eliminar detalles antiguos para recrear
    else:
        venta = Venta.objects.create(
            tipo_origen='consulta',
            consulta=consulta,
            paciente=consulta.paciente,
            estado='pendiente',
            usuario_creacion=usuario
        )
    
    # Agregar servicios
    for servicio in consulta.servicios.all():
        DetalleVenta.objects.create(
            venta=venta,
            tipo='servicio',
            servicio=servicio,
            descripcion=servicio.nombre,
            cantidad=1,
            precio_unitario=servicio.precio
        )
    
    # Agregar insumos con metadata del cálculo
    for consulta_insumo in consulta.insumos_detalle.all():
        DetalleVenta.objects.create(
            venta=venta,
            tipo='insumo',
            insumo=consulta_insumo.insumo,
            descripcion=consulta_insumo.insumo.medicamento,
            cantidad=consulta_insumo.cantidad_final,
            precio_unitario=consulta_insumo.insumo.precio_venta or Decimal('0'),
            # Metadata del cálculo automático
            peso_paciente=consulta_insumo.peso_paciente,
            dosis_calculada_ml=consulta_insumo.dosis_total_ml,
            ml_contenedor=consulta_insumo.ml_por_contenedor,
            calculo_automatico=consulta_insumo.calculo_automatico
        )
    
    venta.calcular_totales()
    
    # Auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='crear_venta',
        usuario=usuario,
        descripcion=f"Cobro pendiente desde consulta #{consulta.id}"
    )
    
    return venta
```

**Validaciones**:
- RN-CAJ-01: Venta debe tener al menos un detalle (servicio o insumo)
- RN-CAJ-02: Total debe ser mayor a 0
- RN-CAJ-03: OneToOne entre Consulta y Venta (no duplicar cobros)

#### FASE 4: Confirmación de Pago y Descuento de Stock (CRÍTICO)

**Entrada**: Cajero confirma pago desde módulo de caja

**Proceso**: Operación transaccional crítica en `procesar_pago()`

1. **Validar estado de venta** (debe ser 'pendiente' o 'en_proceso')
2. **Validar sesión de caja activa** (no cerrada)
3. **Obtener detalles de insumos** con `stock_descontado=False`
4. **Validar stock suficiente** para cada insumo ANTES de descontar
5. **Descontar stock** de cada insumo dentro de transacción atómica
6. **Actualizar insumo** (stock_actual, ultimo_movimiento, tipo_ultimo_movimiento)
7. **Marcar detalle** con `stock_descontado=True` y `fecha_descuento_stock`
8. **Actualizar venta** a `estado='pagado'` y asociar `sesion_caja`
9. **Registrar auditoría** del pago
10. **Si falla cualquier paso**: `ROLLBACK` completo (venta NO queda pagada)

**Código relevante**:
```python
# caja/services.py
@transaction.atomic
def procesar_pago(venta, usuario, metodo_pago, sesion_caja):
    """
    Procesa pago y descuenta stock de forma centralizada.
    
    ARQUITECTURA CRÍTICA:
    - TODO el descuento de stock ocurre AQUÍ, en caja
    - NO se descuenta en clinica/views.py
    - Esto previene descuentos duplicados
    """
    # Validación 1: Estado de venta
    if venta.estado not in ['pendiente', 'en_proceso']:
        raise ValidationError("Esta venta ya fue procesada")
    
    # Validación 2: Sesión activa
    if not sesion_caja or sesion_caja.esta_cerrada:
        raise ValidationError("No hay sesión de caja abierta")
    
    # Validación 3: Verificar detalles
    if not venta.detalles.exists():
        raise ValidationError("La venta no tiene detalles")
    
    # PASO CRÍTICO: Descontar stock
    detalles_insumos = venta.detalles.filter(tipo='insumo')
    detalles_pendientes = detalles_insumos.filter(stock_descontado=False)
    
    for detalle in detalles_pendientes:
        if not detalle.insumo:
            continue
        
        try:
            descontar_stock_insumo(detalle)
        except ValidationError as ve:
            # Si falla, transaction.atomic hace ROLLBACK
            raise ValidationError(f"{detalle.insumo.medicamento}: {str(ve)}")
    
    # Marcar venta como pagada (SOLO si descuento fue exitoso)
    venta.estado = 'pagado'
    venta.metodo_pago = metodo_pago
    venta.sesion_caja = sesion_caja
    venta.fecha_pago = timezone.now()
    venta.save()
    
    # Auditoría
    AuditoriaCaja.objects.create(
        venta=venta,
        accion='confirmar_pago',
        usuario=usuario,
        descripcion=f"Pago confirmado - {metodo_pago}"
    )
    
    return venta


def descontar_stock_insumo(detalle):
    """
    Descuenta stock de un DetalleVenta de tipo insumo.
    
    Valida stock suficiente ANTES de descontar.
    Previene stock negativo.
    """
    if detalle.stock_descontado:
        raise ValidationError("Este insumo ya fue descontado")
    
    insumo = detalle.insumo
    cantidad = detalle.cantidad
    
    # Validación crítica: stock suficiente
    if insumo.stock_actual < cantidad:
        raise ValidationError(
            f"Stock insuficiente para '{insumo.medicamento}'. "
            f"Requerido: {cantidad}, Disponible: {insumo.stock_actual}"
        )
    
    # Descontar
    stock_anterior = insumo.stock_actual
    insumo.stock_actual -= cantidad
    insumo.ultimo_movimiento = timezone.now()
    insumo.tipo_ultimo_movimiento = 'salida'
    insumo.save(update_fields=['stock_actual', 'ultimo_movimiento', 'tipo_ultimo_movimiento'])
    
    # Marcar detalle como descontado
    detalle.stock_descontado = True
    detalle.fecha_descuento_stock = timezone.now()
    detalle.save(update_fields=['stock_descontado', 'fecha_descuento_stock'])
```

**Validaciones**:
- RN-CAJ-04: Venta debe estar en estado 'pendiente' o 'en_proceso'
- RN-CAJ-05: Debe existir sesión de caja activa y NO cerrada
- RN-CAJ-06: Stock debe ser suficiente ANTES de confirmar pago
- RN-CAJ-07: Si descuento falla, venta NO se marca como pagada (rollback)
- RN-CAJ-08: Prevenir descuentos duplicados con flag `stock_descontado`

### 5.5 Decisión Arquitectónica: Descuento Centralizado

**Problema identificado**: En versiones anteriores del sistema, el descuento de stock se intentaba realizar en `clinica/views.py` al crear la consulta. Esto causaba:
- Descuentos duplicados si la consulta se editaba
- Descuentos sin pago confirmado
- Dificultad para revertir operaciones
- Inconsistencia entre consulta y caja

**Solución implementada**: Descuento de stock ÚNICAMENTE en `caja/services.py` al confirmar pago

**Evidencia en código**:
```python
# clinica/views.py - Líneas 115-145
def descontar_insumos_consulta(consulta):
    """
    ⚠️ DESCUENTO DE STOCK CENTRALIZADO EN CAJA
    El stock se descuenta ÚNICAMENTE al confirmar el pago en caja/services.py
    
    # CÓDIGO COMENTADO - Descuento ahora ocurre en caja al confirmar pago
    # # Validar stock
    # if insumo.stock_actual <= 0:
    #     raise ValidationError(f"Stock insuficiente para {insumo.medicamento}")
    # 
    # # Descontar 1 unidad
    # insumo.stock_actual -= 1
    # insumo.save(update_fields=['stock_actual'])
    """
    print('ℹ️ Descuento de stock ocurrirá en caja al confirmar pago')
```

**Ventajas**:
- ✅ Descuento ocurre SOLO cuando hay pago confirmado
- ✅ Flag `stock_descontado` previene duplicados
- ✅ Transacción atómica garantiza consistencia
- ✅ Fácil auditoría en un solo punto
- ✅ Reversiones más simples (cancelar venta antes de pagar)

---

## 6. HOSPITALIZACIÓN

### 6.1 Descripción General

El flujo de hospitalización gestiona el ingreso, seguimiento diario, cirugías y alta de pacientes hospitalizados. Similar a consultas, implementa **descuento de stock centralizado en caja** al confirmar el pago.

**Particularidad**: Hospitalización aplica multiplicador de días de tratamiento a los insumos, calculando automáticamente desde fecha de ingreso hasta fecha de alta.

### 6.2 Módulos Participantes

- **clinica/**: Gestión de hospitalizaciones, cirugías, registros diarios, altas
- **servicios/**: Servicios de hospitalización y cirugías
- **inventario/**: Medicamentos e insumos utilizados
- **pacientes/**: Pacientes hospitalizados
- **cuentas/**: Veterinarios responsables
- **caja/**: Generación de cobros y descuento de stock

### 6.3 Modelos Utilizados

#### Hospitalizacion
```python
class Hospitalizacion(models.Model):
    """Hospitalización con control de estado"""
    ESTADO_CHOICES = [
        ('activa', 'Activa'),
        ('alta', 'Alta'),
        ('fallecido', 'Fallecido'),
    ]
    
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE)
    veterinario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    fecha_ingreso = models.DateTimeField()
    fecha_alta = models.DateTimeField(null=True, blank=True)
    motivo = models.TextField()
    diagnostico_hosp = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activa')
    observaciones = models.TextField(blank=True)
    
    # Control de descuento
    insumos_descontados = models.BooleanField(default=False)
    
    def clean(self):
        """Validación: un paciente no puede tener múltiples hospitalizaciones activas"""
        if self.estado == 'activa':
            activas = Hospitalizacion.objects.filter(
                paciente=self.paciente,
                estado='activa'
            ).exclude(pk=self.pk)
            
            if activas.exists():
                raise ValidationError(
                    f"El paciente {self.paciente.nombre} ya tiene una "
                    f"hospitalización activa. Debe darse de alta primero."
                )
```

#### Cirugia
```python
class Cirugia(models.Model):
    """Cirugía realizada durante hospitalización"""
    RESULTADO_CHOICES = [
        ('', 'Sin resultado'),
        ('exitosa', 'Exitosa'),
        ('con_complicaciones', 'Con complicaciones'),
        ('problemas', 'Problemas'),
    ]
    
    hospitalizacion = models.ForeignKey(Hospitalizacion, on_delete=models.CASCADE, related_name='cirugias')
    servicio = models.ForeignKey(Servicio, on_delete=models.SET_NULL, null=True)
    fecha_cirugia = models.DateTimeField()
    veterinario_cirujano = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    tipo_cirugia = models.CharField(max_length=200)
    descripcion = models.TextField()
    duracion_minutos = models.IntegerField(blank=True, null=True)
    tipo_anestesia = models.CharField(max_length=100, blank=True)
    medicamentos = models.ManyToManyField(Insumo, blank=True)
    complicaciones = models.TextField(blank=True)
    resultado = models.CharField(max_length=25, choices=RESULTADO_CHOICES)
```

#### RegistroDiario
```python
class RegistroDiario(models.Model):
    """Registro diario de signos vitales durante hospitalización"""
    hospitalizacion = models.ForeignKey(Hospitalizacion, on_delete=models.CASCADE, related_name='registros_diarios')
    fecha_registro = models.DateTimeField()
    temperatura = models.DecimalField(max_digits=4, decimal_places=1)  # Obligatorio
    peso = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    frecuencia_cardiaca = models.IntegerField(null=True, blank=True)
    frecuencia_respiratoria = models.IntegerField(null=True, blank=True)
    observaciones = models.TextField(blank=True)
    medicamentos = models.ManyToManyField(Insumo, blank=True)
```

#### Alta
```python
class Alta(models.Model):
    """Resumen de alta médica"""
    hospitalizacion = models.OneToOneField(Hospitalizacion, on_delete=models.CASCADE, related_name='alta_medica')
    fecha_alta = models.DateTimeField()
    diagnostico_final = models.TextField(blank=True)
    tratamiento_post_alta = models.TextField(blank=True)
    recomendaciones = models.TextField(blank=True)
    proxima_revision = models.DateField(blank=True, null=True)
```

### 6.4 Flujo Técnico Detallado

#### FASE 1: Ingreso a Hospitalización

**Entrada**: Veterinario registra ingreso de paciente

**Proceso**:
1. Validar que paciente no tenga hospitalización activa (método `clean()`)
2. Registrar datos de ingreso (motivo, diagnóstico inicial)
3. Establecer `estado='activa'`
4. Crear hospitalización

**Código relevante**:
```python
# clinica/views.py
@transaction.atomic
def crear_hospitalizacion(request):
    """Crea hospitalización con validación de duplicados"""
    hospitalizacion = Hospitalizacion(
        paciente=paciente,
        veterinario=request.user,
        fecha_ingreso=timezone.now(),
        motivo=motivo,
        diagnostico_hosp=diagnostico,
        estado='activa'
    )
    
    # Ejecuta clean() que valida hospitalizaciones activas
    hospitalizacion.full_clean()
    hospitalizacion.save()
```

**Validaciones**:
- RN-HOS-01: Paciente no puede tener múltiples hospitalizaciones activas
- RN-HOS-02: Motivo de ingreso obligatorio
- RN-HOS-03: Diagnóstico inicial obligatorio
- RN-HOS-04: Veterinario responsable obligatorio

#### FASE 2: Registros Diarios y Cirugías

**Entrada**: Durante la hospitalización se registran evoluciones y procedimientos

**Proceso**:
1. Crear `RegistroDiario` con signos vitales y observaciones
2. Registrar medicamentos aplicados (ManyToMany)
3. Si hay cirugía: crear `Cirugia` asociada a hospitalización
4. Registrar detalles de cirugía (tipo, anestesia, duración, resultado)
5. Asociar medicamentos/insumos usados en cirugía

**Código relevante**:
```python
# clinica/views.py
def crear_registro_diario(hospitalizacion, datos):
    """Crea registro diario de evolución"""
    registro = RegistroDiario.objects.create(
        hospitalizacion=hospitalizacion,
        fecha_registro=timezone.now(),
        temperatura=datos['temperatura'],
        peso=datos.get('peso'),
        frecuencia_cardiaca=datos.get('fc'),
        frecuencia_respiratoria=datos.get('fr'),
        observaciones=datos.get('observaciones', '')
    )
    
    if 'medicamentos' in datos:
        registro.medicamentos.set(datos['medicamentos'])
    
    return registro

def crear_cirugia(hospitalizacion, datos):
    """Registra cirugía durante hospitalización"""
    cirugia = Cirugia.objects.create(
        hospitalizacion=hospitalizacion,
        servicio=datos.get('servicio'),
        fecha_cirugia=timezone.now(),
        veterinario_cirujano=datos['veterinario'],
        tipo_cirugia=datos['tipo'],
        descripcion=datos['descripcion'],
        duracion_minutos=datos.get('duracion'),
        tipo_anestesia=datos.get('tipo_anestesia', ''),
        resultado=datos.get('resultado', '')
    )
    
    if 'medicamentos' in datos:
        cirugia.medicamentos.set(datos['medicamentos'])
    
    return cirugia
```

**Validaciones**:
- RN-HOS-05: Temperatura obligatoria en registros diarios
- RN-HOS-06: Registros solo para hospitalizaciones activas
- RN-HOS-07: Cirugía requiere veterinario cirujano
- RN-HOS-08: Tipo de anestesia obligatorio para cirugías

#### FASE 3: Alta Médica

**Entrada**: Veterinario da de alta al paciente

**Proceso**:
1. Cambiar `estado` de hospitalización a 'alta' o 'fallecido'
2. Establecer `fecha_alta`
3. Calcular `dias_tratamiento` (fecha_alta - fecha_ingreso)
4. Crear registro de `Alta` con resumen médico
5. Registrar diagnóstico final, tratamiento post-alta, recomendaciones

**Código relevante**:
```python
# clinica/views.py
@transaction.atomic
def dar_alta_paciente(hospitalizacion_id, datos_alta):
    """Procesa alta médica"""
    hospitalizacion = Hospitalizacion.objects.get(pk=hospitalizacion_id)
    
    if hospitalizacion.estado != 'activa':
        raise ValidationError("Solo se pueden dar de alta hospitalizaciones activas")
    
    # Actualizar hospitalización
    hospitalizacion.estado = 'alta'
    hospitalizacion.fecha_alta = timezone.now()
    hospitalizacion.save()
    
    # Crear registro de alta
    alta = Alta.objects.create(
        hospitalizacion=hospitalizacion,
        fecha_alta=hospitalizacion.fecha_alta,
        diagnostico_final=datos_alta['diagnostico_final'],
        tratamiento_post_alta=datos_alta.get('tratamiento', ''),
        recomendaciones=datos_alta.get('recomendaciones', ''),
        proxima_revision=datos_alta.get('proxima_revision')
    )
    
    return alta
```

**Validaciones**:
- RN-HOS-09: Solo hospitalizaciones 'activa' pueden darse de alta
- RN-HOS-10: Fecha de alta debe ser posterior a fecha de ingreso
- RN-HOS-11: Diagnóstico final obligatorio para alta

#### FASE 4: Generación de Cobro con Multiplicador de Días

**Entrada**: Hospitalización con alta médica

**Proceso**: Similar a consultas, pero con lógica adicional
1. Llamar a `crear_cobro_pendiente_desde_hospitalizacion()` en `caja/services.py`
2. Crear `Venta` con `tipo_origen='hospitalizacion'` y `estado='pendiente'`
3. **Calcular días de tratamiento automáticamente**: `dias = (fecha_alta - fecha_ingreso).days`, mínimo 1
4. Crear `DetalleVenta` por servicio base de hospitalización multiplicado por días
5. Crear `DetalleVenta` por cada cirugía realizada
6. Crear `DetalleVenta` por insumos utilizados **multiplicando cantidad × días**
7. Calcular totales
8. Registrar auditoría

**Ejemplo de multiplicador**:
```
Hospitalización de 5 días
Antibiótico: 2 ml/día
  → cantidad_base = 2 ml
  → cantidad_final = 2 ml × 5 días = 10 ml
  → envases = ⌈10 ml ÷ 5 ml/frasco⌉ = 2 frascos
```

**Código relevante**:
```python
# caja/services.py
@transaction.atomic
def crear_cobro_pendiente_desde_hospitalizacion(hospitalizacion, usuario):
    """Crea venta pendiente desde hospitalización con multiplicador de días"""
    # Calcular días de tratamiento
    if hospitalizacion.fecha_alta:
        delta = hospitalizacion.fecha_alta - hospitalizacion.fecha_ingreso
        dias_tratamiento = max(1, delta.days)
    else:
        dias_tratamiento = 1
    
    # Crear venta
    venta = Venta.objects.create(
        tipo_origen='hospitalizacion',
        hospitalizacion=hospitalizacion,
        paciente=hospitalizacion.paciente,
        estado='pendiente',
        usuario_creacion=usuario,
        observaciones=f"Hospitalización de {dias_tratamiento} día(s)"
    )
    
    # Agregar servicio base de hospitalización
    servicio_hosp = Servicio.objects.get(nombre__icontains='hospitalización')
    DetalleVenta.objects.create(
        venta=venta,
        tipo='servicio',
        servicio=servicio_hosp,
        descripcion=f"Hospitalización ({dias_tratamiento} día(s))",
        cantidad=dias_tratamiento,
        precio_unitario=servicio_hosp.precio
    )
    
    # Agregar cirugías
    for cirugia in hospitalizacion.cirugias.all():
        if cirugia.servicio:
            DetalleVenta.objects.create(
                venta=venta,
                tipo='servicio',
                servicio=cirugia.servicio,
                descripcion=f"Cirugía: {cirugia.tipo_cirugia}",
                cantidad=1,
                precio_unitario=cirugia.servicio.precio
            )
    
    # Agregar insumos con multiplicador de días
    for hosp_insumo in hospitalizacion.insumos_detalle.all():
        DetalleVenta.objects.create(
            venta=venta,
            tipo='insumo',
            insumo=hosp_insumo.insumo,
            descripcion=hosp_insumo.insumo.medicamento,
            cantidad=hosp_insumo.cantidad_final * dias_tratamiento,  # ← MULTIPLICADOR
            precio_unitario=hosp_insumo.insumo.precio_venta or Decimal('0'),
            peso_paciente=hosp_insumo.peso_paciente,
            dias_tratamiento=dias_tratamiento
        )
    
    venta.calcular_totales()
    return venta
```

**Validaciones**:
- RN-HOS-12: Hospitalización debe estar en alta para generar cobro
- RN-HOS-13: Días de tratamiento calculados automáticamente (mínimo 1)
- RN-HOS-14: Servicio base de hospitalización debe existir
- RN-HOS-15: Cantidad de insumos = cantidad_base × dias_tratamiento

#### FASE 5: Confirmación de Pago y Descuento de Stock

**Proceso**: Idéntico al de consultas, ejecutado en `caja/services.py`
1. Validar venta pendiente y sesión activa
2. Obtener detalles de insumos con `stock_descontado=False`
3. Validar stock suficiente considerando multiplicador de días
4. Descontar stock dentro de transacción atómica
5. Marcar venta como pagada
6. Registrar auditoría

**Diferencia con consultas**: 
- Cantidad de insumos es mayor debido al multiplicador de días de tratamiento
- Validación de stock debe considerar `cantidad_final × dias_tratamiento`

**Código relevante**:
```python
# El mismo procesar_pago() de consultas maneja hospitalizaciones
# La diferencia está en la cantidad de DetalleVenta que viene multiplicada

@transaction.atomic
def procesar_pago(venta, usuario, metodo_pago, sesion_caja):
    """Procesa pago tanto de consultas como hospitalizaciones"""
    # ... validaciones ...
    
    # Descontar stock (cantidad ya incluye multiplicador de días)
    for detalle in detalles_pendientes:
        if detalle.insumo.stock_actual < detalle.cantidad:
            raise ValidationError(
                f"Stock insuficiente para '{detalle.insumo.medicamento}'. "
                f"Requerido: {detalle.cantidad}, Disponible: {detalle.insumo.stock_actual}"
            )
        
        descontar_stock_insumo(detalle)
    
    # Marcar como pagada
    venta.estado = 'pagado'
    venta.save()
```

### 6.5 Particularidades de Hospitalización

**1. Multiplicador de días**: Los insumos se multiplican por días de tratamiento
   - Ejemplo: Antibiótico 1 ml/día × 5 días = 5 ml total
   - Cálculo automático: `fecha_alta - fecha_ingreso`

**2. Validación de duplicados**: `clean()` previene múltiples hospitalizaciones activas
   ```python
   def clean(self):
       if self.estado == 'activa':
           activas = Hospitalizacion.objects.filter(
               paciente=self.paciente,
               estado='activa'
           ).exclude(pk=self.pk)
           if activas.exists():
               raise ValidationError("Paciente ya tiene hospitalización activa")
   ```

**3. Cirugías como subentidades**: Una hospitalización puede tener múltiples cirugías
   - Cada cirugía tiene su propio servicio y medicamentos
   - Se facturan por separado

**4. Registros diarios**: Seguimiento de evolución día a día
   - Temperatura obligatoria
   - Medicamentos opcionales
   - No afectan facturación (solo seguimiento clínico)

**5. Cobro diferido**: El cobro se genera AL FINALIZAR la hospitalización
   - NO durante el ingreso
   - Permite acumular cirugías y tratamientos
   - Cálculo final considera todo el período

---

## 7. SISTEMA DE SESIÓN DE CAJA Y VENTAS

### 7.1 Conceptos Fundamentales

#### ¿Qué es una Sesión de Caja?

Una **sesión de caja** es una abstracción de período operativo que encapsula todas las operaciones de dinero dentro de un horario delimitado. Es el contenedor lógico que agrupa:

- **Apertura**: Momento en que un usuario inicia el período (generalmente al abrir el negocio)
- **Operación**: Ventas registradas y procesadas durante el período
- **Cierre**: Momento en que se finaliza el período y se audita el efectivo

```python
class SesionCaja(models.Model):
    """Sesión diaria de caja con apertura y cierre"""
    usuario_apertura = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    usuario_cierre = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True)
    
    fecha_apertura = models.DateTimeField(default=timezone.now)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    
    # Montos críticos para auditoría
    monto_inicial = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    monto_final_calculado = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    monto_final_contado = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    diferencia = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    
    esta_cerrada = models.BooleanField(default=False)
```

**Responsabilidades de SesionCaja**:
1. Ser el punto de validación OBLIGATORIO antes de cualquier pago
2. Registrar monto inicial (efectivo físico con el que se inicia)
3. Registrar monto final contado (efectivo físico al cerrar)
4. Calcular diferencia (para detectar robos, errores de registro, faltantes)
5. Agrupar todas las operaciones de dinero en un período auditable

#### ¿Qué es una Venta (Cobro)?

Una **venta** es un registro de transacción comercial que representa:
- Un servicio o producto entregado
- Un monto adeudado o pagado
- Una relación con el paciente (opcional para ventas libres)
- Un origen (consulta clínica, hospitalización, o venta libre)

```python
class Venta(models.Model):
    """Representa un cobro (puede ser pendiente o pagado)"""
    # Relación OBLIGATORIA con sesión
    sesion = models.ForeignKey(SesionCaja, on_delete=models.PROTECT, related_name='ventas', null=True)
    
    # Estados del ciclo de vida
    ESTADO_CHOICES = [
        ('pendiente', 'Cobro Pendiente'),       # Creada pero no pagada
        ('en_proceso', 'En Proceso'),           # Cargada en caja, esperando confirmación
        ('pagado', 'Pagado'),                   # Pago confirmado y stock descontado
        ('cancelado', 'Cancelado'),             # Anulada con reintegro de stock
    ]
    
    # Origen: indica dónde se originó esta venta
    TIPO_ORIGEN_CHOICES = [
        ('consulta', 'Consulta'),               # Generada automáticamente desde consulta clínica
        ('hospitalizacion', 'Hospitalización'), # Generada automáticamente desde hospitalización
        ('venta_libre', 'Venta Libre'),        # Creada manualmente en caja
    ]
    
    # Identificación
    numero_venta = models.CharField(max_length=20, unique=True)  # V20251219-0042
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    
    # Montos
    subtotal_servicios = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    subtotal_insumos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Pago
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES)
    fecha_pago = models.DateTimeField(null=True, blank=True)
```

### 7.2 ¿Por Qué es Necesaria una Sesión de Caja?

#### Problema 1: Auditoría de Efectivo

**Escenario sin sesiones**:
```
¿Cuánto dinero debería haber en caja al final del día?
¿Hay faltantes o sobras? ¿De cuánto?
¿Quién es responsable?
```

**Problema**: Es imposible saber si hay discrepancias entre lo registrado en el sistema y lo que hay físicamente.

**Solución con sesiones**:
```
Sesión de caja:
  - Apertura 08:00 AM: $1,000 inicial
  - Ventas pagadas durante el día: $5,430
  - Monto calculado: 1,000 + 5,430 = $6,430
  - Monto contado físicamente: $6,420
  - Diferencia: -$10 ← Hay un faltante de $10
  → Auditoría automática detecta inconsistencia
```

#### Problema 2: Prevenir Pagos sin Sesión

**Escenario peligroso sin validación**:
```
Cajero 1 abre la caja en la mañana
... varias horas de operación ...
Cajero 1 se va sin cerrar la sesión
Cajero 2 llega, no sabe si la caja está abierta
Cajero 2 crea una nueva "sesión informal"
... más operaciones ...
Nadie puede reportar cuánto dinero hay realmente
```

**Solución**: Validación obligatoria `procesar_pago()`:
```python
if not sesion_caja or sesion_caja.esta_cerrada:
    raise ValidationError("No hay sesión de caja abierta")
```

#### Problema 3: Impedir Operaciones Fuera de Horario

Sin sesiones de caja cerradas, el sistema podría permitir:
- Pagos a las 3 AM
- Ventas sin supervisión
- Cambios de efectivo sin registro

Con sesiones:
```python
if sesion_caja.esta_cerrada:
    raise ValidationError("La sesión de caja está cerrada")
```

### 7.3 Ciclo de Vida de una Sesión

#### FASE 1: Apertura

**Entrada**: Usuario (administrador/cajero) inicia sesión en la mañana

**Proceso**:
```python
@transaction.atomic
def abrir_sesion_caja(usuario, monto_inicial=0, observaciones=''):
    """Abre una nueva sesión de caja"""
    # Validación: No puede haber otra sesión abierta
    sesion_abierta = SesionCaja.objects.filter(esta_cerrada=False).first()
    if sesion_abierta:
        raise ValidationError(
            f"Ya existe una sesión abierta desde {sesion_abierta.fecha_apertura}"
        )
    
    # Crear sesión
    sesion = SesionCaja.objects.create(
        usuario_apertura=usuario,
        monto_inicial=monto_inicial,  # Efectivo físico inicial
        observaciones_apertura=observaciones
    )
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        sesion=sesion,
        accion='abrir_sesion',
        usuario=usuario,
        descripcion=f"Sesión abierta con monto inicial de ${monto_inicial}"
    )
    
    return sesion
```

**Validaciones**:
- RN-CAJ-01: Solo una sesión puede estar abierta a la vez
- RN-CAJ-02: `monto_inicial` debe ser >= 0
- RN-CAJ-03: Usuario responsable debe estar activo

**Resultado**: 
- `SesionCaja` creada con `esta_cerrada=False`
- `monto_inicial` registrado
- Sistema ahora acepta pagos

#### FASE 2: Operación (Ventas durante la Sesión)

**Durante el período abierto**:
1. Se crean `Venta` con referencia a `sesion`
2. Cada pago valida que `sesion_caja.esta_cerrada == False`
3. Se descuenta stock SOLO si sesión está abierta
4. Cada operación se registra en `AuditoriaCaja` para trazabilidad

**Ejemplo de venta**:
```python
venta = Venta.objects.create(
    sesion=sesion_activa,  # ← OBLIGATORIO
    tipo_origen='consulta',
    estado='pendiente',
    total=5000,
    usuario_creacion=request.user
)

# Al confirmar pago
procesar_pago(venta, usuario, metodo_pago, sesion_caja=sesion_activa)
# ↓
# Valida sesion_caja está abierta
# Descuenta stock
# Marca venta como 'pagado'
```

#### FASE 3: Cierre

**Entrada**: Usuario (administrador) finaliza la sesión

**Proceso** (operación crítica):
```python
@transaction.atomic
def cerrar_sesion_caja(sesion, usuario, monto_contado, observaciones=''):
    """Cierra una sesión de caja y calcula diferencias"""
    
    # Validación 1: No puede estar ya cerrada
    if sesion.esta_cerrada:
        raise ValidationError("Esta sesión ya está cerrada")
    
    # Validación 2: No puede haber ventas pendientes
    # (dinero que se debe pero no se cobró)
    ventas_pendientes = sesion.ventas.filter(estado='pendiente').count()
    if ventas_pendientes > 0:
        raise ValidationError(
            f"No se puede cerrar. Hay {ventas_pendientes} cobro(s) pendiente(s)"
        )
    
    # Validación 3: Calcular monto esperado
    efectivo_generado = sesion.calcular_total_efectivo()  # Solo dinero en efectivo
    monto_final_calculado = sesion.monto_inicial + efectivo_generado
    
    # Resultado de auditoría
    diferencia = monto_contado - monto_final_calculado
    
    # Guardar resultados
    sesion.fecha_cierre = timezone.now()
    sesion.usuario_cierre = usuario
    sesion.monto_final_calculado = monto_final_calculado
    sesion.monto_final_contado = monto_contado
    sesion.diferencia = diferencia
    sesion.esta_cerrada = True
    sesion.save()
    
    # Registrar auditoría
    AuditoriaCaja.objects.create(
        sesion=sesion,
        accion='cerrar_sesion',
        usuario=usuario,
        descripcion=f"Sesión cerrada. Diferencia: ${diferencia}",
        datos_nuevos={
            'monto_calculado': str(monto_final_calculado),
            'monto_contado': str(monto_contado),
            'diferencia': str(diferencia)
        }
    )
```

**Validaciones**:
- RN-CAJ-04: Sesión no puede estar ya cerrada
- RN-CAJ-05: No puede haber cobros pendientes
- RN-CAJ-06: Debe proporcionarse monto contado (efectivo real)

**Cálculo de diferencia**:
```
Diferencia = Monto Contado - Monto Calculado

Diferencia = 0   ✅ Perfecto - Sin faltantes ni sobras
Diferencia > 0   🤔 Sobra - Más dinero del esperado (raro)
Diferencia < 0   ⚠️  Faltante - Menos dinero del esperado (error o robo)
```

### 7.4 Asociación de Ventas con Sesiones

#### Relación Estructural

```
SesionCaja (1)
    ↓ (one-to-many)
    Venta (*)
        ↓ (one-to-many)
        DetalleVenta (*)
```

**Regla principal**: Una venta SIEMPRE debe estar asociada a una sesión

```python
sesion = models.ForeignKey(
    SesionCaja, 
    on_delete=models.PROTECT,  # ← No se puede borrar sesión con ventas
    related_name='ventas',
    null=True,  # Transitoriamente null durante creación
    blank=True
)
```

#### Flujo de Asociación

**Paso 1: Validar sesión existe**
```python
def procesar_venta(request):
    sesion_activa = obtener_sesion_activa()
    if not sesion_activa:
        return JsonResponse({
            'success': False,
            'error': 'No hay sesión de caja abierta'
        }, status=400)
```

**Paso 2: Crear venta ligada a sesión**
```python
venta = Venta.objects.create(
    sesion=sesion_activa,           # ← Asociación crítica
    tipo_origen='venta_libre',
    usuario_creacion=request.user,
    estado='pendiente'
)
```

**Paso 3: Confirmar pago con sesión validada**
```python
def procesar_pago(venta, usuario, metodo_pago, sesion_caja=None):
    # Validación: Sesión debe estar activa
    if not sesion_caja or sesion_caja.esta_cerrada:
        raise ValidationError("No hay sesión de caja abierta")
    
    # Descuento de stock ocurre SOLO si sesión está validada
    for detalle in venta.detalles.filter(tipo='insumo'):
        descontar_stock_insumo(detalle)
    
    # Marcar como pagada
    venta.estado = 'pagado'
    venta.save()
```

### 7.5 ¿Qué Sucede Si No Hay Sesión Activa?

#### Escenario 1: Intentar Confirmar Pago

```python
# Usuario intenta confirmar un pago en caja
procesar_pago(venta, usuario, 'efectivo', sesion_caja=None)

# Resultado:
# ❌ ValidationError: "No hay sesión de caja abierta"
# → Pago NO se confirma
# → Stock NO se descuenta
# → Usuario debe solicitar a admin que abra sesión
```

**Ventaja**: Impide descuentos de stock sin supervisión

#### Escenario 2: Crear Nueva Venta

```python
# Sistema intenta crear venta libre
venta = Venta.objects.create(
    sesion=None,  # ← Sin sesión
    usuario_creacion=user,
    estado='pendiente'
)

# Si luego intenta pagar:
# ❌ Error: sesion is null - Validación en procesar_pago()
# → Debe esperar a que abra una sesión
```

#### Escenario 3: Sesión Cerrada

```python
# Es de noche, sesión fue cerrada
if sesion_caja.esta_cerrada:
    raise ValidationError("La sesión de caja está cerrada")
    # ❌ Pago rechazado
    # → Imposible procesar transacciones fuera de horario
```

### 7.6 Validaciones Críticas del Sistema

#### Validación 1: Sesión Única Abierta

```python
def abrir_sesion_caja(usuario, monto_inicial=0):
    # Verificar que no haya otra sesión abierta
    sesion_abierta = SesionCaja.objects.filter(esta_cerrada=False).first()
    if sesion_abierta:
        raise ValidationError(
            f"Ya existe una sesión abierta desde {sesion_abierta.fecha_apertura}"
        )
```

**Problema que previene**: Múltiples "cajas" operando simultáneamente sin coordinación

#### Validación 2: Stock Solo con Sesión

```python
def procesar_pago(venta, usuario, metodo_pago, sesion_caja):
    if not sesion_caja or sesion_caja.esta_cerrada:
        raise ValidationError("No hay sesión de caja abierta")
    
    # Descuento ocurre AQUÍ, con sesión validada
    for detalle in venta.detalles.filter(tipo='insumo'):
        descontar_stock_insumo(detalle)
```

**Problema que previene**: Descuentos de stock sin registro en sesión

#### Validación 3: No Cerrar con Pendientes

```python
def cerrar_sesion_caja(sesion, usuario, monto_contado):
    ventas_pendientes = sesion.ventas.filter(estado='pendiente').count()
    if ventas_pendientes > 0:
        raise ValidationError(
            f"No se puede cerrar. Hay {ventas_pendientes} cobro(s) pendiente(s)"
        )
```

**Problema que previene**: Dinero "fantasma" (cobros que no se confirman)

#### Validación 4: Diferencia Calculada Automáticamente

```python
def cerrar_sesion_caja(sesion, usuario, monto_contado):
    # Calcular qué dinero debería haber
    monto_calculado = sesion.monto_inicial + sesion.calcular_total_efectivo()
    
    # Comparar con lo contado
    diferencia = monto_contado - monto_calculado
    
    # Guardar diferencia para auditoría
    sesion.diferencia = diferencia
    sesion.save()
    
    # Si diferencia != 0, es un problema a investigar
```

**Detección**: Sistema SIEMPRE calcula la diferencia, sin importar si coincide

### 7.7 Problemas que Previene este Diseño

#### Problema 1: Fraude de Efectivo

**Ataque sin sesiones**: Cajero recibe $1,000 pero registra $500
- No hay sesión que verifique
- Sistema no puede detectar inconsistencia

**Prevención con sesiones**:
```
Sesión abierta: $0 inicial
Venta pagada registrada en sistema: $500
Sesión cierra: Usuario cuenta $1,000 en efectivo real

Diferencia = $1,000 - $500 = +$500 ← Detectada inmediatamente
→ Auditoría señala discrepancia
→ Investigación enfocada
```

#### Problema 2: Doble Pago

**Ataque sin validación**: Procesador de pago procesa dos veces el mismo cobro

```python
# Sin sesión
venta.estado = 'pendiente'
procesar_pago(venta, ...)      # Primer pago ✅
procesar_pago(venta, ...)      # Segundo pago ✅ (BUG)
# Stock se descuenta DOS veces

# Con sesión
procesar_pago(venta, ...)      # Primer pago ✅
# venta.estado = 'pagado'

procesar_pago(venta, ...)      # Segundo intento
# ❌ ValidationError: "Esta venta ya fue pagada"
```

#### Problema 3: Operaciones Fuera de Horario

**Sin control**: Cualquier momento se puede crear y pagar cobros
```
3:00 AM - Venta pagada
5:30 AM - Otra venta pagada
... sin supervisión
```

**Con sesiones**: Solo durante horario comercial (sesión abierta)
```
sesion_caja.esta_cerrada == True → ❌ Pago rechazado
```

#### Problema 4: Faltantes de Inventario No Auditados

**Sin sesiones**: Stock se descuenta en múltiples puntos sin registro centralizado
- Consulta: descuenta stock
- Servicio: descuenta stock
- Caja: descuenta stock
- **Nadie sabe cuál es la verdad**

**Con sesiones**: Descuento SOLO en caja, bajo supervisión de sesión
```
Sesión registra:
  - Stock inicial: 100 unidades
  - Ventas con descuento: 15 unidades
  - Stock final debería ser: 85
  - Físico contado: 85 ✅

Si hubiera discrepancia:
  - Sistema = 85
  - Físico = 80
  - Diferencia = -5 unidades → Investigar dónde se perdieron
```

#### Problema 5: Auditoría Incompleta

**Sin sesiones**: ¿Cómo saber cuánto dinero procesó cada usuario?
```
Usuario A: ¿?
Usuario B: ¿?
Total general: ¿?
```

**Con sesiones**: Auditoría clara y completa
```
SesionCaja:
  - usuario_apertura: Andrea
  - usuario_cierre: Andrea
  - Período: 08:00 - 17:00
  - Ventas: 25 cobros
  - Total: $12,500
  - Diferencia: $0 ✅

Cada venta tiene trazabilidad:
  - Usuario que creó: Andrea
  - Usuario que cobró: Andrea
  - Hora exacta: 12:34:56
```

#### Problema 6: Descuentos Duplicados (Consulta y Caja)

**Código comentado evidencia solución anterior fallida**:
```python
# clinica/views.py - CÓDIGO COMENTADO
def descontar_insumos_consulta(consulta):
    """
    ⚠️ DESCUENTO DE STOCK CENTRALIZADO EN CAJA
    
    # CÓDIGO COMENTADO - Descuento ANTES ocurría aquí
    # insumo.stock_actual -= 1
    # 
    # PROBLEMA: Si consulta se editaba, ¡se descontaba DOS veces!
    # PROBLEMA: Descuento sin pago confirmado
    """
```

**Solución**: Descuento ÚNICO, centralizado en sesión de caja
- Consulta: solo crea registro
- Caja: solo confirma y descuenta
- Sesión: valida que todo sea consistente

### 7.8 Flujo de Pago Completo Validado por Sesión

```
┌─────────────────────────────────────────────────────────────┐
│ 1. APERTURA DE SESIÓN (08:00 AM)                           │
│    admin_user → SesionCaja.objects.create(monto_inicial=1000)
│    sesion.esta_cerrada = False ✅                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. VENTA CREADA (10:34 AM)                                  │
│    Consulta → crear_cobro_pendiente_desde_consulta()       │
│    Venta.objects.create(sesion=sesion, estado='pendiente') │
│    venta.total = $5,000                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CONFIRMACIÓN DE PAGO (10:35 AM)                          │
│    Cajero selecciona: Confirmar Pago                        │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Validación: ¿Sesión activa?                         │  │
│    │ if not sesion_caja or sesion.esta_cerrada:         │  │
│    │     ❌ ERROR - Pago rechazado                       │  │
│    │ else: ✅ Continuar                                  │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Validación: ¿Hay detalles?                          │  │
│    │ ✅ 2 insumos, 1 servicio                            │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Descuento de Stock (dentro de transacción atómica)  │  │
│    │ for detalle in venta.detalles.filter(tipo='insumo'):
│    │   if detalle.insumo.stock_actual < cantidad:       │  │
│    │       ❌ ERROR - Stock insuficiente                 │  │
│    │   else:                                             │  │
│    │       detalle.insumo.stock_actual -= cantidad      │  │
│    │       ✅ Stock descontado                           │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Marcar como Pagada                                  │  │
│    │ venta.estado = 'pagado'                             │  │
│    │ venta.metodo_pago = 'efectivo'                      │  │
│    │ venta.fecha_pago = now()                            │  │
│    │ ✅ Venta pagada                                     │  │
│    └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SESIÓN CONTINÚA (10:36 AM - 17:00 PM)                    │
│    Más ventas, más pagos... todas bajo misma sesión        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CIERRE DE SESIÓN (17:30 PM)                              │
│    admin_user → cerrar_sesion_caja(sesion, monto_contado)  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Validación: ¿Hay cobros pendientes?                │  │
│    │ ventas_pendientes = sesion.ventas.filter(          │  │
│    │     estado='pendiente'                              │  │
│    │ )                                                    │  │
│    │ if ventas_pendientes > 0:                           │  │
│    │     ❌ ERROR - Hay dinero sin cobrar               │  │
│    │ else: ✅ Continuar                                  │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Cálculo Automático                                  │  │
│    │ monto_inicial = $1,000                              │  │
│    │ total_efectivo = $25 * 5 = $12,500 (si hay pago    │  │
│    │                   mixto, se cuenta solo efectivo)   │  │
│    │ monto_calculado = 1,000 + 12,500 = $13,500         │  │
│    │ monto_contado = $13,500 (conteo físico)            │  │
│    │ diferencia = $13,500 - $13,500 = $0 ✅             │  │
│    │                                                     │  │
│    │ Si diferencia != 0:                                │  │
│    │   - Sistema detecta y registra                      │  │
│    │   - Auditoría automática                            │  │
│    │   - Se genera reporte de investigación              │  │
│    └─────────────────────────────────────────────────────┘  │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Marcar Sesión Cerrada                               │  │
│    │ sesion.esta_cerrada = True                          │  │
│    │ sesion.usuario_cierre = admin_user                  │  │
│    │ ✅ Sesión cerrada                                   │  │
│    └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. ACEPTACIÓN DE NUEVO DÍA (18:00 PM SIGUIENTE)             │
│    Sistema permite abrir nueva sesión SOLO si anterior      │
│    está cerrada                                             │
│    ✅ Nueva sesión abierta                                  │
└─────────────────────────────────────────────────────────────┘
```

### 7.9 Relación con Descuento de Stock Centralizado

La sesión de caja es el **gatillo** para el descuento de stock:

```python
# REGLA CRÍTICA: Stock SOLO se descuenta en procesar_pago()
# y procesar_pago() REQUIERE sesión activa

@transaction.atomic
def procesar_pago(venta, usuario, metodo_pago, sesion_caja):
    # PASO 1: Validar sesión
    if not sesion_caja or sesion_caja.esta_cerrada:
        raise ValidationError("No hay sesión de caja abierta")
        # ❌ Si falla aquí, NO se descuenta stock
    
    # PASO 2: Descontar stock (solo si sesión validada)
    for detalle in venta.detalles.filter(tipo='insumo'):
        descontar_stock_insumo(detalle)
    
    # PASO 3: Confirmar pago (solo si stock se descontó)
    venta.estado = 'pagado'
    venta.save()
```

**Garantía arquitectónica**:
```
NO SESIÓN ABIERTA → NO DESCUENTO DE STOCK
NO DESCUENTO DE STOCK → NO PAGO CONFIRMADO
NO PAGO CONFIRMADO → DINERO NO ABANDONA AL PACIENTE

Si algo falla en la transacción atómica:
  → ROLLBACK completo
  → Stock vuelve a original
  → Venta sigue como 'pendiente'
  → Dinero NO se registra en sesión
```

---

## 8. COMUNICACIÓN ENTRE FRONTEND Y BACKEND

### 8.1 Arquitectura Híbrida: Renderizado + APIs

El sistema implementa una **arquitectura híbrida** que combina dos paradigmas:

#### Paradigma 1: Renderizado Servidor (Initial Load)

**Cuándo se usa**:
- Carga inicial de páginas
- Búsquedas indexadas por buscadores
- Contenido estático que requiere SEO

**Proceso**:
1. Usuario solicita URL: `GET /caja/caja-register/`
2. Django renderiza template HTML completo en servidor
3. Respuesta incluye: HTML, CSS, JavaScript
4. Navegador renderiza página lista para usar

**Ventajas**:
- ✅ Inicial rápido (todo en una respuesta)
- ✅ SEO amigable
- ✅ Funciona sin JavaScript (fallback)

**Desventajas**:
- ❌ Recarga completa (slower)
- ❌ Cambio de estado requiere full page refresh

**Implementación técnica**:
```
Servidor → Django Template Engine → Genera HTML → Envía al navegador
                                         ↓
                                  Incluye </script> tags
                                         ↓
                                  JavaScript se ejecuta
                                         ↓
                                  Enhance AJAX endpoints
```

#### Paradigma 2: APIs JSON (Operaciones)

**Cuándo se usa**:
- Operaciones frecuentes (crear, editar, eliminar)
- Actualizaciones sin recargar página
- Validaciones en tiempo real
- Interactividad fluida

**Proceso**:
1. Usuario realiza acción (click, submit)
2. JavaScript prepara JSON con datos
3. Fetch API envía POST/PUT a endpoint
4. Backend procesa y retorna JSON
5. JavaScript actualiza DOM sin recarga

**Ventajas**:
- ✅ Instantáneo (JSON es pequeño)
- ✅ Interactividad fluida
- ✅ Mejor UX (sin parpadeos)

**Desventajas**:
- ❌ Requiere JavaScript
- ❌ Más complejo de implementar

**Implementación técnica**:
```
User Action → JavaScript Event Handler → Fetch API → JSON Request
                                                         ↓
                                                   Django View
                                                   Processes
                                                        ↓
                                              JSON Response
                                                        ↓
                                            JavaScript Updates DOM
```

### 8.2 Decisiones de Diseño: Cuándo Usar Cada Paradigma

#### Carga Inicial de Página

**Renderizado servidor** ✅
```
GET /caja/caja-register/ 
  → Django renderiza caja/templates/caja_register.html
  → Incluye bloques de insumos, pacientes, servicios
  → Envía HTML + CSS + JavaScript
  → Usuario ve caja lista para usar
```

**Razón**: Primer acceso debe ser rápido. HTML preconstruido es más rápido que JavaScript vacío + API calls.

#### Búsquedas en Tiempo Real

**API JSON** ✅
```
Usuario tipea en buscador: "antibiótico"
  → JavaScript captura evento input
  → Cada keystroke: fetch("/inventario/search-insumo/?q=antibiótico")
  → Backend busca en BD
  → Retorna JSON con resultados
  → JavaScript renderiza dropdown dinámicamente
```

**Razón**: Interactividad instantánea. La API es más rápida que recargar página entera.

#### Confirmación de Pago

**API JSON** ✅
```
Cajero click en "Confirmar Pago"
  → JavaScript recolecta datos de venta
  → Fetch POST /caja/procesar-pago/
  → Backend:
    - Valida sesión
    - Descuenta stock
    - Marca como pagado
  → Retorna {success: true, venta_id: 42}
  → JavaScript muestra modal "Pago exitoso"
  → Sin recargar página
```

**Razón**: Operación crítica requiere feedback inmediato. Recargar página sería lenta y confusa.

#### Generación de Reporte PDF

**Renderizado servidor** ✅
```
Usuario solicita reporte: GET /reportes/caja-diaria/
  → Django crea objeto PDF en servidor
  → Retorna PDF como respuesta
  → Navegador descarga/muestra PDF
```

**Razón**: PDF es documento complejo. Generarlo servidor-side es más confiable.

### 8.3 Flujo Detallado: Confirmación de Pago

#### Paso 1: Preparación de Datos (Frontend)

**Evento**: Usuario hace click en botón "Confirmar Pago"

```
DOM: <button id="btn-confirmar-pago" data-venta-id="42">Confirmar</button>

JavaScript:
  documento.getElementById('btn-confirmar-pago').addEventListener('click', function(e) {
    e.preventDefault()
    
    const venta_id = this.getAttribute('data-venta-id')
    const metodo_pago = document.getElementById('metodo-pago').value
    
    // Preparar payload JSON
    const datos = {
      venta_id: venta_id,
      metodo_pago: metodo_pago
    }
    
    console.log('📤 Enviando pago:', datos)
    
    // Paso 2: Envío a backend
    enviar_pago(datos)
  })
```

**Datos preparados**:
- `venta_id`: Identificador de venta a pagar
- `metodo_pago`: 'efectivo', 'tarjeta', 'cheque'

#### Paso 2: Envío de Request (Frontend)

**Método**: Fetch API con headers CSRF

```javascript
async function enviar_pago(datos) {
  // Obtener token CSRF del cookie
  const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value
  
  try {
    const respuesta = await fetch('/caja/procesar-pago/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken  // ← Token de seguridad
      },
      body: JSON.stringify(datos)
    })
    
    // Paso 3: Procesar respuesta
    manejar_respuesta(respuesta)
    
  } catch (error) {
    console.error('❌ Error en request:', error)
    mostrar_error('Error de conexión')
  }
}
```

**Headers HTTP**:
- `Content-Type: application/json` → Le dice a servidor que va JSON
- `X-CSRFToken` → Token de seguridad contra CSRF attacks
- Método `POST` → Modifica datos en servidor

#### Paso 3: Procesamiento en Backend (Django)

**Ubicación**: `caja/views.py` → `procesar_pago()`

```python
@csrf_exempt  # Permitir requests sin formulario HTML
@require_http_methods(['POST'])  # Solo POST
@login_required  # Usuario debe estar autenticado
def procesar_pago(request):
    try:
        # Paso 3a: Parsear JSON enviado
        datos = json.loads(request.body)
        venta_id = datos.get('venta_id')
        metodo_pago = datos.get('metodo_pago')
        
        # Paso 3b: Obtener venta
        venta = Venta.objects.get(pk=venta_id)
        
        # Paso 3c: Validar sesión activa
        sesion_caja = SesionCaja.objects.filter(esta_cerrada=False).first()
        if not sesion_caja:
            return JsonResponse({
                'success': False,
                'error': 'No hay sesión de caja abierta'
            }, status=400)
        
        # Paso 3d: Dentro de transacción atómica
        with transaction.atomic():
            # Descontar stock
            for detalle in venta.detalles.filter(tipo='insumo'):
                descontar_stock_insumo(detalle)
            
            # Marcar como pagada
            venta.estado = 'pagado'
            venta.metodo_pago = metodo_pago
            venta.fecha_pago = timezone.now()
            venta.sesion_caja = sesion_caja
            venta.save()
        
        # Paso 3e: Retornar éxito
        return JsonResponse({
            'success': True,
            'venta_id': venta.id,
            'total': str(venta.total),
            'mensaje': 'Pago confirmado exitosamente'
        })
        
    except Venta.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Venta no encontrada'
        }, status=404)
    
    except ValidationError as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error interno: {str(e)}'
        }, status=500)
```

**Lógica backend**:
1. Parsear JSON
2. Validar datos
3. Obtener objetos de BD
4. Validar sesión
5. Descuento atómico
6. Retornar JSON con resultado

#### Paso 4: Manejo de Respuesta (Frontend)

**Proceso**:
```javascript
async function manejar_respuesta(respuesta) {
  const status = respuesta.status
  const data = await respuesta.json()
  
  if (respuesta.ok) {
    // HTTP 200 ✅
    if (data.success) {
      // Backend confirmó éxito
      console.log('✅ Pago confirmado:', data)
      mostrar_modal_exito(data.mensaje)
      actualizar_interfaz(data)
      
      setTimeout(() => {
        recargar_listado_ventas()
      }, 2000)
    }
  } else {
    // HTTP 400, 404, 500, etc. ❌
    console.error('❌ Error backend:', data.error)
    mostrar_error(data.error)
  }
}
```

**Acciones basadas en respuesta**:
- ✅ `success: true` → Modal de éxito, actualizar UI, recargar lista
- ❌ `success: false` → Mostrar error específico, mantener datos

#### Paso 5: Actualización de Interfaz (Frontend)

**Sin recarga de página**:
```javascript
function actualizar_interfaz(data) {
  // Actualizar elemento visual
  document.getElementById(`venta-${data.venta_id}`).classList.add('pagado')
  document.getElementById(`venta-${data.venta_id}`).innerHTML = `
    <span class="badge badge-success">Pagado</span>
    Total: $${data.total}
  `
  
  // Actualizar total de sesión
  fetch('/caja/obtener-total-sesion/')
    .then(r => r.json())
    .then(data => {
      document.getElementById('total-sesion').innerText = `$${data.total}`
    })
}
```

**Resultado**: Usuario ve cambios INSTANTÁNEOS sin recargar página.

### 8.4 Formatos de Intercambio de Datos

#### Request (Frontend → Backend)

**JSON típico para pago**:
```json
{
  "venta_id": 42,
  "metodo_pago": "efectivo"
}
```

**JSON típico para crear venta libre**:
```json
{
  "paciente_id": 7,
  "detalles": [
    {
      "tipo": "servicio",
      "servicio_id": 3,
      "cantidad": 1
    },
    {
      "tipo": "insumo",
      "insumo_id": 15,
      "cantidad": 2
    }
  ]
}
```

**Headers requeridos**:
- `Content-Type: application/json`
- `X-CSRFToken: [token_del_servidor]`

#### Response (Backend → Frontend)

**Response exitoso (HTTP 200)**:
```json
{
  "success": true,
  "venta_id": 42,
  "total": "5000.00",
  "mensaje": "Pago confirmado exitosamente",
  "data": {
    "estado": "pagado",
    "fecha_pago": "2025-01-19T12:34:56.123456+00:00"
  }
}
```

**Response con error (HTTP 400/404/500)**:
```json
{
  "success": false,
  "error": "Stock insuficiente para Antibiótico XYZ"
}
```

**Estructura consistente**:
- `success: boolean` → Indica éxito o fallo
- `error: string` → Mensaje de error (si falla)
- `data: object` → Datos adicionales (si éxito)

### 8.5 Manejo de Errores en Capas

#### Nivel 1: Error de Red

**Escenario**: Conexión perdida entre frontend y backend

```javascript
fetch('/caja/procesar-pago/', {...})
  .catch(error => {
    // ❌ Error de red (no alcanzó servidor)
    console.error('Error de conexión:', error)
    mostrar_error('No hay conexión con el servidor')
  })
```

**Síntoma**: Usuario ve "Error de conexión"

#### Nivel 2: Error HTTP

**Escenario**: Servidor retorna status 404 o 500

```javascript
const respuesta = await fetch(...)
if (!respuesta.ok) {
  // ❌ HTTP error (404, 500, etc.)
  if (respuesta.status === 404) {
    mostrar_error('Venta no encontrada')
  } else if (respuesta.status === 500) {
    mostrar_error('Error del servidor. Intenta más tarde.')
  }
}
```

**Síntoma**: Usuario ve error genérico del servidor

#### Nivel 3: Error de Validación

**Escenario**: Backend validó datos pero hay problema

```python
# Backend
if not sesion_caja:
    return JsonResponse({
        'success': False,
        'error': 'No hay sesión de caja abierta'
    }, status=400)

# Frontend
const data = await respuesta.json()
if (!data.success) {
  // ❌ Error de lógica de negocio
  mostrar_error(data.error)  // "No hay sesión de caja abierta"
}
```

**Síntoma**: Usuario ve error específico

#### Nivel 4: Error de Stock

**Escenario**: Descuento falla por stock insuficiente

```python
# Backend: descontar_stock_insumo()
if insumo.stock_actual < cantidad:
    raise ValidationError(f"Stock insuficiente para {insumo.medicamento}")

# Capturado en procesar_pago()
except ValidationError as e:
    return JsonResponse({
        'success': False,
        'error': str(e)  # "Stock insuficiente para Antibiótico XYZ"
    }, status=400)

# Frontend
mostrar_error(data.error)
```

**Síntoma**: Usuario ve error específico de stock

#### Nivel 5: Error de Transacción

**Escenario**: Descuento de stock falla, transaction.atomic hace rollback

```python
@transaction.atomic
def procesar_pago(...):
    # Si algún paso falla:
    try:
        descontar_stock_insumo(detalle)  # ❌ Error aquí
        venta.estado = 'pagado'  # ← No se ejecuta (rollback)
        venta.save()  # ← No se ejecuta (rollback)
    except:
        # TODO se revierte automáticamente
        # Venta sigue como 'pendiente'
        # Stock no se modificó
        # Transacción fallida completamente
```

**Síntoma**: Usuario ve "Stock insuficiente", venta NO se pagó, BD está consistente

### 8.6 Códigos HTTP Utilizados

| Código | Significado | Escenario |
|--------|------------|----------|
| `200` | OK | Pago confirmado exitosamente |
| `400` | Bad Request | Venta no existe, stock insuficiente |
| `401` | Unauthorized | Usuario no autenticado (raro, @login_required maneja) |
| `403` | Forbidden | Permisos insuficientes (user.rol no válido) |
| `404` | Not Found | Recurso no existe (venta ID inválido) |
| `405` | Method Not Allowed | GET a endpoint que espera POST |
| `500` | Server Error | Excepción no capturada en backend |
| `503` | Service Unavailable | Servidor caído o BD no responde |

**Ejemplo en frontend**:
```javascript
if (respuesta.status === 401) {
  // Redireccionar a login
  window.location.href = '/login/'
} else if (respuesta.status === 403) {
  mostrar_error('No tienes permiso para esta acción')
} else if (respuesta.status === 500) {
  mostrar_error('Error del servidor. Contacta a administrador')
}
```

### 8.7 Por Qué Esta Arquitectura Híbrida Funciona

#### Ventaja 1: Rendimiento

- **Carga inicial**: HTML preconstruido es MÁS RÁPIDO que JSON + React rendering
- **Operaciones**: APIs JSON son MÁS RÁPIDO que full page refresh
- **Resultado**: Mejor UX en ambos casos

#### Ventaja 2: Compatibilidad

- **SEO**: Renderizado servidor permite indexación
- **Navegadores viejos**: Funciona sin JavaScript (graceful degradation)
- **Dispositivos lentos**: Pueden acceder aunque JS sea lento

#### Ventaja 3: Seguridad

- **Autenticación**: @login_required en vistas renderizadas y AJAX
- **CSRF**: Tokens protegen requests JSON
- **Validación**: Backend SIEMPRE valida (nunca confiar en cliente)

#### Ventaja 4: Mantenibilidad

- **Separación de concerns**: Django gestiona datos, JavaScript gestiona UI
- **Reutilización**: Mismo endpoint de API puede servir múltiples clientes
- **Testeo**: Backend fácil de testear sin UI

### 8.8 Patrones de Comunicación

#### Patrón 1: CRUD Sincrónico

**Crear, Leer, Actualizar, Eliminar con respuesta inmediata**

```
Frontend                          Backend
   │                                │
   ├─ POST /api/venta/create ────→ │ Crea venta
   │                                │ Validations
   │← {success, venta_id} ───────── │
   │                                │
```

#### Patrón 2: Búsqueda Progresiva

**Usuario tipea, resultados en tiempo real**

```
Frontend                          Backend
   │                                │
   ├─ GET /search?q=antibio ───→ │ Búsqueda ILIKE
   │                                │
   │← {resultados: [...]} ───────── │
   │                                │
```

#### Patrón 3: Validación en Tiempo Real

**Verificar disponibilidad mientras usuario escribe**

```
Frontend                          Backend
   │                                │
   ├─ POST /validate/stock ───→ │ Verifica stock
   │                                │
   │← {disponible: true} ───────── │
   │                                │
```

#### Patrón 4: Operación Atómica

**Múltiples cambios en una sola transacción**

```
Frontend                          Backend
   │                                │
   ├─ POST /procesar-pago ───→ │ @transaction.atomic
   │                                │  - Descuenta stock
   │                                │  - Marca como pagado
   │                                │  - Registra en sesión
   │← {success, data} ────────────── │ TODO o NADA
   │                                │
```

### 8.9 Medidas de Seguridad

#### Token CSRF

**Problema que previene**: Ataques cross-site request forgery

```javascript
// Frontend SIEMPRE incluye token
const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value
fetch('/api/...', {
  headers: {
    'X-CSRFToken': csrftoken  // ← Validado por servidor
  }
})
```

**Backend valida**:
```python
@csrf_protect  # O middlewre CSRF automático
def procesar_pago(request):
    # Django valida token antes de ejecutar
```

#### Autenticación Obligatoria

```python
@login_required  # Redirige a /login/ si no autenticado
def procesar_pago(request):
    usuario = request.user  # ← Siempre valido
```

#### Validación Backend SIEMPRE

```python
# NUNCA confiar en frontend
metodo_pago = request.POST.get('metodo_pago')  # Viene del cliente

# SIEMPRE validar en backend
METODOS_VALIDOS = ['efectivo', 'tarjeta', 'cheque']
if metodo_pago not in METODOS_VALIDOS:
    return JsonResponse({'error': 'Método inválido'}, status=400)
```

#### Logging y Auditoría

```python
# Backend registra TODA operación
AuditoriaCaja.objects.create(
    usuario=request.user,
    accion='procesar_pago',
    venta=venta,
    ip_cliente=request.META.get('REMOTE_ADDR'),
    detalles={
        'metodo_pago': metodo_pago,
        'total': venta.total,
        'timestamp': timezone.now().isoformat()
    }
)
```

**Resultado**: 
- ✅ Todo pago auditable
- ✅ Trazabilidad completa
- ✅ Detección de actividades sospechosas

---

## SÍNTESIS FINAL DE TODOS LOS FLUJOS

### Principios Arquitectónicos Transversales

**1. Validación en Múltiples Niveles**
- **Vista**: Valida datos de entrada y reglas de negocio de alto nivel
- **Modelo**: Valida integridad de datos individuales (clean(), save())
- **Base de Datos**: Constraints finales (UNIQUE, FOREIGN KEY, CHECK)

**2. Transaccionalidad Explícita**
- Operaciones críticas (pago + descuento stock) usan `@transaction.atomic`
- Garantiza consistencia: TODO o NADA
- Ejemplo: Si descuento de stock falla, pago NO se confirma

**3. Trazabilidad Automática**
- **Signals** registran cambios sin código repetitivo
- **Middleware** captura usuario sin acoplamiento
- **Historial** append-only inmutable

**4. Soft Delete Preferido**
- Entidades transaccionales (Paciente, Insumo, Servicio) usan flags booleanos
- Hard delete solo cuando sin referencias o errores de entrada

**5. Normalización de Datos**
- RUT, teléfonos, emails normalizados antes de almacenar
- Previene duplicados por diferencias de formato

**6. Separación de Responsabilidades**
- **Vista**: Coordinación y preparación de datos
- **Servicio**: Lógica de negocio compleja
- **Modelo**: Validaciones de dominio
- **Signal**: Efectos secundarios (historial, notificaciones)

**7. Descuento de Stock Centralizado (Decisión Arquitectónica Clave)**
- TODO el descuento de stock ocurre en `caja/services.py`
- NUNCA en módulos clínicos (`clinica/`, `servicios/`)
- Previene descuentos duplicados
- Garantiza descuento SOLO con pago confirmado
- Facilita auditoría y reversiones

### Flujos Documentados

1. **Registro y Autenticación**: RUT normalizado → búsqueda progresiva → verificación → sesión
2. **Gestión de Pacientes**: Validación propietario duplicado → creación propietario → creación paciente → historial automático
3. **Gestión de Inventario**: Permisos → creación con detección automática de tipo → descuento crítico SOLO en caja
4. **Gestión de Servicios**: Creación con insumos referenciales → edición con detección de cambios → eliminación híbrida
5. **Atención Clínica**: Consulta con signos vitales → cálculo automático de insumos → cobro pendiente → pago con descuento centralizado
6. **Hospitalización**: Ingreso con validación de duplicados → registros diarios → cirugías → alta → cobro con multiplicador de días
7. **Sesión de Caja y Ventas**: Apertura → operaciones validadas → descuento de stock gated → cierre con auditoría automática

### Problemas Arquitectónicos Prevenidos

1. **Descuentos Duplicados**: Centralización en caja elimina descuentos múltiples
2. **Fraude de Efectivo**: Sesión obliga auditoría de diferencias
3. **Operaciones Fuera de Horario**: Sesión cerrada rechaza pagos
4. **Doble Pago**: Estado de venta previene re-procesamiento
5. **Stock Negativo**: Validación ANTES de descontar + transacciones atómicas
6. **Faltantes No Auditados**: Toda salida de stock registrada en RegistroHistorico
7. **Dinero Fantasma**: Cobros pendientes impiden cierre de sesión

### Garantías del Sistema

- ✅ **Consistencia**: Transacciones ACID → TODO o NADA
- ✅ **Trazabilidad**: Historial inmutable de todas las operaciones
- ✅ **Auditoría**: Diferencias calculadas automáticamente
- ✅ **Integridad**: Validaciones en múltiples niveles
- ✅ **Recuperación**: Rollbacks automáticos ante fallos
- ✅ **Separación**: Responsabilidades claras entre módulos
- ✅ **Normalización**: Datos consistentes antes de procesar
- ✅ **Control**: Sesiones como puntos de control críticos

Estos flujos demuestran un sistema técnicamente robusto con validaciones exhaustivas, trazabilidad completa, garantías de consistencia mediante transacciones ACID, y decisiones arquitectónicas que previenen errores comunes en sistemas de inventario y gestión financiera.