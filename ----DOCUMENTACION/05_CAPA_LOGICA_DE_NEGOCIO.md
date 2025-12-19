# 05. CAPA DE LÓGICA DE NEGOCIO (Services)

## 1. INTRODUCCIÓN

### ¿Qué es la Capa de Services?

La **capa de lógica de negocio** (business logic layer) es una abstracción arquitectónica que encapsula todas las operaciones complejas que involucran reglas de negocio, validaciones críticas y orquestación de múltiples modelos.

**Definición formal**:
> La capa de services es el conjunto de funciones que implementan las reglas de negocio del dominio, independientemente de cómo se accedan (API, UI, CLI, etc.), permitiendo reutilización de lógica y garantías de consistencia.

### Ubicación en la Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Templates HTML + JavaScript)                      │
│ Responsabilidad: Presentación e interactividad              │
└─────────────────────────────────────┬───────────────────────┘
                                      │
                                      ↓
┌─────────────────────────────────────────────────────────────┐
│ VISTAS (views.py)                                           │
│ Responsabilidad: Coordinación HTTP + parseo de entrada      │
└─────────────────────────────────────┬───────────────────────┘
                                      │
                                      ↓
┌─────────────────────────────────────────────────────────────┐
│ SERVICES (services.py) ← CAPA DE NEGOCIO                   │
│ Responsabilidad: Lógica compleja, validaciones, orquestación
└─────────────────────────────────────┬───────────────────────┘
                                      │
                                      ↓
┌─────────────────────────────────────────────────────────────┐
│ MODELOS (models.py)                                         │
│ Responsabilidad: Estructura de datos + validaciones básicas │
└─────────────────────────────────────┬───────────────────────┘
                                      │
                                      ↓
┌─────────────────────────────────────────────────────────────┐
│ BASE DE DATOS (PostgreSQL)                                  │
│ Responsabilidad: Persistencia + integridad ACID             │
└─────────────────────────────────────────────────────────────┘
```

**Stack en VetSantaSofia**:
- Frontend → UI interactiva (HTML templates + AJAX)
- Views → Maneja peticiones HTTP
- **Services → Implementa reglas de negocio complejas** ← AQUÍ
- Models → Define estructuras y validaciones básicas
- BD → PostgreSQL con constraints

---

## 2. POR QUÉ EXISTE ESTA CAPA

### Problema 1: Lógica Dispersa en Vistas

#### ❌ Sin Services (Anti-patrón)

```python
# Directamente en views.py
def procesar_pago(request):
    venta = Venta.objects.get(pk=venta_id)
    
    # Validación 1: Sesión
    sesion = SesionCaja.objects.filter(esta_cerrada=False).first()
    if not sesion:
        return JsonResponse({'error': 'Sin sesión'})
    
    # Validación 2: Stock suficiente
    for detalle in venta.detalles.filter(tipo='insumo'):
        if detalle.insumo.stock_actual < detalle.cantidad:
            return JsonResponse({'error': 'Stock insuficiente'})
    
    # Descontar stock
    for detalle in venta.detalles.filter(tipo='insumo'):
        detalle.insumo.stock_actual -= detalle.cantidad
        detalle.insumo.save()
    
    # Marcar pago
    venta.estado = 'pagado'
    venta.save()
    
    # Auditoría
    AuditoriaCaja.objects.create(...)
    
    return JsonResponse({'success': True})

# ¿Qué pasa si otro endpoint también necesita pagar?
def procesar_pago_endpoint_2(request):
    # ¿Copiar todo el código? ← 300+ líneas duplicadas
    # ¿Qué pasa si hay un bug en la auditoría?
    # ¿Hay que arreglarlo en 3 lugares diferentes?
```

**Problemas**:
- ❌ Código duplicado en múltiples vistas
- ❌ Bug en un lugar = bug en todos lados
- ❌ Difícil testear
- ❌ Lógica mezclada con coordinación HTTP
- ❌ Cambios de regla de negocio requieren cambiar varias vistas

#### ✅ Con Services (Patrón correcto)

```python
# services.py
def procesar_pago(venta, usuario, metodo_pago, sesion_caja):
    """Encapsula TODA la lógica de pago"""
    # Validaciones, descuentos, auditoría, TODO aquí
    
# views.py
def procesar_pago_endpoint_1(request):
    venta = Venta.objects.get(pk=venta_id)
    sesion = obtener_sesion_activa()
    procesar_pago(venta, request.user, metodo_pago, sesion)
    return JsonResponse({'success': True})

def procesar_pago_endpoint_2(request):
    # Mismo endpoint pero diferente flujo
    venta = Venta.objects.get(pk=venta_id)
    sesion = obtener_sesion_activa()
    procesar_pago(venta, request.user, metodo_pago, sesion)  # ← REUTILIZA
    return JsonResponse({'success': True})
```

**Ventajas**:
- ✅ Código en UN SOLO LUGAR
- ✅ Bug se arregla una vez
- ✅ Fácil testear (no depende de HTTP)
- ✅ Lógica separada de coordinación HTTP
- ✅ Cambios de regla = cambio en un lugar

### Problema 2: Orquestación de Múltiples Entidades

#### Escenario: Confirmación de Pago

Una simple acción "Confirmar Pago" requiere:

```
Venta (cambiar estado)
  ↓
Detalles de Venta (iterar)
  ↓
Insumos (descontar stock, actualizar timestamp)
  ↓
SesionCaja (validar activa)
  ↓
AuditoriaCaja (registrar)
  ↓
RegistroHistorico (registrar cambios)
  ↓
