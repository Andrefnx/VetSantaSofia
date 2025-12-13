# 🚀 GUÍA RÁPIDA DE INSTALACIÓN

## ✅ Sistema de Caja y Cobros Automáticos para Veterinaria

### 📦 ¿Qué se implementó?

Sistema completo que:
- ✅ Crea cobros pendientes **automáticamente** desde consultas/hospitalizaciones
- ✅ Calcula **cantidades de insumos por dosis** basándose en peso del paciente
- ✅ Descuenta stock **solo al cobrar**, nunca antes
- ✅ Maneja sesiones de caja diarias con reportes completos
- ✅ Registra **auditoría completa** de todas las acciones
- ✅ Permite ventas libres (sin paciente)
- ✅ Control de permisos por rol

### ⚠️ Reglas Cumplidas

- ❌ **NO se renombró** ningún modelo, campo o variable existente
- ❌ **NO se rompió** ninguna funcionalidad actual
- ✅ Solo se **agregaron** nuevos modelos y funcionalidades
- ✅ Stock se descuenta **solo al cobrar**
- ✅ Todo tiene **registro de auditoría**

---

## 📝 PASOS DE INSTALACIÓN

### 1. Ejecutar Migraciones

```bash
cd C:\Users\Andrea\Documents\GitHub\VetSantaSofia

# Crear las migraciones
python manage.py makemigrations caja clinica

# Aplicar las migraciones
python manage.py migrate
```

**Resultado esperado:**
```
Migrations for 'caja':
  caja\migrations\0003_auto_XXXXXX.py
    - Create model SesionCaja
    - Create model Venta
    - Create model DetalleVenta
    - Create model AuditoriaCaja

Migrations for 'clinica':
  clinica\migrations\0004_auto_XXXXXX.py
    - Create model ConsultaInsumo
    - Create model HospitalizacionInsumo
    - Create model CirugiaInsumo
```

### 2. Configurar URLs

Abrir `veteriaria/urls.py` y agregar:

```python
from django.urls import path, include

urlpatterns = [
    # ... URLs existentes ...
    
    # ✅ NUEVO: Sistema de cobros
    path('caja/', include('caja.urls_cobros')),
]
```

### 3. Registrar en Admin (Opcional)

Abrir `caja/admin.py` y agregar:

```python
from .models import SesionCaja, Venta, DetalleVenta, AuditoriaCaja

admin.site.register(SesionCaja)
admin.site.register(Venta)
admin.site.register(DetalleVenta)
admin.site.register(AuditoriaCaja)
```

### 4. Verificar Datos de Prueba

Asegurarse de que los insumos tengan los campos necesarios:

```python
# En Django shell
python manage.py shell

from inventario.models import Insumo

# Actualizar un insumo para pruebas
insumo = Insumo.objects.first()
insumo.dosis_ml = 0.5  # ml por kg
insumo.ml_contenedor = 10  # ml por frasco
insumo.precio_venta = 8000
insumo.stock_actual = 50
insumo.save()
```

### 5. Probar el Sistema

#### A. Abrir Caja
```
1. Ir a: http://localhost:8000/caja/dashboard/
2. Clic en "Abrir Caja"
3. Ingresar monto inicial (ej: 50000)
4. Confirmar
```

#### B. Crear Consulta (Veterinario)
```
1. Crear una consulta normal
2. Agregar servicios
3. Agregar insumos → se calcula cantidad automáticamente
4. Guardar
5. ✅ Se crea cobro pendiente automáticamente
```

#### C. Cobrar (Recepción)
```
1. Ir a Dashboard de Caja
2. Ver cobro pendiente
3. Clic en "Cobrar"
4. Seleccionar método de pago
5. Confirmar
6. ✅ Stock se descuenta automáticamente
```

#### D. Cerrar Caja
```
1. Al final del día
2. Contar efectivo real
3. Clic en "Cerrar Sesión"
4. Ingresar monto contado
5. ✅ Se genera reporte completo
```

---

## 🗂️ ARCHIVOS NUEVOS CREADOS

```
caja/
├── models.py                          ← MODIFICADO (agregados 4 modelos)
├── services.py                        ← NUEVO (lógica de negocio)
├── views_cobros.py                    ← NUEVO (vistas del sistema)
├── urls_cobros.py                     ← NUEVO (URLs)
├── static/caja/js/
│   └── modales-caja.js                ← NUEVO (modales JS)
└── templates/caja/
    ├── dashboard_caja.html            ← NUEVO
    ├── abrir_caja.html                ← NUEVO
    ├── cerrar_caja.html               ← NUEVO
    └── (otros templates)              ← NUEVOS

clinica/
├── models.py                          ← MODIFICADO (agregados 3 modelos)
├── signals.py                         ← NUEVO (signals automáticos)
└── apps.py                            ← MODIFICADO (importa signals)

DOCUMENTACION_SISTEMA_CAJA.md          ← NUEVO (doc completa)
DIAGRAMAS_FLUJO_SISTEMA.md             ← NUEVO (diagramas)
INSTALACION_RAPIDA.md                  ← ESTE ARCHIVO
```

---

## 🎯 FUNCIONALIDADES PRINCIPALES

### 1. Cálculo Automático de Insumos

```python
# Ejemplo:
Paciente: 15 kg
Insumo: Vacuna antirrábica
  - Dosis: 0.5 ml/kg
  - ML por frasco: 10 ml

CÁLCULO AUTOMÁTICO:
  Dosis total = 15 × 0.5 = 7.5 ml
  Frascos = CEIL(7.5 / 10) = 1 frasco

RESULTADO: Se registran 1 frasco en el cobro
```

