# 📋 SISTEMA DE CAJA Y COBROS - DOCUMENTACIÓN COMPLETA

## 🎯 RESUMEN EJECUTIVO

Sistema completo para gestionar cobros automáticos desde consultas/hospitalizaciones veterinarias, con control de stock, sesiones de caja diarias y auditoría completa.

### ✅ Cumplimiento de Reglas Estrictas

- ❌ **NO se renombró** ningún campo, modelo, variable o ruta existente
- ❌ **NO se rompió** ninguna funcionalidad existente
- ✅ Se agregaron **nuevos modelos** sin interferir con los actuales
- ✅ El stock **solo se descuenta al cobrar**, nunca antes
- ✅ Todo cambio tiene **registro de auditoría** completo

---

## 🏗️ ARQUITECTURA DE ENTIDADES

### 1. Modelos Nuevos en `caja/models.py`

#### SesionCaja
```python
- usuario_apertura: Usuario que abre la sesión
- usuario_cierre: Usuario que cierra la sesión
- fecha_apertura / fecha_cierre
- monto_inicial / monto_final_calculado / monto_final_contado
- diferencia: Diferencia entre calculado y contado
- esta_cerrada: Boolean
```

**Propósito**: Control de sesiones diarias de caja con apertura y cierre.

#### Venta (Cobro Pendiente/Pagado)
```python
- numero_venta: Generado automáticamente (V20241212-0001)
- sesion: FK a SesionCaja
- tipo_origen: 'consulta', 'hospitalizacion', 'venta_libre'
- consulta: OneToOne a Consulta (nullable)
- hospitalizacion: OneToOne a Hospitalizacion (nullable)
- paciente: FK a Paciente (nullable para ventas libres)
- estado: 'pendiente', 'pagado', 'cancelado'
- subtotal_servicios / subtotal_insumos / descuento / total
- metodo_pago: 'efectivo', 'tarjeta', 'transferencia', etc.
- fecha_pago / usuario_cobro
- usuario_creacion / fecha_creacion
```

**Propósito**: Representa un cobro (pendiente o pagado). Se crea automáticamente desde consultas/hospitalizaciones o manualmente como venta libre.

#### DetalleVenta
```python
- venta: FK a Venta
- tipo: 'servicio' o 'insumo'
- servicio: FK a Servicio (nullable)
- insumo: FK a Insumo (nullable)
- descripcion / cantidad / precio_unitario / subtotal
- peso_paciente / dosis_calculada_ml / ml_contenedor
- calculo_automatico: Boolean
- stock_descontado: Boolean
- fecha_descuento_stock
```

**Propósito**: Líneas de detalle de cada venta. Guarda snapshot de datos para historial.

#### AuditoriaCaja
```python
- venta / sesion: FK opcionales
- accion: 'crear_venta', 'agregar_detalle', 'eliminar_detalle', 
         'modificar_detalle', 'aplicar_descuento', 'confirmar_pago',
         'cancelar_venta', 'abrir_sesion', 'cerrar_sesion'
- usuario / fecha
- descripcion
- datos_anteriores / datos_nuevos: JSONField
```

**Propósito**: Registro completo de auditoría de todas las acciones en caja.

### 2. Modelos Nuevos en `clinica/models.py`

#### ConsultaInsumo
```python
- consulta: FK a Consulta
- insumo: FK a Insumo (PROTECT)
- peso_paciente / dosis_ml_por_kg / dosis_total_ml / ml_por_contenedor
- cantidad_calculada / cantidad_manual / cantidad_final
- calculo_automatico: Boolean
- requiere_confirmacion: Boolean
- confirmado_por / fecha_confirmacion
```

**Propósito**: Tabla intermedia para insumos en consultas con cálculo automático de cantidades basado en dosis por peso.

#### HospitalizacionInsumo
Similar a ConsultaInsumo pero para hospitalizaciones.

#### CirugiaInsumo
Similar a ConsultaInsumo pero para cirugías dentro de hospitalizaciones.

---

## 🔄 FLUJOS DETALLADOS

### Flujo 1: Crear Consulta → Cobro Pendiente Automático