¿Notificaciones? (alertas de stock bajo)
  ↓
¿Reportes? (actualizar dashboards)
```

**Si cada vista hace esto**:
- Vista A: Descuenta stock, olvida auditoría
- Vista B: Audita, olvida validar sesión
- Vista C: Valida sesión, pero no descuenta correctamente

**Con services**:
```
procesar_pago() = Orquesta TODO automáticamente
```

### Problema 3: Validaciones Críticas Inconsistentes

#### ❌ Sin Services

```python
# vista_1.py
def crear_venta_clinica(request):
    venta = Venta.objects.create(...)
    # ¿Validar sesión?
    # ... algunos olvidan

# vista_2.py
def crear_venta_libre(request):
    venta = Venta.objects.create(...)
    # ¿Validar sesión?
    # ... algunos olvidan

# vista_3.py
def crear_venta_hospitalizacion(request):
    venta = Venta.objects.create(...)
    # ¿Validar sesión?
    # ... algunos olvidan

Resultado: Inconsistencia → Algunos pagos se procesan sin sesión
```

#### ✅ Con Services

```python
# services.py
def procesar_pago(venta, ..., sesion_caja):
    if not sesion_caja or sesion_caja.esta_cerrada:
        raise ValidationError("No hay sesión")
    # ← Garantía: SIEMPRE se valida

# Todas las vistas usan la misma función
procesar_pago(...)  # Vista A
procesar_pago(...)  # Vista B
procesar_pago(...)  # Vista C

Resultado: Consistencia garantizada
```

### Problema 4: Transaccionalidad

#### ❌ Sin Services

```python
def procesar_pago(request):
    venta = Venta.objects.get(pk=venta_id)
    
    # Descuento manual (SIN transacción)
    for detalle in venta.detalles.filter(tipo='insumo'):
        insumo = detalle.insumo
        insumo.stock_actual -= detalle.cantidad
        insumo.save()  # ← Guardado inmediato
    
    # Marca como pagada
    venta.estado = 'pagado'
    venta.save()  # ← Si falla aquí, stock ya está descontado
    
    # Auditoría
    try:
        AuditoriaCaja.objects.create(...)
    except:
        pass  # ← Si falla, no se registra nada
```

**Problema**: Si algo falla a mitad:
- Stock descontado ✅
- Venta NO pagada ❌
- **Inconsistencia total**

#### ✅ Con Services

```python
@transaction.atomic
def procesar_pago(venta, ...):
    # TODO dentro de transacción
    for detalle in venta.detalles.filter(tipo='insumo'):
        descontar_stock_insumo(detalle)
    
    venta.estado = 'pagado'
    venta.save()
    
    AuditoriaCaja.objects.create(...)
    
    # Si algo falla AQUÍ: ROLLBACK de TODO
    # Stock vuelve a original
    # Venta sigue como 'pendiente'
    # Auditoría NO se crea (todo o nada)
```

**Garantía**: TODO o NADA (transacción atómica)

---

## 3. DIFERENCIA ENTRE VISTAS Y SERVICIOS

### Responsabilidades

#### VISTAS (views.py)

**¿Qué hace?**
- Recibe request HTTP
- Extrae datos de query parameters, POST body, URL
- Valida que usuario esté autenticado
- Llama a services
- Convierte resultado a respuesta HTTP (JSON, HTML, redirect)
- Maneja excepciones HTTP (404, 403, etc.)

**¿Qué NO hace?**
- ❌ Lógica de negocio compleja
- ❌ Queries complejas a BD
- ❌ Orquestación de múltiples modelos
- ❌ Decisiones sobre reglas de negocio

**Ejemplo conceptual**:
```python
# vista: coordinadora HTTP
def procesar_pago_view(request):
    # 1. Parsear entrada HTTP
    venta_id = request.POST.get('venta_id')
    metodo = request.POST.get('metodo_pago')
    
    # 2. Validar autenticación
    if not request.user.is_authenticated:
        return redirect('login')
    
    # 3. Obtener contexto
    venta = get_object_or_404(Venta, pk=venta_id)
    sesion = obtener_sesion_activa()
    
    # 4. DELEGAR a service
    try:
        procesar_pago(venta, request.user, metodo, sesion)
    except ValidationError as e:
        return JsonResponse({'error': str(e)}, status=400)
    
    # 5. Retornar respuesta HTTP
    return JsonResponse({'success': True})
```

#### SERVICIOS (services.py)

**¿Qué hace?**
- Implementa reglas de negocio
- Valida datos según dominio
- Orquesta múltiples modelos
- Realiza transacciones complejas
- Registra auditoría
- Retorna resultados o lanza excepciones

**¿Qué NO hace?**
- ❌ Recibe requests HTTP
- ❌ Retorna responses HTTP
- ❌ Maneja autenticación HTTP
- ❌ Sabe de URLs o query parameters

**Ejemplo conceptual**:
```python
# servicio: implementa regla de negocio
def procesar_pago(venta, usuario, metodo_pago, sesion_caja):
    # 1. Validaciones de negocio
    if not sesion_caja or sesion_caja.esta_cerrada:
        raise ValidationError("No hay sesión abierta")
    
    if venta.estado != 'pendiente':
        raise ValidationError("Venta ya fue pagada")
    
    # 2. Orquestación atómica
    with transaction.atomic():
        # 2a. Descuentar stock
        for detalle in venta.detalles.filter(tipo='insumo'):
            descontar_stock_insumo(detalle)
        
        # 2b. Marcar como pagada
        venta.estado = 'pagado'
        venta.metodo_pago = metodo_pago
        venta.save()
        
        # 2c. Auditar
        AuditoriaCaja.objects.create(
            sesion=sesion_caja,
            accion='pago',
            usuario=usuario
        )
    
    return venta