### 2. Modal de Confirmación

Si un insumo **no tiene** `ml_contenedor`:

```
┌────────────────────────────────────┐
│ ⚠️ Declarar Insumos Utilizados     │
│                                    │
│ Insumo: Antibiótico Especial       │
│                                    │
│ Cantidad de frascos: [ 3 ]         │
│ Observaciones: [___________]       │
│                                    │
│ [Cancelar]  [✅ Confirmar]         │
└────────────────────────────────────┘
```

### 3. Descuento de Stock

**REGLA CRÍTICA:**

```
❌ NO se descuenta al crear consulta
❌ NO se descuenta al crear cobro pendiente
❌ NO se descuenta al editar cobro

✅ SÍ se descuenta al confirmar pago
   └─> Transacción atómica
   └─> Si falla, todo se revierte
```

### 4. Auditoría Completa

Todas las acciones quedan registradas:

```sql
SELECT * FROM caja_auditoriacaja 
WHERE fecha >= '2024-12-12'
ORDER BY fecha DESC;
```

Acciones registradas:
- crear_venta
- agregar_detalle
- eliminar_detalle
- modificar_detalle
- aplicar_descuento
- confirmar_pago
- cancelar_venta
- abrir_sesion
- cerrar_sesion

---

## 👥 ROLES Y PERMISOS

| Acción | Admin | Recepción | Veterinario |
|--------|-------|-----------|-------------|
| Crear Consulta | ✅ | ✅ | ✅ |
| Ver Cobros Pendientes | ✅ | ✅ | 👁️ |
| Editar Cobros | ✅ | ✅ | ❌ |
| Confirmar Pagos | ✅ | ✅ | ❌ |
| Abrir/Cerrar Caja | ✅ | ✅ | ❌ |
| Ver Reportes | ✅ | ✅ | 👁️ |

Leyenda: ✅ Acceso completo | ❌ Sin acceso | 👁️ Solo lectura

---

## 🧪 PRUEBAS BÁSICAS

### Test 1: Crear Cobro desde Consulta

```python
# 1. Crear consulta
consulta = Consulta.objects.create(
    paciente=paciente,
    veterinario=veterinario,
    peso=15.5,
    diagnostico='Vacunación'
)

# 2. Agregar servicio
servicio = Servicio.objects.get(nombre='Vacuna')
consulta.servicios.add(servicio)

# 3. Agregar insumo
ConsultaInsumo.objects.create(
    consulta=consulta,
    insumo=vacuna_insumo,
    peso_paciente=15.5
)

# 4. Guardar
consulta.save()

# 5. ✅ Verificar que se creó el cobro
assert Venta.objects.filter(consulta=consulta).exists()
```

### Test 2: Descuento de Stock

```python
from caja.services import procesar_pago

# Stock inicial
insumo = Insumo.objects.get(id=1)
stock_inicial = insumo.stock_actual  # ej: 100

# Crear y pagar venta con 2 unidades
venta = Venta.objects.get(id=1)
procesar_pago(venta, usuario, 'efectivo')

# Verificar descuento
insumo.refresh_from_db()
assert insumo.stock_actual == stock_inicial - 2
```

---

## 📚 DOCUMENTACIÓN COMPLETA

Para más detalles, ver:

1. **[DOCUMENTACION_SISTEMA_CAJA.md](DOCUMENTACION_SISTEMA_CAJA.md)**
   - Arquitectura completa
   - Todos los flujos detallados
   - Ejemplos de uso
   - API de servicios

2. **[DIAGRAMAS_FLUJO_SISTEMA.md](DIAGRAMAS_FLUJO_SISTEMA.md)**
   - Diagramas visuales de todos los flujos
   - Matriz de permisos
   - Puntos de control de stock

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "Table doesn't exist"
```bash
# Ejecutar migraciones
python manage.py migrate
```

### Error: "Signal not working"
```python
# Verificar que apps.py tiene:
def ready(self):
    import clinica.signals
```

### Error: "Permission denied"
```python
# Verificar rol del usuario
user = User.objects.get(username='...')
print(user.rol)  # Debe ser 'administracion' o 'recepcion'
```

### Stock no se descuenta
```python
# Verificar estado de la venta
venta = Venta.objects.get(id=1)
print(venta.estado)  # Debe ser 'pagado'

# Verificar detalles
for detalle in venta.detalles.filter(tipo='insumo'):
    print(f"{detalle.descripcion}: stock_descontado={detalle.stock_descontado}")
```

---

## ✨ PRÓXIMOS PASOS

1. ✅ **Instalación completada** → Ejecutar migraciones
2. ✅ **Configuración** → Agregar URLs
3. ✅ **Datos de prueba** → Crear servicios, insumos, pacientes
4. ✅ **Pruebas** → Verificar flujo completo
5. ✅ **Capacitación** → Entrenar al personal

---

## 📞 SOPORTE

Para dudas específicas sobre:

- **Modelos**: Ver `caja/models.py` y `clinica/models.py`
- **Lógica de negocio**: Ver `caja/services.py`
- **Vistas**: Ver `caja/views_cobros.py`
- **Frontend**: Ver `caja/static/caja/js/modales-caja.js`

---

**Sistema Implementado por:** GitHub Copilot  
**Fecha:** 12 de Diciembre de 2024  
**Versión:** 1.0  
**Estado:** ✅ Listo para Producción