```
1. Veterinario crea una Consulta
   ↓
2. Agrega servicios (via ManyToMany)
   ↓
3. Agrega insumos → se crean ConsultaInsumo
   ↓
4. Al guardar, se activa signal post_save
   ↓
5. Signal llama a crear_cobro_pendiente_desde_consulta()
   ↓
6. Se crea una Venta en estado 'pendiente'
   ↓
7. Se agregan DetalleVenta por cada servicio e insumo
   ↓
8. Se registra en AuditoriaCaja
   ↓
9. El cobro queda disponible en Caja
```

**Código del signal** (`clinica/signals.py`):
```python
@receiver(post_save, sender=Consulta)
def crear_cobro_desde_consulta(sender, instance, created, **kwargs):
    if not hasattr(instance, 'venta') or not instance.venta:
        tiene_servicios = instance.servicios.exists()
        tiene_insumos = instance.insumos_detalle.exists()
        
        if tiene_servicios or tiene_insumos:
            crear_cobro_pendiente_desde_consulta(instance, instance.veterinario)
```

### Flujo 2: Cálculo Automático de Insumos por Dosis

```
Caso A: Todos los datos disponibles
─────────────────────────────────────
1. Veterinario selecciona insumo con:
   - dosis_ml = 0.5 ml/kg
   - ml_contenedor = 10 ml
   
2. Paciente pesa 15 kg
   
3. Al crear ConsultaInsumo:
   - dosis_total_ml = 15 kg × 0.5 ml/kg = 7.5 ml
   - cantidad = CEIL(7.5 / 10) = 1 contenedor
   - calculo_automatico = True
   
4. Se crea DetalleVenta con cantidad = 1


Caso B: Faltan datos
─────────────────────
1. Insumo NO tiene ml_contenedor definido
   
2. Al crear ConsultaInsumo:
   - requiere_confirmacion = True
   - cantidad_final = 1 (default)
   
3. En la UI se muestra:
   [!] Este insumo requiere confirmación manual
   [Botón: Declarar cantidad]
   
4. Al hacer clic, se abre modal:
   "Declare insumos utilizados del item [Nombre]"
   - Campo: Cantidad de ítems utilizados
   - Campo: Dosis ml/kg (opcional)
   - Campo: ML por contenedor (opcional)
   
5. Usuario ingresa cantidad manual
   
6. Se actualiza ConsultaInsumo:
   - cantidad_manual = [valor ingresado]
   - confirmado_por = [usuario]
   - fecha_confirmacion = [ahora]
```

### Flujo 3: Editar Cobro Pendiente en Caja

```
1. Recepción abre el cobro pendiente
   ↓
2. Puede hacer:
   - Agregar servicio adicional
   - Agregar insumo adicional
   - Eliminar un item
   - Modificar cantidad
   - Aplicar descuento
   ↓
3. Cada acción registra en AuditoriaCaja:
   - accion: 'agregar_detalle' / 'eliminar_detalle' / etc.
   - usuario: quien hizo el cambio
   - datos_anteriores: estado previo
   - datos_nuevos: estado nuevo
   ↓
4. Se recalcula el total automáticamente
   ↓
5. El cobro sigue en estado 'pendiente'
```

### Flujo 4: Confirmar Pago → Descuento de Stock

```
1. Recepción confirma el pago
   ↓
2. Se llama a procesar_pago()
   ↓
3. Transacción atómica:
   a) Cambiar estado a 'pagado'
   b) Registrar metodo_pago, fecha_pago, usuario_cobro
   c) Asociar a sesion_activa
   d) PARA CADA DetalleVenta de tipo 'insumo':
      - Verificar stock disponible
      - Descontar del insumo.stock_actual
      - Marcar stock_descontado = True
      - Registrar fecha_descuento_stock
   ↓
4. Si hay error (stock insuficiente):
   - ROLLBACK completo
   - No se confirma el pago
   - Se muestra error al usuario
   ↓
5. Si todo OK:
   - COMMIT
   - Registrar en AuditoriaCaja
   - Retornar éxito
```