```

### Tabla Comparativa

| Aspecto | Vista | Servicio |
|--------|-------|---------|
| **Recibe** | Request HTTP | Objetos Python |
| **Retorna** | Response HTTP | Resultado o excepción |
| **Depende de** | URLs, query params, POST data | Lógica de dominio |
| **Testeable** | Con cliente HTTP | Sin dependencias HTTP |
| **Reutilizable** | En esa URL solamente | En múltiples contextos |
| **Lógica de negocio** | Minimal | Concentrada |
| **Validaciones** | Técnicas (tipo de dato) | De negocio (reglas) |
| **Transacciones** | Ocasionales | Frecuentes |

---

## 4. CENTRALIZACIÓN DE REGLAS CRÍTICAS

### Problema: Reglas Dispersas

**Regla de negocio**: "Un paciente no puede tener múltiples hospitalizaciones activas simultáneamente"

#### ❌ Sin Centralización

```python
# hospitalizacion/views.py
def crear_hospitalizacion(request):
    # Validación local
    hosp_activa = Hospitalizacion.objects.filter(
        paciente=paciente,
        estado='activa'
    ).exists()
    if hosp_activa:
        return JsonResponse({'error': '...'})
    
    # Crear

# clinica/views.py
def listar_hospitalizaciones(request):
    # ¿Aplicar la misma validación?
    # ...

# agenda/views.py
def agendar_cirugia(request):
    # ¿Validar también?
    # ...

# dashboard/views.py
def dashboard_paciente(request):
    # ¿Validar también?
    # ...

Problema: ¿La regla está en 4 lugares? ¿O en 1?
¿Si alguien olvida la validación en una vista?
```

#### ✅ Con Centralización en Service

```python
# services.py - UN SOLO LUGAR
def validar_hospitalizacion_unica_paciente(paciente):
    """Implementa regla de negocio: un paciente, una hosp activa máximo"""
    activas = Hospitalizacion.objects.filter(
        paciente=paciente,
        estado='activa'
    )
    if activas.exists():
        raise ValidationError(
            f"Paciente {paciente.nombre} ya tiene hospitalización activa"
        )

def crear_hospitalizacion(paciente, veterinario, motivo):
    """Servicio que encapsula creación con validaciones"""
    # Validación centralizada
    validar_hospitalizacion_unica_paciente(paciente)
    
    # Crear
    hospitalizacion = Hospitalizacion.objects.create(
        paciente=paciente,
        veterinario=veterinario,
        motivo=motivo,
        estado='activa'
    )
    
    return hospitalizacion

# TODAS las vistas usan el mismo servicio
# hospitalizacion/views.py
def crear_view(request):
    crear_hospitalizacion(paciente, veterinario, motivo)

# agenda/views.py
def agendar_cirugia_view(request):
    crear_hospitalizacion(...)  # ← Misma validación
```

**Ventaja**: Regla implementada UNA VEZ, aplicada en TODAS PARTES

### Ejemplo Real: Stock Insuficiente

**Regla**: "No se puede descontar más stock del disponible"

```python
# services.py - Centralizado
def descontar_stock_insumo(detalle_venta):
    insumo = detalle_venta.insumo
    cantidad = detalle_venta.cantidad
    
    # Validación de negocio
    if insumo.stock_actual < cantidad:
        raise ValidationError(
            f"Stock insuficiente. Disponible: {insumo.stock_actual}, "
            f"Requerido: {cantidad}"
        )
    
    # Descontar
    insumo.stock_actual -= cantidad
    insumo.save()
    
    # Marcar como descontado
    detalle_venta.stock_descontado = True
    detalle_venta.save()

# Cualquier contexto puede usarla
procesar_pago() → descontar_stock_insumo()  # Pago en caja
revertir_venta() → verificar_stock_antes_de_revertir()  # Cancelación
generar_reporte() → consultar_stock()  # Solo lectura
```

**Garantía**: La misma validación de stock se aplica en TODO EL SISTEMA

---

## 5. EJEMPLOS CONCEPTUALES

### Ejemplo 1: Procesamiento de Pago

#### Flujo de Negocio

```
Usuario solicita: Confirmar Pago
                    ↓
Vista recibe: HTTP POST con venta_id
                    ↓
Vista extrae: Venta object, Usuario
                    ↓
Vista llama: procesar_pago(venta, usuario, metodo, sesion)
                    ↓
SERVICE INICIA ────────────────────────────────────────
│
├─ VALIDAR: ¿Sesión activa?
│   └─ NO → Lanzar ValidationError
│       ✗ Operación cancelada
│
├─ VALIDAR: ¿Venta en estado pendiente?
│   └─ NO → Lanzar ValidationError
│       ✗ Operación cancelada
│
├─ VALIDAR: ¿Hay detalles en la venta?
│   └─ NO → Lanzar ValidationError
│       ✗ Operación cancelada
│
├─ INICIAR TRANSACCIÓN ATÓMICA
│
├─ PARA CADA detalle de tipo 'insumo':
│   ├─ VALIDAR: ¿Stock suficiente?
│   │   └─ NO → Lanzar ValidationError
│   │       ✗ ROLLBACK completo
│   │
│   └─ DESCONTAR: stock_actual -= cantidad
│       ├─ Actualizar: tipo_ultimo_movimiento = 'salida'
│       └─ Actualizar: usuario_ultimo_movimiento = usuario
│
├─ MARCAR VENTA: estado = 'pagado'
│   ├─ Establecer: metodo_pago
│   ├─ Establecer: fecha_pago = now()
│   └─ Asociar: sesion_caja
│
├─ REGISTRAR AUDITORÍA:
│   ├─ AuditoriaCaja.objects.create(...)
│   └─ RegistroHistorico.objects.create(...)
│
├─ FIN TRANSACCIÓN: COMMIT
│
SERVICE RETORNA ────────────────────────────────────
            ↓
        SUCCESS
            ↓
Vista retorna: JsonResponse({'success': True})
```

#### Validaciones en Service

```
Nivel 1: ¿Sesión existe y está abierta?
  DÓNDE: procesar_pago() inicio
  QUIÉN: Service
  CASTIGO: ValidationError

Nivel 2: ¿Venta está en estado correcto?
  DÓNDE: procesar_pago() inicio
  QUIÉN: Service
  CASTIGO: ValidationError

Nivel 3: ¿Hay detalles para procesar?
  DÓNDE: procesar_pago() inicio
  QUIÉN: Service
  CASTIGO: ValidationError

Nivel 4: ¿Stock suficiente POR CADA detalle?
  DÓNDE: descontar_stock_insumo()
  QUIÉN: Service (dentro de transacción)
  CASTIGO: ValidationError → ROLLBACK

Nivel 5: ¿Operación completada sin excepciones?
  DÓNDE: transaction.atomic
  QUIÉN: BD (PostgreSQL)
  CASTIGO: ROLLBACK automático
```

#### Si Algo Falla

```
Escenario 1: Sin sesión abierta
  Service: raise ValidationError("No hay sesión")
  Vista: Captura → JsonResponse({'error': '...'}, status=400)
  Resultado: Pago NO procesado ✓
  
Escenario 2: Stock insuficiente en detalle 1
  Service: raise ValidationError("Stock insuficiente")
  Transacción: ROLLBACK (todo revierte)
  Vista: Captura → JsonResponse({'error': '...'}, status=400)
  Resultado: Stock intacto, Venta sigue pendiente ✓
  
Escenario 3: Falla al crear auditoría (excepción inesperada)
  Transacción: ROLLBACK automático
  Vista: Captura → JsonResponse({'error': '...'}, status=500)
  Resultado: Venta NO pagada (segura) ✓
```

### Ejemplo 2: Descuento de Stock

#### Función Centralizada

```python
def descontar_stock_insumo(detalle_venta):
    """
    Descuenta stock de manera atómica y auditada.
    
    CRÍTICO: Esta es la ÚNICA función que descuenta stock.
    
    Responsabilidades:
    - Validar stock suficiente
    - Prevenir descuentos duplicados
    - Registrar auditoría
    - Garantizar atomicidad
    """
    
    # Paso 1: Obtener referencia
    insumo = detalle_venta.insumo
    cantidad = detalle_venta.cantidad
    
    # Paso 2: Validación 1 - ¿Ya fue descontado?
    if detalle_venta.stock_descontado:
        raise ValidationError(f"Stock ya descontado el {detalle_venta.fecha_descuento}")
    
    # Paso 3: Validación 2 - ¿Cantidad válida?
    if cantidad <= 0:
        raise ValidationError("Cantidad debe ser mayor a 0")
    
    # Paso 4: Validación 3 - ¿Stock suficiente?
    if insumo.stock_actual < cantidad:
        raise ValidationError(
            f"Stock insuficiente para '{insumo.medicamento}'. "
            f"Disponible: {insumo.stock_actual}, Requerido: {cantidad}"
        )
    
    # Paso 5: Descontar (sin transacción, la transacción debe estar fuera)
    stock_anterior = insumo.stock_actual
    insumo.stock_actual -= int(cantidad)
    insumo.tipo_ultimo_movimiento = 'salida_stock'
    insumo.ultimo_movimiento = timezone.now()
    insumo.usuario_ultimo_movimiento = ...  # Del contexto
    insumo.save(update_fields=[...])
    
    # Paso 6: Marcar detalle como descontado
    detalle_venta.stock_descontado = True
    detalle_venta.fecha_descuento_stock = timezone.now()
    detalle_venta.save(update_fields=[...])
    
    # Paso 7: Registrar auditoría automática (signal)
    # Signal registra en RegistroHistorico
```

#### Dónde Se Usa

```
procesar_pago() 
  └─ descontar_stock_insumo()  [Confirmación de pago]

cancelar_venta()
  └─ revertir_stock_insumo()   [Reversa de descuento]

procesar_consulta()
  └─ Genera detalle, descuento en procesar_pago() después [Indirecto]
```

#### Garantías

```
✓ Stock NUNCA se descuenta más de una vez (flag descuento_descontado)
✓ Stock NUNCA es negativo (validación antes)
✓ Todo descuento es auditable (trazabilidad completa)
✓ Todo descuento está en transacción (TODO o NADA)
✓ Si hay rollback, stock vuelve al valor anterior
```

### Ejemplo 3: Validación de Sesión de Caja

#### Regla de Negocio

```
"No se puede procesar ningún pago sin sesión de caja abierta"
```

#### Implementación Centralizada

```python
def validar_sesion_caja_activa():
    """Valida que exista sesión de caja abierta"""
    sesion = SesionCaja.objects.filter(esta_cerrada=False).first()
    
    if not sesion:
        raise ValidationError("No hay sesión de caja abierta")
    
    if sesion.esta_cerrada:  # Sanidad check
        raise ValidationError("La sesión de caja está cerrada")
    
    return sesion