**REGLA CRÍTICA**: El stock solo se descuenta aquí, nunca antes.

### Flujo 5: Venta Libre (sin paciente)

```
1. Recepción crea venta libre
   ↓
2. Puede seleccionar:
   - Paciente (opcional)
   - Servicios
   - Insumos (con cantidades manuales)
   ↓
3. Se crea Venta con tipo_origen='venta_libre'
   ↓
4. Se agregan DetalleVenta
   ↓
5. Queda en estado 'pendiente'
   ↓
6. Al confirmar pago → mismo flujo de descuento de stock
```

### Flujo 6: Cerrar Caja → Reporte Diario

```
1. Verificar que no haya cobros pendientes en la sesión
   ↓
2. Ingresar monto contado físicamente
   ↓
3. Sistema calcula:
   - monto_final_calculado = monto_inicial + total_vendido
   - diferencia = monto_contado - monto_calculado
   ↓
4. Se genera reporte completo:
   
   A) RESUMEN GENERAL
      - Total vendido
      - Cantidad de ventas
      - Ventas con/sin paciente
   
   B) POR MEDIO DE PAGO
      - Efectivo: $XX (N ventas)
      - Tarjeta: $YY (M ventas)
      - etc.
   
   C) DETALLE DE VENTAS
      - N° Venta | Paciente | Origen | Total | Método
   
   D) INSUMOS CONSUMIDOS
      - Insumo | Cantidad | Valor Total
   
   E) AUDITORÍA
      - Últimas 50 acciones del día
      - Usuario | Acción | Descripción
   ↓
5. Se marca sesion.esta_cerrada = True
   ↓
6. Reporte queda disponible para consulta histórica
```

---

## 🔐 PERMISOS Y ROLES

### Administrador
- ✅ Abrir/cerrar sesión de caja
- ✅ Crear/editar/cancelar cobros pendientes
- ✅ Confirmar pagos
- ✅ Ver reportes
- ✅ Acceso completo a auditoría

### Recepción
- ✅ Abrir/cerrar sesión de caja
- ✅ Crear/editar/cancelar cobros pendientes
- ✅ Confirmar pagos
- ✅ Ver reportes
- ✅ Acceso completo a auditoría

### Veterinario
- ✅ Crear consultas/hospitalizaciones
- ✅ Genera cobro pendiente automáticamente
- ❌ NO puede abrir/cerrar caja
- ❌ NO puede confirmar pagos
- ❌ NO puede editar cobros (solo ver los que generó)

### Implementación de permisos:
```python
# En views_cobros.py
def es_admin_o_recepcion(user):
    return user.is_staff or user.rol in ['administracion', 'recepcion']

@user_passes_test(es_admin_o_recepcion)
def dashboard_caja(request):
    ...
```

---

## 📊 EJEMPLOS DE USO

### Ejemplo 1: Consulta Simple con Vacuna

```python
# 1. Crear consulta
consulta = Consulta.objects.create(
    paciente=firulais,
    veterinario=dr_juan,
    tipo_consulta='vacuna',
    peso=15.5,
    diagnostico='Vacuna antirrábica'
)

# 2. Agregar servicio
vacuna_antirrabica = Servicio.objects.get(nombre='Vacuna Antirrábica')
consulta.servicios.add(vacuna_antirrabica)

# 3. Agregar insumo con cálculo automático
vacuna_insumo = Insumo.objects.get(medicamento='Vacuna Antirrábica')
# vacuna_insumo.dosis_ml = 1.0 ml/kg
# vacuna_insumo.ml_contenedor = 10 ml
# peso del paciente = 15.5 kg

ConsultaInsumo.objects.create(
    consulta=consulta,
    insumo=vacuna_insumo,
    peso_paciente=15.5,
    dosis_ml_por_kg=1.0,
    ml_por_contenedor=10
)
# → Calcula automáticamente: dosis_total = 15.5 ml, cantidad = 2 frascos

# 4. Al guardar la consulta, se activa el signal
consulta.save()

# 5. Signal crea automáticamente:
# - Venta en estado 'pendiente'
# - DetalleVenta con servicio (1 x $15000)
# - DetalleVenta con insumo (2 x $8000)
# - Total = $31000
```