def procesar_pago(venta, usuario, metodo_pago, sesion_caja=None):
    """
    Procesa pago con validación de sesión.
    
    Si sesion_caja no se proporciona, obtiene la activa.
    """
    
    # Validación: Sesión obligatoria
    if sesion_caja is None:
        sesion_caja = validar_sesion_caja_activa()
    else:
        if sesion_caja.esta_cerrada:
            raise ValidationError("La sesión de caja está cerrada")
    
    # Resto del proceso...
    with transaction.atomic():
        # Descuentos y actualizaciones
        pass
```

#### Punto de Enforcing

```
CUALQUIER pago que se intente procesar:

View: procesar_pago_endpoint()
  ├─ Obtiene venta
  ├─ Obtiene sesión o None
  └─ Llama: procesar_pago(venta, ..., sesion_caja)
         ↓
      Service: procesar_pago()
         ├─ Valida sesión (ENFORCING POINT)
         ├─ Si falla → ValidationError
         └─ Si pasa → Continúa con lógica
         
GARANTÍA: Es IMPOSIBLE pagar sin sesión validada
```

#### Escenarios Prevenidos

```
Escenario A: Usuario intenta confirmar pago sin abrir sesión
  procesar_pago() → validar_sesion_caja_activa()
  ← ValidationError("No hay sesión abierta")
  Resultado: ✗ Pago rechazado

Escenario B: Sesión fue cerrada, usuario intenta pagar después
  procesar_pago() → if sesion_caja.esta_cerrada
  ← ValidationError("Sesión cerrada")
  Resultado: ✗ Pago rechazado

Escenario C: Aplicación permite múltiples sesiones (ERROR)
  validar_sesion_caja_activa() → filter(esta_cerrada=False).first()
  ← Solo obtiene la PRIMERA sesión abierta
  procesar_pago() → Usa esa sesión (consistencia)
  Resultado: ✓ Fuerza una sesión única

GARANTÍA: Sesiones múltiples son IMPOSIBLES (enforced en negocio)
```

### Ejemplo 4: Cálculo Automático de Dosis

#### Regla de Negocio

```
"La cantidad de insumo para una consulta se calcula automáticamente 
como: (peso_paciente × dosis_ml_por_kg) ÷ ml_contenedor"
```

#### Implementación en Service

```python
def calcular_cantidad_insumo_consulta(paciente, insumo, peso_paciente=None):
    """
    Calcula cantidad de insumo para consulta.
    
    Fórmula:
      dosis_total_ml = peso × dosis_ml_por_kg
      cantidad_contenedores = ⌈dosis_total_ml ÷ ml_contenedor⌉
    
    Ejemplo:
      Paciente: 8.5 kg
      Insumo: Antibiótico 0.5 ml/kg, frascos de 5 ml
      dosis_total = 8.5 × 0.5 = 4.25 ml
      cantidad = ⌈4.25 ÷ 5⌉ = ⌈0.85⌉ = 1 frasco
    """
    from decimal import Decimal, ROUND_UP
    
    # Usar peso proporcionado o del paciente
    peso = peso_paciente or paciente.ultimo_peso
    
    if not peso:
        raise ValidationError("Peso del paciente requerido para cálculo automático")
    
    # Validar datos del insumo
    if not insumo.dosis_ml_por_kg:
        raise ValidationError(f"Insumo '{insumo.medicamento}' sin dosis configurada")
    
    if not insumo.ml_contenedor:
        raise ValidationError(f"Insumo '{insumo.medicamento}' sin ml_contenedor configurado")
    
    # Calcular
    dosis_total = Decimal(str(peso)) * Decimal(str(insumo.dosis_ml_por_kg))
    cantidad = (
        dosis_total / Decimal(str(insumo.ml_contenedor))
    ).quantize(Decimal('1'), rounding=ROUND_UP)
    
    return cantidad

def registrar_insumo_en_consulta(consulta, insumo, cantidad_manual=None):
    """
    Registra insumo en consulta con cálculo automático opcional.
    """
    
    # Si hay cantidad manual, usarla (veterinario override)
    if cantidad_manual:
        cantidad_final = cantidad_manual
        calculo_automatico = False
    else:
        # Calcular automáticamente
        cantidad_final = calcular_cantidad_insumo_consulta(
            consulta.paciente,
            insumo,
            peso_paciente=consulta.peso_paciente
        )
        calculo_automatico = True
    
    # Crear registro
    consulta_insumo = ConsultaInsumo.objects.create(
        consulta=consulta,
        insumo=insumo,
        cantidad_final=cantidad_final,
        calculo_automatico=calculo_automatico
    )
    
    return consulta_insumo
```

#### Reutilización

```
registrar_insumo_en_consulta() → Usado en:
  - Crear consulta
  - Editar consulta (modificar insumos)
  - Cargar plantilla de servicio (pre-llenar insumos)
  - APIs de autocomplete

GARANTÍA: Cálculo de dosis SIEMPRE igual en todas partes
```

### Ejemplo 5: Cierre de Sesión de Caja

#### Flujo Complejo

```python
def cerrar_sesion_caja(sesion, usuario, monto_contado):
    """
    Cierre de sesión es operación crítica que:
    - Valida estado de sesión
    - Valida que no haya cobros pendientes
    - Calcula diferencia de efectivo
    - Audita la operación
    - Marca sesión como cerrada
    """
    
    # Validación 1: Sesión no puede estar ya cerrada
    if sesion.esta_cerrada:
        raise ValidationError("Esta sesión ya está cerrada")
    
    # Validación 2: No puede haber cobros pendientes
    pendientes = sesion.ventas.filter(estado='pendiente').count()
    if pendientes > 0:
        raise ValidationError(
            f"No se puede cerrar. Hay {pendientes} cobro(s) pendiente(s)"
        )
    
    # Validación 3: Monto contado debe ser positivo
    if monto_contado < 0:
        raise ValidationError("Monto contado debe ser positivo")
    
    # Cálculo 1: Efectivo generado durante sesión
    ventas_efectivo = sesion.ventas.filter(
        metodo_pago='efectivo',
        estado='pagado'
    )
    total_efectivo = sum(v.total for v in ventas_efectivo)
    
    # Cálculo 2: Monto esperado
    monto_esperado = sesion.monto_inicial + total_efectivo
    
    # Cálculo 3: Diferencia (auditoría automática)
    diferencia = monto_contado - monto_esperado
    
    # Guardar resultados
    with transaction.atomic():
        sesion.monto_final_calculado = monto_esperado
        sesion.monto_final_contado = monto_contado
        sesion.diferencia = diferencia
        sesion.fecha_cierre = timezone.now()
        sesion.usuario_cierre = usuario
        sesion.esta_cerrada = True
        sesion.save()
        
        # Auditoría del cierre
        AuditoriaCaja.objects.create(
            sesion=sesion,
            accion='cerrar_sesion',
            usuario=usuario,
            datos_nuevos={
                'monto_inicial': str(sesion.monto_inicial),
                'monto_calculado': str(monto_esperado),
                'monto_contado': str(monto_contado),
                'diferencia': str(diferencia)
            }
        )
    
    return sesion
```

#### Decisiones de Negocio Centralizadas

```
Decisión 1: ¿Puedo cerrar sesión con cobros pendientes?
  NO → if pendientes > 0: raise ValidationError
  
Decisión 2: ¿Incluir pagos con tarjeta en diferencia?
  NO → filter(metodo_pago='efectivo') solo
  
Decisión 3: ¿Permitir diferencia negativa (faltante)?
  SÍ → diferencia puede ser negativo
  Pero se audita y registra
  
Decisión 4: ¿Qué pasa si diferencia > 1000?
  Opcional: raise ValidationError o solo alertar
  Implementado en negocio
```

---

## 6. PROBLEMAS QUE EVITA LA CAPA DE SERVICES

### Problema 1: Código Duplicado

#### ❌ Sin Services

```
procesar_pago() → Implementado en 5 vistas → 1500+ líneas
procesar_pago() → Implementado en 5 vistas → 1500+ líneas
procesar_pago() → Implementado en 5 vistas → 1500+ líneas
procesar_pago() → Implementado en 5 vistas → 1500+ líneas
procesar_pago() → Implementado en 5 vistas → 1500+ líneas
                                            ────────────
                                          Código duplicado
                                          Bug en 1 lugar = Bug en 5
```

#### ✅ Con Services

```
procesar_pago() → Implementado en services.py → 200 líneas
                  Usado en 5 vistas → Import + llamada

Cambio: Actualizar 1 archivo, aplicado a todos automáticamente
```

### Problema 2: Inconsistencia de Validaciones

#### ❌ Sin Services

```
Vista A: Valida sesión ✓
Vista B: ¿Valida sesión? ... olvidó ...
Vista C: Valida sesión ✓
Vista D: ¿Valida sesión? ... olvidó ...
Vista E: Valida sesión ✓

Resultado: Algunos pagos sin validación de sesión
Implicación: Stock se descuenta sin registro en sesión
Consecuencia: Auditoría imposible, diferencias no detectables
```

#### ✅ Con Services

```
procesar_pago():
  ├─ Valida sesión (OBLIGATORIO)
  ├─ Valida venta
  ├─ Descuenta stock
  └─ Audita

Vista A: procesar_pago() ← Validación automática
Vista B: procesar_pago() ← Validación automática
Vista C: procesar_pago() ← Validación automática
Vista D: procesar_pago() ← Validación automática
Vista E: procesar_pago() ← Validación automática

GARANTÍA: TODAS las validaciones siempre se aplican
```

### Problema 3: Atomicidad Inconsistente

#### ❌ Sin Services

```
Vista A:
  @transaction.atomic ✓
  Descuenta stock → Salva venta
  TODO o NADA

Vista B:
  SIN @transaction.atomic ✗
  Descuenta stock → Salva venta
  SI FALLA: Stock descontado, venta no pagada
  → INCONSISTENCIA

Vista C:
  @transaction.atomic ✓
  ...
```

#### ✅ Con Services

```
procesar_pago():
  @transaction.atomic ← Garantizado en service
  
Vista A: procesar_pago() ← Hereda atomicidad
Vista B: procesar_pago() ← Hereda atomicidad
Vista C: procesar_pago() ← Hereda atomicidad

GARANTÍA: TODA operación de negocio es atómica
```

### Problema 4: Testing Imposible

#### ❌ Sin Services

```python
# ¿Cómo testear procesar_pago sin HTTP?
# ¿Cómo mockear request?
# ¿Cómo testear sin servidor?

def test_procesar_pago():
    client = Client()  # ← Cliente HTTP requerido
    response = client.post('/caja/procesar-pago/', {...})
    assert response.status_code == 200
    
    # Problema: Testing de HTTP, no de lógica de negocio
    # Lento: Requiere servidor
    # Acoplado: Cambiar URL = break test
    # Complejo: Mockear request es verboso