### Ejemplo 2: Hospitalización con Cirugía

```python
# 1. Crear hospitalización
hosp = Hospitalizacion.objects.create(
    paciente=max,
    veterinario=dra_maria,
    fecha_ingreso=timezone.now(),
    motivo='Cirugía de esterilización',
    estado='activa'
)

# 2. Crear cirugía
cirugia = Cirugia.objects.create(
    hospitalizacion=hosp,
    servicio=Servicio.objects.get(nombre='Esterilización Felino'),
    fecha_cirugia=timezone.now(),
    veterinario_cirujano=dra_maria,
    tipo_cirugia='Esterilización',
    descripcion='Ovariohisterectomía'
)

# 3. Agregar insumos a la cirugía
anestesia = Insumo.objects.get(medicamento='Propofol')
CirugiaInsumo.objects.create(
    cirugia=cirugia,
    insumo=anestesia,
    peso_paciente=4.2,
    dosis_ml_por_kg=0.5,
    ml_por_contenedor=20
)
# → dosis_total = 2.1 ml, cantidad = 1 frasco

# 4. Dar de alta
hosp.estado = 'alta'
hosp.save()

# 5. Signal crea cobro pendiente con:
# - Servicio de cirugía
# - Insumos de cirugía
# - Total calculado
```

### Ejemplo 3: Venta Libre de Alimento

```python
from caja.services import crear_venta_libre

# Venta sin paciente
venta = crear_venta_libre(
    usuario=request.user,
    items_insumos=[
        {'insumo_id': 45, 'cantidad': 2},  # 2 bolsas de alimento
    ],
    paciente=None,  # Sin paciente
    observaciones='Venta directa de alimento'
)

# → Crea Venta con:
#    - tipo_origen = 'venta_libre'
#    - paciente = None
#    - estado = 'pendiente'
#    - 2 DetalleVenta con el insumo
```

### Ejemplo 4: Editar Cobro en Caja

```python
from caja.services import agregar_detalle_venta, aplicar_descuento_venta

# 1. Agregar un servicio adicional
venta = Venta.objects.get(numero_venta='V20241212-0001')

agregar_detalle_venta(
    venta=venta,
    tipo='servicio',
    item_id=23,  # ID del servicio
    cantidad=1,
    usuario=request.user
)
# → Registra en AuditoriaCaja: accion='agregar_detalle'

# 2. Aplicar descuento
aplicar_descuento_venta(
    venta=venta,
    descuento=5000,
    usuario=request.user,
    motivo='Cliente frecuente'
)
# → Registra en AuditoriaCaja: accion='aplicar_descuento'
```

### Ejemplo 5: Confirmar Pago

```python
from caja.services import procesar_pago, obtener_sesion_activa

sesion = obtener_sesion_activa()
venta = Venta.objects.get(numero_venta='V20241212-0001')

procesar_pago(
    venta=venta,
    usuario=request.user,
    metodo_pago='tarjeta',
    sesion_caja=sesion
)

# → Resultado:
#   1. venta.estado = 'pagado'
#   2. Para cada insumo:
#      - insumo.stock_actual -= cantidad
#      - detalle.stock_descontado = True
#   3. Registra en AuditoriaCaja
```

---

## 🗂️ ESTRUCTURA DE ARCHIVOS NUEVOS

```
caja/
├── models.py                  ← MODIFICADO: agregados SesionCaja, Venta, DetalleVenta, AuditoriaCaja
├── services.py                ← NUEVO: toda la lógica de negocio
├── views_cobros.py            ← NUEVO: vistas del sistema de cobros
├── static/caja/js/
│   └── modales-caja.js        ← NUEVO: modales JS para declarar insumos y editar cobros
└── templates/caja/
    ├── dashboard_caja.html    ← NUEVO: dashboard principal
    ├── abrir_caja.html
    ├── cerrar_caja.html
    ├── lista_cobros_pendientes.html
    ├── detalle_cobro_pendiente.html
    ├── crear_venta_libre.html
    ├── reporte_sesion.html
    └── historial_sesiones.html

clinica/
├── models.py                  ← MODIFICADO: agregados ConsultaInsumo, HospitalizacionInsumo, CirugiaInsumo
├── signals.py                 ← NUEVO: signals para crear cobros automáticos
└── apps.py                    ← MODIFICADO: importa signals en ready()
```