```

#### ✅ Con Services

```python
# Testeo directo sin HTTP
def test_procesar_pago():
    venta = create_test_venta(...)
    sesion = create_test_sesion(...)
    
    procesar_pago(venta, test_user, 'efectivo', sesion)
    
    assert venta.estado == 'pagado'
    assert venta.metodo_pago == 'efectivo'
    assert Insumo.objects.get(...).stock_actual == original - cantidad
    
    # Ventajas:
    # - Rápido: Sin servidor
    # - Independiente: URL irrelevante
    # - Directo: Testea lógica de negocio
    # - Aislado: Sin dependencias HTTP
```

### Problema 5: Mantenibilidad

#### ❌ Sin Services

```
Cambio de regla: "A partir de hoy, registrar auditoría en cada pago"

¿Qué hacemos?
1. Editar View A
2. Editar View B
3. Editar View C
4. Editar View D
5. Editar View E
6. ¿Faltó una?
7. Encontrar bug → repetir 1-6

Riesgo: Alto (5 lugares = 5 oportunidades de error)
Tiempo: Alto (modificar 5 archivos)
Validación: Compleja (¿qué vista falta?)
```

#### ✅ Con Services

```
Cambio de regla: "A partir de hoy, registrar auditoría en cada pago"

¿Qué hacemos?
1. Editar procesar_pago() en services.py
2. Listo

Todas las vistas heredan automáticamente el cambio

Riesgo: Bajo (1 lugar)
Tiempo: Bajo (1 archivo)
Validación: Trivial (service fue editado)
```

---

## 7. ARQUITECTURA DE LAYERS EN VETSAN TOFÍA

### Stack Completo

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND LAYER                                              │
├─────────────────────────────────────────────────────────────┤
│ templates/caja_register.html                                │
│ - Form de paciente, servicios, insumos                      │
│ - Tabla de detalles de venta                                │
│ - Botones de pago, cancelar, etc.                           │
└────────────────┬──────────────────────────────────────────┘
                 │ GET /caja_register → HTML Template
                 │ POST /caja/procesar-venta → JSON
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ VIEW LAYER                                                  │
├─────────────────────────────────────────────────────────────┤
│ caja/views.py                                               │
│ - procesar_venta(request)                                   │
│ - procesar_pago(request)                                    │
│ - cancelar_venta(request)                                   │
│                                                             │
│ Responsabilidades:                                          │
│ - Parsear HTTP request                                      │
│ - Validar autenticación                                     │
│ - Llamar a services                                         │
│ - Convertir resultado a JSON/HTML                           │
└────────────────┬──────────────────────────────────────────┘
                 │ procesar_pago(venta, user, metodo, sesion)
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ SERVICE LAYER (Lógica de Negocio)                           │
├─────────────────────────────────────────────────────────────┤
│ caja/services.py                                            │
│                                                             │
│ procesar_pago(venta, usuario, metodo_pago, sesion_caja)   │
│ - Valida sesión activa                                      │
│ - Valida venta pendiente                                    │
│ - Descuenta stock (por cada insumo)                         │
│ - Marca venta como pagada                                   │
│ - Registra auditoría                                        │
│                                                             │
│ descontar_stock_insumo(detalle)                             │
│ - Valida stock suficiente                                   │
│ - Previene doble descuento                                  │
│ - Descuenta y audita                                        │
│                                                             │
│ crear_cobro_desde_consulta(consulta)                        │
│ - Genera Venta desde consulta                               │
│ - Crea DetalleVenta por servicios                           │
│ - Crea DetalleVenta por insumos                             │
│ - Calcula totales                                           │
│                                                             │
│ cerrar_sesion_caja(sesion, usuario, monto_contado)         │
│ - Valida no hay cobros pendientes                           │
│ - Calcula diferencia de efectivo                            │
│ - Audita diferencia                                         │
│ - Cierra sesión                                             │
│                                                             │
│ Responsabilidades Clave:                                    │
│ - Implementa reglas de negocio                              │
│ - Orquesta múltiples modelos                                │
│ - Garantiza atomicidad (transacciones)                      │
│ - Audita operaciones críticas                               │
│ - Retorna resultados o excepciones                          │
└────────────────┬──────────────────────────────────────────┘
                 │ venta.estado = 'pagado'
                 │ insumo.stock_actual -= cantidad
                 │ Venta.objects.create(...)
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ MODEL LAYER                                                 │
├─────────────────────────────────────────────────────────────┤
│ caja/models.py                                              │
│ - Venta, DetalleVenta, SesionCaja                           │
│ - Estructura de datos                                       │
│ - Validaciones básicas (@property, clean())                 │
│ - Métodos de utilidad (total_calculado, etc.)               │
│                                                             │
│ inventario/models.py                                        │
│ - Insumo, estructura y validaciones                         │
│                                                             │
│ Responsabilidades:                                          │
│ - Define estructura de datos                                │
│ - Valida integridad de datos                                │
│ - No implementa lógica de negocio compleja                  │
└────────────────┬──────────────────────────────────────────┘
                 │ INSERT, UPDATE, DELETE
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ DATABASE LAYER (PostgreSQL)                                 │
├─────────────────────────────────────────────────────────────┤
│ Tablas: venta, detalle_venta, sesion_caja, insumo           │
│ - Persistencia                                              │
│ - ACID compliance                                           │
│ - Constraints (UNIQUE, FOREIGN KEY, CHECK)                  │
│ - Transactions                                              │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos Completo

```
1. USER SUBMITS FORM
   Form HTML → JavaScript → Fetch API → JSON request
   
2. VIEW RECEIVES
   caja/views.py → procesar_pago(request)
   ├─ Parse JSON
   ├─ Validate authentication
   ├─ Get Venta object
   ├─ Get SesionCaja
   └─ Call service
   
3. SERVICE EXECUTES
   caja/services.py → procesar_pago(venta, ...)
   ├─ Validate business rules
   ├─ Begin transaction
   ├─ Deduct stock (inventory model)
   ├─ Update venta (caja model)
   ├─ Create audit (historial model)
   ├─ Commit transaction
   └─ Return result
   
4. DATABASE PERSISTS
   PostgreSQL → INSERT, UPDATE operations
   ├─ Decrement insumo.stock_actual
   ├─ Update venta.estado
   ├─ Insert audit record
   ├─ Enforce constraints
   └─ Guarantee ACID
   
5. VIEW FORMATS RESPONSE
   Result → JsonResponse({'success': true})
   
6. FRONTEND RECEIVES
   JSON → JavaScript → Update DOM → User sees confirmation
```

---

## 8. PRINCIPIOS DE DISEÑO

### Principio 1: Single Responsibility

**Service debe hacer UNA cosa bien**:
```
procesar_pago() → BIEN
├─ Valida sesión
├─ Descuenta stock
├─ Marca como pagado
├─ Audita
└─ Retorna resultado

procesar_pago_y_enviar_email_y_crear_reporte() → MAL
├─ Lógica de pago
├─ Lógica de email
├─ Lógica de reporte
└─ Muchas responsabilidades
```

**Service puede coordinar múltiples acciones**, pero todas relacionadas con un flujo de negocio.

### Principio 2: Dependency Injection

**Service no debe crear sus dependencias**:

```python
# ❌ MAL: Service crea sus dependencias
def procesar_pago(venta_id):
    venta = Venta.objects.get(pk=venta_id)  # ← Creada dentro
    sesion = SesionCaja.objects.filter(...).first()  # ← Creada dentro
    usuario = ... # ← Adónde viene?

# ✅ BIEN: Service recibe dependencias
def procesar_pago(venta, usuario, sesion_caja):
    # Todas las dependencias pasadas como parámetros
```

**Ventaja**: Service testeable sin necesidad de fixtures complejas.

### Principio 3: Explicit Exceptions

**Service debe lanzar excepciones explícitas**:

```python
# ❌ MAL: Retorna valores vagos
def procesar_pago(...):
    if not sesion:
        return None  # ¿Qué significa None?
    if stock < cantidad:
        return False  # ¿Qué significa False?

# ✅ BIEN: Lanza excepciones explícitas
def procesar_pago(...):
    if not sesion:
        raise ValidationError("No hay sesión abierta")
    if stock < cantidad:
        raise ValidationError("Stock insuficiente")
```

**Ventaja**: Vista sabe exactamente qué salió mal.

### Principio 4: Atomic Transactions

**Service debe garantizar atomicidad**:

```python
@transaction.atomic
def procesar_pago(venta, ...):
    # TODO aquí dentro
    # Si algo falla → ROLLBACK completo
    # Sin "estados intermedios" inconsistentes
```

### Principio 5: Audit Trail

**Service debe registrar todo**:

```python
def procesar_pago(...):
    with transaction.atomic():
        # Cambios de datos
        venta.estado = 'pagado'
        venta.save()
        
        # Auditoría SIEMPRE
        AuditoriaCaja.objects.create(
            usuario=usuario,
            accion='pago',
            venta=venta
        )
```

---

## 9. CONCLUSIÓN: POR QUÉ ESTA ARQUITECTURA FUNCIONA

### Resumen de Ventajas

| Aspecto | Beneficio |
|---------|-----------|
| **Reutilización** | Código escrito una vez, usado en múltiples contextos |
| **Consistencia** | Mismas validaciones aplicadas siempre |
| **Mantenibilidad** | Cambios en un lugar, aplicados a todo el sistema |
| **Testabilidad** | Fácil de testear sin HTTP |
| **Atomicidad** | Transacciones garantizadas |
| **Auditoría** | Trazabilidad completa |
| **Escalabilidad** | Agregar nuevas vistas sin duplicar lógica |
| **Seguridad** | Validaciones centralizadas, menos puntos de ataque |

### Aplicación en VetSantaSofia

El sistema implementa esta arquitectura en:

```
caja/services.py:
  - procesar_pago()
  - cancelar_venta()
  - descontar_stock_insumo()
  - crear_cobro_pendiente_desde_consulta()
  - cerrar_sesion_caja()

clinica/services.py:
  - crear_hospitalizacion()
  - calcular_cantidad_insumo()
  - dar_alta_paciente()

inventario/services.py:
  - validar_stock_disponible()
  - registrar_movimiento_stock()

pacientes/services.py:
  - validar_propietario_duplicado()
  - crear_paciente_con_validaciones()
```

### Garantías del Sistema

✅ **Integridad**: Datos consistentes en todo momento
✅ **Trazabilidad**: Auditoría completa de todas las operaciones
✅ **Robustez**: Validaciones en múltiples niveles
✅ **Mantenibilidad**: Código organizado y reutilizable
✅ **Testabilidad**: Fácil de validar sin servidor
✅ **Escalabilidad**: Agregar nuevas funcionalidades sin refactorizar

**Conclusión**: La capa de services es el corazón del sistema, donde ocurren todas las decisiones de negocio críticas, garantizando que el software hace exactamente lo que el negocio requiere, de manera consistente y auditable.