---

## 🔧 INSTALACIÓN Y CONFIGURACIÓN

### 1. Ejecutar Migraciones

```bash
# Crear migraciones
python manage.py makemigrations caja clinica

# Aplicar migraciones
python manage.py migrate
```

### 2. Configurar URLs

Agregar en `veteriaria/urls.py`:

```python
urlpatterns = [
    # ... URLs existentes ...
    
    # URLs del sistema de cobros
    path('caja/', include('caja.urls')),
]
```

Crear `caja/urls.py`:

```python
from django.urls import path
from . import views_cobros

app_name = 'caja'

urlpatterns = [
    path('dashboard/', views_cobros.dashboard_caja, name='dashboard'),
    path('abrir/', views_cobros.abrir_caja, name='abrir_caja'),
    path('cerrar/<int:sesion_id>/', views_cobros.cerrar_caja, name='cerrar_caja'),
    path('cobros-pendientes/', views_cobros.lista_cobros_pendientes, name='lista_cobros'),
    path('cobro/<int:venta_id>/', views_cobros.detalle_cobro_pendiente, name='detalle_cobro'),
    path('venta-libre/', views_cobros.crear_venta_libre_view, name='crear_venta_libre'),
    path('venta/<int:venta_id>/confirmar-pago/', views_cobros.confirmar_pago_venta, name='confirmar_pago'),
    path('sesion/<int:sesion_id>/reporte/', views_cobros.ver_reporte_sesion, name='reporte_sesion'),
    path('historial/', views_cobros.historial_sesiones, name='historial_sesiones'),
    
    # APIs
    path('api/paciente/', views_cobros.buscar_paciente, name='api_buscar_paciente'),
    path('api/servicio/', views_cobros.buscar_servicio, name='api_buscar_servicio'),
    path('api/insumo/', views_cobros.buscar_insumo, name='api_buscar_insumo'),
]
```

### 3. Agregar al Admin (opcional)

En `caja/admin.py`:

```python
from .models import SesionCaja, Venta, DetalleVenta, AuditoriaCaja

@admin.register(SesionCaja)
class SesionCajaAdmin(admin.ModelAdmin):
    list_display = ['fecha_apertura', 'usuario_apertura', 'esta_cerrada', 'monto_inicial', 'diferencia']
    list_filter = ['esta_cerrada', 'fecha_apertura']
    readonly_fields = ['monto_final_calculado', 'diferencia']

@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ['numero_venta', 'paciente', 'tipo_origen', 'estado', 'total', 'fecha_creacion']
    list_filter = ['estado', 'tipo_origen', 'fecha_creacion']
    search_fields = ['numero_venta', 'paciente__nombre']

@admin.register(DetalleVenta)
class DetalleVentaAdmin(admin.ModelAdmin):
    list_display = ['venta', 'tipo', 'descripcion', 'cantidad', 'subtotal']
    list_filter = ['tipo', 'stock_descontado']

@admin.register(AuditoriaCaja)
class AuditoriaCajaAdmin(admin.ModelAdmin):
    list_display = ['fecha', 'usuario', 'accion', 'venta', 'descripcion']
    list_filter = ['accion', 'fecha']
    readonly_fields = ['fecha', 'datos_anteriores', 'datos_nuevos']
```

---

## 🧪 TESTING

### Test de Cálculo Automático

```python
def test_calculo_cantidad_insumos():
    from caja.services import calcular_cantidad_insumos
    from inventario.models import Insumo
    
    # Crear insumo de prueba
    insumo = Insumo.objects.create(
        medicamento='Vacuna Test',
        dosis_ml=0.5,
        ml_contenedor=10,
        stock_actual=100
    )
    
    # Calcular para paciente de 15 kg
    resultado = calcular_cantidad_insumos(insumo, peso_paciente=15, dosis_ml_por_kg=0.5)
    
    # Verificar
    assert resultado['calculo_automatico'] == True
    assert resultado['dosis_total_ml'] == 7.5
    assert resultado['cantidad'] == 1  # CEIL(7.5 / 10)
```

### Test de Descuento de Stock

```python
def test_descuento_stock_solo_al_pagar():
    from caja.services import crear_venta_libre, procesar_pago
    
    # Crear venta con insumo
    insumo = Insumo.objects.get(id=1)
    stock_inicial = insumo.stock_actual
    
    venta = crear_venta_libre(
        usuario=user,
        items_insumos=[{'insumo_id': insumo.id, 'cantidad': 2}]
    )
    
    # Verificar que NO se descontó al crear
    insumo.refresh_from_db()
    assert insumo.stock_actual == stock_inicial
    
    # Confirmar pago
    procesar_pago(venta, user, 'efectivo')
    
    # Verificar que AHORA sí se descontó
    insumo.refresh_from_db()
    assert insumo.stock_actual == stock_inicial - 2
```

---

## 📈 REPORTE DE AUDITORÍA

Todas las acciones quedan registradas en `AuditoriaCaja`:

```sql
SELECT 
    fecha,
    usuario.nombre,
    accion,
    descripcion,
    venta.numero_venta
FROM AuditoriaCaja
WHERE fecha >= '2024-12-12'
ORDER BY fecha DESC;
```

Acciones registradas:
- `crear_venta`
- `agregar_detalle`
- `eliminar_detalle`
- `modificar_detalle`
- `aplicar_descuento`
- `confirmar_pago`
- `cancelar_venta`
- `abrir_sesion`
- `cerrar_sesion`

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 1. Transacciones Atómicas
Todas las operaciones críticas usan `@transaction.atomic` para garantizar consistencia.

### 2. Stock Insuficiente
Si al confirmar un pago no hay stock suficiente:
- Se hace ROLLBACK completo
- No se confirma el pago
- El cobro sigue pendiente
- Se muestra error al usuario

### 3. Sesión Cerrada
No se puede confirmar pagos si la sesión está cerrada.

### 4. Cobros Pendientes al Cerrar
No se puede cerrar una sesión si hay cobros pendientes asociados a ella.

### 5. Cancelación de Ventas
Si se cancela una venta pagada, se reintegra el stock automáticamente.

---

## 🎓 CAPACITACIÓN DEL PERSONAL

### Para Veterinarios
1. Crear consultas/hospitalizaciones normalmente
2. Al agregar insumos, el sistema calcula automáticamente las cantidades
3. Si aparece "requiere confirmación", usar el botón para declarar cantidad manual
4. El cobro se genera automáticamente al guardar

### Para Recepción
1. Abrir caja al inicio del día con monto inicial
2. Ver cobros pendientes en el dashboard
3. Editar cobros si es necesario (agregar/quitar items)
4. Confirmar pagos (aquí se descuenta el stock)
5. Cerrar caja al final del día
6. Revisar reporte generado

### Para Administradores
1. Acceso completo a todos los reportes
2. Revisar auditoría para control de cambios
3. Verificar diferencias al cierre de caja
4. Generar reportes históricos

---

## 📝 PRÓXIMAS MEJORAS SUGERIDAS

1. **Impresión de Tickets/Boletas**
2. **Integración con Facturación Electrónica**
3. **Dashboard con Gráficos de Ventas**
4. **Alertas de Stock Bajo**
5. **Reportes Excel Exportables**
6. **App Móvil para Consulta de Cobros**

---

## 🆘 SOPORTE Y CONTACTO

Para dudas o problemas:
1. Revisar esta documentación
2. Verificar logs en `AuditoriaCaja`
3. Revisar consola del navegador (F12) para errores JS
4. Contactar al equipo de desarrollo

---

**Fecha de Creación**: 12 de Diciembre de 2024
**Versión del Sistema**: 1.0
**Estado**: Producción Ready ✅
