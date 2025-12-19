# MODELO DE DATOS Y BASE DE DATOS

## Diseño, Estructura y Estrategias de Persistencia

---

## 1. MOTOR DE BASE DE DATOS

### 1.1 Dual Database Strategy

El sistema implementa una **estrategia de doble motor** según el entorno de ejecución:

**Desarrollo Local: SQLite 3**
- Motor de base de datos embebido, sin servidor independiente
- Almacenamiento en archivo único: `db.sqlite3`
- Configuración en `settings.py`:
  ```python
  DATABASES = {
      'default': {
          'ENGINE': 'django.db.backends.sqlite3',
          'NAME': BASE_DIR / 'db.sqlite3',
      }
  }
  ```

**Ventajas técnicas en desarrollo**:
- **Zero-configuration**: No requiere instalación ni configuración de servidor de base de datos
- **Portabilidad**: Base de datos completa en un archivo portable
- **Debugging simplificado**: Inspección directa con SQLite Browser o CLI
- **Velocidad en desarrollo**: Sin overhead de red ni autenticación

**Limitaciones conocidas**:
- **Concurrencia limitada**: Bloqueo de tabla completa en escrituras simultáneas
- **Tipo system más débil**: Conversión de tipos más permisiva que PostgreSQL
- **Sin capacidades avanzadas**: No soporta full-text search, arrays, JSON operators avanzados

**Producción: PostgreSQL 12+**
- Sistema de gestión de base de datos relacional cliente-servidor
- Configuración en `settings_production.py`:
  ```python
  DATABASES = {
      'default': {
          'ENGINE': 'django.db.backends.postgresql',
          'NAME': 'veterinaria_db',
          'USER': 'veterinaria_user',
          'PASSWORD': os.environ.get('DB_PASSWORD'),
          'HOST': 'localhost',
          'PORT': '5432',
          'CONN_MAX_AGE': 600,  # Connection pooling
      }
  }
  ```

**Ventajas técnicas en producción**:
- **Concurrencia MVCC**: Multi-Version Concurrency Control permite lecturas sin bloqueos durante escrituras
- **Transacciones ACID robustas**: Implementación completa de estándares ACID
- **Tipos de datos avanzados**: JSON, ARRAY, HSTORE, UUID, full-text search
- **Performance en escala**: Optimizador de queries sofisticado, índices avanzados (GiST, GIN)
- **Integridad referencial estricta**: Enforcement automático de constraints y foreign keys
- **Backups y replicación**: Herramientas nativas (pg_dump, pg_restore, streaming replication)

### 1.2 Justificación Técnica de PostgreSQL en Producción

**Requerimientos que exigen PostgreSQL**:

**Transacciones complejas**: Operaciones como confirmar venta (actualizar caja + descontar inventario + registrar historial) requieren transaccionalidad fuerte con aislamiento serializable.

**Concurrencia real**: Múltiples usuarios simultáneos (recepcionistas, veterinarios, administradores) ejecutando operaciones de lectura/escritura sin bloqueos globales.

**JSONField nativo**: El modelo `RegistroHistorico` utiliza `JSONField` para almacenar datos_cambio estructurados. PostgreSQL provee operadores nativos para queries sobre JSON (`->`, `->>`, `@>`, `?`).

**Constraints a nivel de base de datos**: Unique constraints compuestos, check constraints, foreign key constraints con ON DELETE configurables son críticos para integridad.

**Escalabilidad vertical y horizontal**: PostgreSQL permite escalar verticalmente (más recursos) y horizontalmente (read replicas) sin cambios arquitectónicos.

---

## 2. ORM: DJANGO OBJECT-RELATIONAL MAPPING

### 2.1 Abstracción y Mapeo Objeto-Relacional

Django ORM abstrae SQL mediante clases Python que representan tablas y relaciones:

**Definición de Modelo**:
```python
class Insumo(models.Model):
    idInventario = models.AutoField(primary_key=True)
    medicamento = models.CharField(max_length=255)
    stock_actual = models.IntegerField(default=0)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    archivado = models.BooleanField(default=False)
    usuario_ultimo_movimiento = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True
    )
    
    class Meta:
        db_table = 'inventario'
        ordering = ['medicamento']
```

**Equivalente SQL generado**:
```sql
CREATE TABLE inventario (
    idInventario SERIAL PRIMARY KEY,
    medicamento VARCHAR(255) NOT NULL,
    stock_actual INTEGER DEFAULT 0 NOT NULL,
    precio_venta NUMERIC(10, 2),
    archivado BOOLEAN DEFAULT FALSE NOT NULL,
    usuario_ultimo_movimiento_id INTEGER REFERENCES cuentas_customuser(id) ON DELETE SET NULL,
    CONSTRAINT inventario_pkey PRIMARY KEY (idInventario)
);
CREATE INDEX inventario_medicamento_idx ON inventario(medicamento);
```

### 2.2 Ventajas del ORM

**Portabilidad de código**: Mismo código Python funciona en SQLite (desarrollo) y PostgreSQL (producción) sin modificaciones.

**Prevención de SQL Injection**: Todas las queries son parametrizadas automáticamente:
```python
# Seguro - parametrizado automáticamente
Insumo.objects.filter(medicamento__icontains=user_input)

# Inseguro - SQL directo (evitado)
# cursor.execute(f"SELECT * FROM inventario WHERE medicamento LIKE '%{user_input}%'")
```

**Lazy evaluation**: Queries no se ejecutan hasta que se itera sobre resultados, permitiendo composición eficiente:
```python
# NO ejecuta query aún
qs = Insumo.objects.filter(archivado=False)
qs = qs.filter(stock_actual__lt=models.F('stock_minimo'))
qs = qs.order_by('medicamento')

# Ejecuta UNA SOLA query aquí
insumos_bajo_stock = list(qs)  # SELECT ... WHERE archivado=False AND stock_actual < stock_minimo ORDER BY medicamento
```

**Prevención de N+1 Problem**: Métodos `.select_related()` y `.prefetch_related()` optimizan queries con JOINs:
```python
# MAL - N+1 queries
ventas = Venta.objects.all()
for venta in ventas:
    print(venta.paciente.nombre)  # Query adicional por cada venta

# BIEN - 1 query con JOIN
ventas = Venta.objects.select_related('paciente').all()
for venta in ventas:
    print(venta.paciente.nombre)  # Sin query adicional
```

**Transacciones declarativas**:
```python
from django.db import transaction

@transaction.atomic
def confirmar_pago_y_descontar_stock(venta):
    # Si alguna operación falla, TODA la transacción se revierte
    venta.estado = 'pagado'
    venta.save()
    
    for detalle in venta.detalles.all():
        descontar_stock_insumo(detalle)
    
    registrar_en_historial(venta)
    # Commit automático si todo tuvo éxito
```

### 2.3 Limitaciones del ORM y Uso de Raw SQL

**Queries complejas con subqueries o window functions** no son expresables naturalmente en ORM. En esos casos, se usa raw SQL:

```python
from django.db import connection

def obtener_ventas_con_ranking():
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                v.numero_venta,
                v.total,
                RANK() OVER (PARTITION BY v.sesion_id ORDER BY v.total DESC) as ranking
            FROM caja_venta v
            WHERE v.estado = 'pagado'
        """)
        return cursor.fetchall()
```

**Trade-off aceptado**: Se pierde abstracción de base de datos, pero se gana expresividad. Estos casos son minoritarios y se documentan explícitamente.

---

## 3. TIPOS DE RELACIONES ENTRE MODELOS

### 3.1 Relación Uno a Muchos (ForeignKey)

**Implementación más común**. Una entidad "padre" puede tener múltiples "hijos", pero cada hijo pertenece a un solo padre.

**Ejemplo 1: Propietario → Pacientes**
```python
class Propietario(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)

class Paciente(models.Model):
    nombre = models.CharField(max_length=100)
    propietario = models.ForeignKey(
        Propietario, 
        on_delete=models.CASCADE,
        related_name='mascotas'
    )
```

**Resultado**:
- Un propietario puede tener múltiples mascotas: `propietario.mascotas.all()`
- Cada mascota tiene un solo propietario: `paciente.propietario`
- A nivel SQL: columna `propietario_id` en tabla `pacientes_paciente` con FOREIGN KEY a `pacientes_propietario.id`

**Ejemplo 2: Sesión de Caja → Ventas**
```python
class SesionCaja(models.Model):
    fecha_apertura = models.DateTimeField()
    esta_cerrada = models.BooleanField(default=False)

class Venta(models.Model):
    sesion = models.ForeignKey(
        SesionCaja, 
        on_delete=models.PROTECT,
        related_name='ventas'
    )
```

**Uso**:
- Todas las ventas de una sesión: `sesion.ventas.all()`
- Sesión de una venta específica: `venta.sesion`

### 3.2 Relación Uno a Uno (OneToOneField)

**Usado cuando dos entidades tienen relación 1:1 exclusiva**.

**Ejemplo: Venta ↔ Consulta**
```python
class Consulta(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE)
    motivo = models.TextField()

class Venta(models.Model):
    consulta = models.OneToOneField(
        'clinica.Consulta',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='venta'
    )
```

**Características**:
- Una consulta genera exactamente una venta: `consulta.venta`
- Una venta puede estar asociada a máximo una consulta: `venta.consulta`
- A nivel SQL: `consulta_id` en `caja_venta` con UNIQUE constraint

**Justificación**: Separar el registro clínico (consulta) del registro financiero (venta) permite que cada módulo gestione sus datos independientemente, pero mantienen vínculo directo para trazabilidad.

### 3.3 Relación Muchos a Muchos (ManyToManyField)

**Usado cuando ambas entidades pueden relacionarse con múltiples instancias de la otra**.

**Ejemplo: Servicio ↔ Insumos (con tabla intermedia explícita)**
```python
class Servicio(models.Model):
    nombre = models.CharField(max_length=150)
    precio = models.PositiveIntegerField()

class ServicioInsumo(models.Model):
    """Tabla intermedia que define qué insumos utiliza cada servicio"""
    servicio = models.ForeignKey(
        Servicio, 
        on_delete=models.CASCADE,
        related_name='insumos_requeridos'
    )
    insumo = models.ForeignKey(
        Insumo,
        on_delete=models.CASCADE,
        related_name='servicios_relacionados'
    )
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    es_opcional = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['servicio', 'insumo']
```

**Uso**:
- Insumos de un servicio: `servicio.insumos_requeridos.all()`
- Servicios que usan un insumo: `insumo.servicios_relacionados.all()`

**Nota técnica**: Se usa tabla intermedia explícita (`ServicioInsumo`) en lugar de `ManyToManyField` automático porque necesitamos campos adicionales (`cantidad`, `es_opcional`). Esto se conoce como **modelo through**.

---

## 4. INTEGRIDAD REFERENCIAL

### 4.1 Enforcement de Constraints

Django ORM + PostgreSQL garantizan integridad referencial mediante constraints a nivel de base de datos:

**Primary Keys**: Cada modelo tiene primary key implícita (`id`) o explícita (`idInventario = models.AutoField(primary_key=True)`). PostgreSQL garantiza unicidad mediante UNIQUE constraint.

**Foreign Keys**: Todas las `ForeignKey` generan constraints `FOREIGN KEY` en PostgreSQL que previenen:
- Insertar registro con FK que apunta a registro inexistente
- Eliminar registro padre si existen hijos (depende de `on_delete`)

**Unique Constraints**:
```python
class Propietario(models.Model):
    email = models.EmailField(blank=True, null=True)
    
    def clean(self):
        # Validación adicional: unique case-insensitive
        if self.email:
            qs = Propietario.objects.filter(email__iexact=self.email)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError({'email': 'Email ya registrado'})
```

PostgreSQL ejecuta: `CREATE UNIQUE INDEX ON propietario(email)`.

**Unique Together**:
```python
class ServicioInsumo(models.Model):
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE)
    insumo = models.ForeignKey(Insumo, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ['servicio', 'insumo']
```

SQL: `CREATE UNIQUE INDEX ON servicios_servicioinsumo(servicio_id, insumo_id)`.

**Check Constraints**: Django 2.2+ permite `CheckConstraint`:
```python
class HorarioFijoVeterinario(models.Model):
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(hora_fin__gt=models.F('hora_inicio')),
                name='hora_fin_mayor_que_inicio'
            )
        ]
```

SQL: `ALTER TABLE agenda_horariofijoveterinario ADD CONSTRAINT hora_fin_mayor_que_inicio CHECK (hora_fin > hora_inicio)`.

### 4.2 Validación en Dos Niveles

**Nivel 1: Aplicación (Django)**
- Método `clean()` en modelos ejecuta validaciones personalizadas
- `full_clean()` valida tipos, max_length, choices, constraints
- Se ejecuta automáticamente en forms, pero NO en `objects.create()` directo

**Nivel 2: Base de Datos (PostgreSQL)**
- Constraints (UNIQUE, FOREIGN KEY, CHECK) se ejecutan SIEMPRE
- No se pueden omitir ni desactivar (salvo temporalmente con triggers)
- Son el **último bastión** de integridad

**Ejemplo de validación en ambos niveles**:
```python
class Propietario(models.Model):
    def clean(self):
        # Validación en aplicación (nivel 1)
        if self.telefono and Propietario.objects.filter(telefono__iexact=self.telefono).exclude(pk=self.pk).exists():
            raise ValidationError('Teléfono duplicado')
    
    def save(self, *args, **kwargs):
        self.full_clean()  # Ejecuta validaciones antes de save
        super().save(*args, **kwargs)  # PostgreSQL ejecuta constraints (nivel 2)
```

---

## 5. MANEJO DE CLAVES FORÁNEAS Y ON_DELETE

### 5.1 Estrategias de on_delete

Django permite configurar comportamiento cuando se elimina un registro referenciado por foreign key:

#### 5.1.1 CASCADE - Eliminación en Cascada
```python
class Paciente(models.Model):
    propietario = models.ForeignKey(Propietario, on_delete=models.CASCADE)
```

**Comportamiento**: Si se elimina un `Propietario`, **todos sus pacientes se eliminan automáticamente**.

**Uso apropiado**: Cuando la entidad hija no tiene sentido sin el padre. Ejemplo: Si eliminamos un propietario, sus mascotas quedan huérfanas y deben eliminarse.

**SQL equivalente**: `FOREIGN KEY ... ON DELETE CASCADE`

#### 5.1.2 PROTECT - Prevención de Eliminación
```python
class Venta(models.Model):
    sesion = models.ForeignKey(SesionCaja, on_delete=models.PROTECT)
    paciente = models.ForeignKey(Paciente, on_delete=models.PROTECT)
```

**Comportamiento**: **Impide eliminar** el registro padre si existen hijos. Django lanza `ProtectedError`.

**Uso apropiado**: Cuando la eliminación del padre comprometería integridad de datos críticos. Ejemplo: No se puede eliminar una sesión de caja si tiene ventas asociadas (pérdida de auditoría financiera). No se puede eliminar un paciente con ventas históricas.

**SQL equivalente**: `FOREIGN KEY ... ON DELETE RESTRICT`

#### 5.1.3 SET_NULL - Establecer a NULL
```python
class Insumo(models.Model):
    usuario_ultimo_movimiento = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
```

**Comportamiento**: Si se elimina el usuario, `usuario_ultimo_movimiento` se establece a `NULL` (no se elimina el insumo).

**Uso apropiado**: Cuando la relación es informativa pero no crítica. Ejemplo: Si un usuario que modificó un insumo deja la empresa y se elimina, el insumo se conserva pero pierde referencia al usuario.

**Requisito**: El campo **debe permitir null** (`null=True`).

**SQL equivalente**: `FOREIGN KEY ... ON DELETE SET NULL`

#### 5.1.4 SET_DEFAULT - Establecer a Valor por Defecto
```python
class Consulta(models.Model):
    veterinario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_DEFAULT,
        default=1  # ID de usuario "Sin Asignar"
    )
```

**Comportamiento**: Si se elimina el veterinario, se asigna el usuario por defecto (ID 1).

**Uso apropiado**: Cuando se requiere mantener el registro pero con referencia genérica. Requiere que exista un registro "placeholder".

#### 5.1.5 DO_NOTHING - Sin Acción (Peligroso)
```python
models.ForeignKey(Parent, on_delete=models.DO_NOTHING)
```

**Comportamiento**: Django no hace nada. PostgreSQL ejecutará su comportamiento por defecto (usualmente error).

**Uso apropiado**: Raramente usado. Solo cuando se maneja eliminación con lógica custom en signals o triggers de base de datos.

**Riesgo**: Puede dejar FKs apuntando a registros inexistentes (violación de integridad).

### 5.2 Elección de Estrategia en VetSantaSofia

| Relación | on_delete | Justificación |
|----------|-----------|---------------|
| Paciente → Propietario | CASCADE | Mascota sin dueño no tiene sentido |
| Venta → Paciente | PROTECT | Historial financiero no puede perderse |
| Venta → SesionCaja | PROTECT | Auditoría de caja es crítica |
| Insumo → Usuario | SET_NULL | Trazabilidad deseable pero no crítica |
| DetalleVenta → Venta | CASCADE | Detalle sin venta no tiene sentido |
| Consulta → Paciente | CASCADE | Historial clínico ligado al paciente |

**Principio de diseño**: **PROTECT por defecto para datos transaccionales/históricos**, CASCADE para dependencias estrictas, SET_NULL para referencias informativas.

---

## 6. SOFT DELETE VS HARD DELETE

### 6.1 Hard Delete - Eliminación Física

**Definición**: Eliminación definitiva del registro de la base de datos mediante `DELETE` SQL.

```python
insumo = Insumo.objects.get(id=123)
insumo.delete()  # DELETE FROM inventario WHERE id=123
```

**Características**:
- Registro desaparece permanentemente de la tabla
- Recuperación solo mediante backups
- Libera espacio en disco inmediatamente
- Triggers on_delete ejecutan cascadas

**Riesgos**:
- **Pérdida de datos históricos**: Reportes que referencian el registro fallan
- **Inconsistencias en auditoría**: Historial queda con referencias a registros inexistentes
- **Violación de compliance**: Regulaciones pueden requerir retención de datos

### 6.2 Soft Delete - Eliminación Lógica

**Definición**: Registro se **marca como inactivo** mediante flag booleano, pero permanece en la base de datos.

```python
class Insumo(models.Model):
    archivado = models.BooleanField(default=False)
    
insumo = Insumo.objects.get(id=123)
insumo.archivado = True
insumo.save()  # UPDATE inventario SET archivado=True WHERE id=123
```

**Características**:
- Registro persiste físicamente en la tabla
- Queries filtran automáticamente registros archivados
- Recuperación inmediata (cambiar flag a False)
- Historial y relaciones permanecen intactos

**Ventajas**:
- **Auditoría completa**: Reportes históricos funcionan correctamente
- **Recuperación sin backups**: Desarchivado instantáneo
- **Compliance regulatorio**: Retención de datos garantizada
- **Análisis histórico**: Estadísticas incluyen datos "eliminados"

**Desventajas**:
- **Consumo de espacio**: Registros inactivos ocupan disco
- **Performance**: Queries deben filtrar `WHERE archivado=False` siempre
- **Complejidad en queries**: Desarrolladores deben recordar filtrar activos

### 6.3 Implementación de Soft Delete en VetSantaSofia

**Modelo Insumo**:
```python
class Insumo(models.Model):
    archivado = models.BooleanField(
        default=False,
        help_text="Producto archivado (no se muestra en listado activo)"
    )
```

**Queries en views**:
```python
# Listar solo insumos activos (comportamiento por defecto)
insumos_activos = Insumo.objects.filter(archivado=False)

# Incluir archivados explícitamente (reportes históricos)
todos_insumos = Insumo.objects.all()
```

**Modelo Servicio**:
```python
class Servicio(models.Model):
    activo = models.BooleanField(
        default=True,
        verbose_name="Activo",
        help_text="Permite desactivación lógica en lugar de eliminación física"
    )
```

**Documentación en código**:
El modelo `Servicio` incluye docstring extenso explicando por qué NO se deben eliminar servicios físicamente:

```python
"""
⚠️ ADVERTENCIA SOBRE ELIMINACIÓN DE SERVICIOS:

Eliminar servicios es una operación PELIGROSA y debe evitarse.

IMPACTO DE ELIMINAR SERVICIOS:
- Los servicios están referenciados por múltiples módulos: agenda, clínica y caja
- Aunque las ventas históricas son seguras (precio se copia al momento de venta),
  la eliminación puede afectar reportes futuros y consultas de referencias
- Se pierden datos valiosos para auditorías

RECOMENDACIÓN FUERTE:
✅ PREFERIR DESACTIVACIÓN LÓGICA sobre eliminación física
✅ Implementar campo 'activo' para marcar servicios como inactivos
✅ Mantener historial completo para reportes
"""
```

**Modelo Paciente**:
```python
class Paciente(models.Model):
    activo = models.BooleanField(default=True)
```

### 6.4 Estrategia Híbrida: Cuándo Usar Cada Método

| Entidad | Estrategia | Justificación |
|---------|------------|---------------|
| **Insumo** | Soft Delete (archivado) | Historial de movimientos debe preservarse |
| **Servicio** | Soft Delete (activo) | Ventas históricas referencian servicios |
| **Paciente** | Soft Delete (activo) | Historial clínico y ventas deben persistir |
| **Propietario** | Soft Delete (implícito via Paciente) | Datos personales en historial |
| **Venta** | Hard Delete (solo cancelación) | Se marca estado='cancelado', no se elimina |
| **RegistroHistorico** | **NUNCA eliminado** (append-only) | Auditoría inmutable |
| **DetalleVenta** | Hard Delete via CASCADE | Sin valor sin venta padre |
| **HorarioFijoVeterinario** | Hard Delete | Configuración sin impacto en historial |

**Principio general**: **Soft delete para entidades transaccionales o con historial**, hard delete para configuraciones y relaciones dependientes.

---

## 7. MANEJO DE HISTORIALES Y AUDITORÍA

### 7.1 Arquitectura de Auditoría: Dual Strategy

El sistema implementa **dos niveles complementarios** de trazabilidad:

#### 7.1.1 Nivel 1: Campos de Trazabilidad Rápida (En Cada Modelo)

Cada modelo crítico incluye campos que registran el **último cambio**:

```python
class Insumo(models.Model):
    # ... campos de datos ...
    
    # Trazabilidad rápida
    ultimo_movimiento = models.DateTimeField(null=True, blank=True)
    tipo_ultimo_movimiento = models.CharField(max_length=30, null=True, blank=True)
    usuario_ultimo_movimiento = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
```

**Propósito**:
- **Performance**: Consultar último movimiento sin JOIN a tabla de historial
- **UI inmediata**: Mostrar "Última modificación: 19/12/2025 por Andrea" sin queries adicionales
- **Filtrado rápido**: `Insumo.objects.filter(tipo_ultimo_movimiento='salida_stock')`

**Limitación**: Solo registra **último** cambio, no historial completo.

#### 7.1.2 Nivel 2: Historial Centralizado (Tabla RegistroHistorico)

**Modelo append-only** que registra **todos los cambios** de todas las entidades críticas:

```python
class RegistroHistorico(models.Model):
    """
    CARACTERÍSTICAS:
    - Append-only: Los registros NUNCA se editan ni eliminan
    - Sin GenericForeignKey: Usa entidad + objeto_id para flexibilidad
    - Datos estructurados en JSONField para análisis posterior
    """
    
    fecha_evento = models.DateTimeField(default=timezone.now, db_index=True)
    entidad = models.CharField(max_length=20, choices=ENTIDAD_CHOICES, db_index=True)
    objeto_id = models.PositiveIntegerField(db_index=True)
    tipo_evento = models.CharField(max_length=50, choices=TIPO_EVENTO_CHOICES)
    
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    descripcion = models.TextField()
    datos_cambio = models.JSONField(null=True, blank=True)
    
    criticidad = models.CharField(max_length=10, choices=CRITICIDAD_CHOICES, default='media')
    modulo_origen = models.CharField(max_length=50, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
```

**Propósito**:
- **Auditoría completa**: Cada modificación queda registrada permanentemente
- **Compliance regulatorio**: Trazabilidad de medicamentos controlados
- **Análisis histórico**: "¿Cuántas veces se modificó el precio del insumo X?"
- **Forense**: "¿Quién cambió el stock de este medicamento el 15 de diciembre?"

### 7.2 Sincronización Automática mediante Signals

El sistema usa **Django signals** para registrar automáticamente en historial cuando ocurren cambios:

```python
# inventario/signals.py

@receiver(pre_save, sender=Insumo)
def insumo_pre_save(sender, instance, **kwargs):
    """Captura estado anterior antes de guardar"""
    if instance.pk:
        try:
            anterior = Insumo.objects.get(pk=instance.pk)
            _insumo_anterior[instance.pk] = {
                'stock_actual': anterior.stock_actual,
                'precio_venta': anterior.precio_venta,
                # ... otros campos
            }
        except Insumo.DoesNotExist:
            pass

@receiver(post_save, sender=Insumo)
def insumo_post_save(sender, instance, created, **kwargs):
    """Registra el cambio en historial después de guardar exitosamente"""
    usuario = get_current_user()  # Obtenido de thread-local via middleware
    
    if created:
        # Registro de creación
        registrar_creacion(
            entidad='inventario',
            objeto_id=instance.pk,
            usuario=usuario,
            descripcion=f"Insumo '{instance.medicamento}' creado"
        )
    else:
        # Detectar tipo de cambio comparando con estado anterior
        anterior = _insumo_anterior.get(instance.pk, {})
        
        if instance.tipo_ultimo_movimiento == 'salida_stock':
            registrar_cambio_stock(
                entidad='inventario',
                objeto_id=instance.pk,
                usuario=usuario,
                stock_anterior=anterior.get('stock_actual'),
                stock_nuevo=instance.stock_actual,
                tipo_movimiento='salida_stock'
            )
        elif anterior.get('precio_venta') != instance.precio_venta:
            registrar_cambio_precio(
                entidad='inventario',
                objeto_id=instance.pk,
                usuario=usuario,
                precio_anterior=anterior.get('precio_venta'),
                precio_nuevo=instance.precio_venta
            )
```

**Flujo completo**:
1. Usuario confirma pago en caja
2. `descontar_stock_insumo()` actualiza `insumo.stock_actual` y establece `tipo_ultimo_movimiento='salida_stock'`
3. `insumo.save()` dispara `pre_save` (captura estado anterior) y `post_save`
4. Signal detecta `tipo_ultimo_movimiento='salida_stock'` y llama `registrar_cambio_stock()`
5. `RegistroHistorico` se crea automáticamente con usuario obtenido de middleware
6. **Todo ocurre en una transacción**: Si falla el registro de historial, el save se revierte

### 7.3 Captura de Usuario via Middleware

**Problema**: Los signals no reciben el usuario que realiza la acción directamente. Pasarlo explícitamente requeriría modificar todos los `.save()` del código.

**Solución**: Middleware que captura el usuario del request y lo almacena en **thread-local storage**:

```python
# historial/middleware.py

from threading import local

_thread_locals = local()

def get_current_user():
    """Obtiene el usuario actual del thread local"""
    return getattr(_thread_locals, 'user', None)

class CurrentUserMiddleware:
    def __call__(self, request):
        # Almacenar usuario del request en thread-local
        if hasattr(request, 'user') and request.user.is_authenticated:
            _thread_locals.user = request.user
        else:
            _thread_locals.user = None
        
        response = self.get_response(request)
        
        # Limpiar después de procesar
        _thread_locals.user = None
        return response
```

**Ventajas**:
- **Transparente**: Código de negocio no necesita pasar usuario explícitamente
- **Thread-safe**: Cada request HTTP ejecuta en su thread, evitando colisiones
- **Sin acoplamiento**: Signals acceden al usuario sin importar de qué módulo

**Limitación**: No funciona para comandos de management o scripts. En esos casos, el usuario debe establecerse manualmente:
```python
from historial.middleware import set_current_user

# En comando de management
user = User.objects.get(username='admin')
set_current_user(user)
# ... operaciones que disparan signals ...
```

### 7.4 Estructura de datos_cambio (JSONField)

El campo `datos_cambio` almacena información estructurada sobre el cambio:

**Ejemplo 1: Cambio de stock**
```json
{
    "stock_anterior": 10,
    "stock_nuevo": 7,
    "cantidad_descontada": 3,
    "venta_numero": "V20251219-0042",
    "paciente_nombre": "Luna"
}
```

**Ejemplo 2: Cambio de precio**
```json
{
    "precio_anterior": "15000.00",
    "precio_nuevo": "18000.00",
    "porcentaje_cambio": 20.0,
    "razon": "Actualización proveedor"
}
```

**Ejemplo 3: Modificación de información**
```json
{
    "campos_modificados": ["marca", "descripcion"],
    "marca": {"anterior": "MarcaA", "nuevo": "MarcaB"},
    "descripcion": {"anterior": "Desc antigua", "nuevo": "Desc nueva"}
}
```

**Ventajas de JSONField**:
- **Flexibilidad**: Cada tipo de evento puede tener campos específicos sin modificar esquema
- **Queryable en PostgreSQL**: `RegistroHistorico.objects.filter(datos_cambio__stock_nuevo__lt=5)`
- **Análisis programático**: Parseo directo a dict Python

---

## 8. CÓMO SE EVITA LA PÉRDIDA DE INFORMACIÓN

### 8.1 Estrategia Multi-Nivel de Preservación

#### 8.1.1 Nivel de Aplicación

**1. Soft Delete en Entidades Críticas**
- Insumos: `archivado=True` en lugar de `DELETE`
- Servicios: `activo=False` en lugar de `DELETE`
- Pacientes: `activo=False` en lugar de `DELETE`

**2. PROTECT en Foreign Keys Transaccionales**
```python
class Venta(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.PROTECT)
    sesion = models.ForeignKey(SesionCaja, on_delete=models.PROTECT)
```

Intentar eliminar paciente o sesión con ventas asociadas lanza `ProtectedError`, previniendo pérdida de datos.

**3. Copia de Datos Críticos al Momento de Transacción**
```python
class DetalleVenta(models.Model):
    # Referencias
    insumo = models.ForeignKey(Insumo, on_delete=models.PROTECT)
    
    # Datos COPIADOS al momento de venta (no se pierden si cambian en origen)
    descripcion_item = models.CharField(max_length=255)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
```

Si el precio del insumo cambia después, la venta histórica conserva el precio al que se vendió.

**4. Historial Append-Only Inmutable**
```python
class RegistroHistorico(models.Model):
    """
    REGLAS:
    - Los registros NUNCA se editan ni eliminan
    - No hay método update() ni delete() expuesto
    """
```

Sin métodos para modificar/eliminar, es imposible alterar historial desde aplicación.

#### 8.1.2 Nivel de Base de Datos

**1. Transacciones ACID**
```python
@transaction.atomic
def confirmar_pago_complejo(venta):
    # Si CUALQUIER paso falla, TODO se revierte
    venta.estado = 'pagado'
    venta.save()
    
    for detalle in venta.detalles.all():
        descontar_stock(detalle)
    
    registrar_historial(venta)
    # Commit solo si TODO tuvo éxito
```

PostgreSQL garantiza que o se ejecutan todos los pasos o ninguno, previniendo estados inconsistentes.

**2. Constraints de Integridad Referencial**
- `FOREIGN KEY` previene huérfanos: No se puede insertar `DetalleVenta` con `venta_id` inexistente
- `UNIQUE` previene duplicados: No se puede registrar dos propietarios con mismo email
- `CHECK` valida datos: No se puede insertar `hora_fin < hora_inicio`

**3. Migraciones Versionadas**
```bash
migrations/
  0001_initial.py
  0002_add_archivado_field.py
  0003_add_usuario_ultimo_movimiento.py
```

Cada cambio de esquema está documentado y versionado. Rollback es posible ejecutando migraciones inversas.

#### 8.1.3 Nivel de Infraestructura

**1. Backups Automáticos de Base de Datos**
```bash
# Backup diario con pg_dump
pg_dump -U veterinaria_user -d veterinaria_db > backup_$(date +%Y%m%d).sql

# Retención: 30 días de backups diarios, 12 meses de backups mensuales
```

**2. Archivos de Migración en Control de Versiones (Git)**

Todas las migraciones están en Git. Si un entorno está desincronizado, las migraciones lo restauran al esquema correcto:
```bash
git pull origin main
python manage.py migrate
```

**3. Logging de Operaciones Críticas**
```python
import logging

logger = logging.getLogger('caja')

def confirmar_pago(venta):
    logger.info(f"Confirmando pago de venta {venta.numero_venta} por usuario {venta.usuario_cobro}")
    # ... operación ...
    logger.info(f"Pago confirmado exitosamente. Total: ${venta.total}")
```

Logs persisten en archivos que no se modifican, permitiendo auditoría post-mortem.

### 8.2 Casos Específicos de Preservación

**Caso 1: Eliminación de Usuario**

Cuando un usuario deja la organización y debe eliminarse:
```python
# MAL - Pérdida de trazabilidad
usuario.delete()  # CASCADE eliminaría ventas, modificaciones, etc.

# BIEN - Preservar datos
usuario.is_active = False
usuario.save()

# Registros con FK tienen on_delete=SET_NULL
# Ej: Insumo.usuario_ultimo_movimiento → NULL (registro conservado)
# Ej: Venta.usuario_creacion → PROTECT (no se puede eliminar usuario con ventas)
```

**Caso 2: Archivado de Insumo**

Insumo descontinuado:
```python
# MAL - Pérdida de historial
insumo.delete()

# BIEN - Archivado lógico
insumo.archivado = True
insumo.tipo_ultimo_movimiento = 'modificacion_informacion'
insumo.save()  # Signal registra en historial

# Ventas históricas conservan referencia
# Reportes pueden incluir archivados explícitamente
```

**Caso 3: Cancelación de Venta**

Venta registrada por error debe revertirse:
```python
# MAL - Pérdida de trazabilidad
venta.delete()

# BIEN - Cambio de estado
venta.estado = 'cancelado'
venta.observaciones = f"Cancelado por {usuario}: {razon}"
venta.save()

# Revertir descuento de stock
for detalle in venta.detalles.all():
    reingresar_stock(detalle)

# Registrar en historial
RegistroHistorico.objects.create(
    entidad='venta',
    objeto_id=venta.id,
    tipo_evento='cancelacion',
    usuario=usuario,
    descripcion=f"Venta {venta.numero_venta} cancelada",
    criticidad='alta'
)
```

**Caso 4: Migración de Esquema con Datos Existentes**

Al agregar campo `NOT NULL` a tabla con datos:
```python
# migrations/0010_add_required_field.py

from django.db import migrations, models

def set_default_values(apps, schema_editor):
    """Poblar campo nuevo con valores por defecto"""
    Insumo = apps.get_model('inventario', 'Insumo')
    Insumo.objects.filter(categoria__isnull=True).update(categoria='general')

class Migration(migrations.Migration):
    operations = [
        # 1. Agregar campo nullable
        migrations.AddField('Insumo', 'categoria', models.CharField(null=True)),
        
        # 2. Poblar con valores
        migrations.RunPython(set_default_values),
        
        # 3. Hacer NOT NULL
        migrations.AlterField('Insumo', 'categoria', models.CharField(null=False)),
    ]
```

Esto evita que la migración falle con `NOT NULL constraint violation`.

### 8.3 Validación de Integridad Periódica

**Comando de management para verificar consistencia**:
```python
# management/commands/verificar_integridad.py

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        # 1. Ventas con paciente_id inexistente
        ventas_huerfanas = Venta.objects.filter(
            paciente__isnull=False
        ).exclude(
            paciente_id__in=Paciente.objects.values_list('id', flat=True)
        ).count()
        
        if ventas_huerfanas > 0:
            self.stdout.write(self.style.ERROR(
                f"CRÍTICO: {ventas_huerfanas} ventas con pacientes inexistentes"
            ))
        
        # 2. Historiales con usuario eliminado
        historiales_sin_usuario = RegistroHistorico.objects.filter(
            usuario__isnull=True
        ).count()
        
        self.stdout.write(
            f"INFO: {historiales_sin_usuario} registros de historial sin usuario"
        )
        
        # 3. Insumos con stock negativo
        insumos_negativos = Insumo.objects.filter(stock_actual__lt=0).count()
        
        if insumos_negativos > 0:
            self.stdout.write(self.style.ERROR(
                f"ERROR: {insumos_negativos} insumos con stock negativo"
            ))
```

Ejecutado periódicamente (cron job) para detectar inconsistencias antes de que causen problemas.

---

## 9. DIAGRAMA CONCEPTUAL DE RELACIONES

```
┌─────────────────┐
│  Propietario    │
│  (Dueño)        │
└────────┬────────┘
         │ 1:N (CASCADE)
         ▼
┌─────────────────┐        ┌──────────────────┐
│    Paciente     │◄───────│  CustomUser      │
│   (Mascota)     │ N:1    │  (Usuario)       │
└────────┬────────┘ PROTECT└──────────┬───────┘
         │                            │
         │ 1:N (CASCADE)              │ SET_NULL
         ▼                            ▼
┌─────────────────┐        ┌──────────────────┐
│    Consulta     │        │     Insumo       │
│                 │        │   (Inventario)   │
└────────┬────────┘        └────────┬─────────┘
         │ 1:1 (CASCADE)            │
         ▼                          │ N:M (through)
┌─────────────────┐                │
│      Venta      │◄───────────────┘
│   (Factura)     │        
└────────┬────────┘        
         │ 1:N (CASCADE)
         ▼
┌─────────────────┐
│  DetalleVenta   │
│  (Línea)        │
└─────────────────┘

┌──────────────────────┐
│ RegistroHistorico    │ ← Referencia todas las entidades
│ (Auditoría)          │   sin GenericForeignKey
└──────────────────────┘   entidad + objeto_id
```

---

## SÍNTESIS TÉCNICA

El modelo de datos de VetSantaSofia implementa:

**Motor dual**: SQLite (desarrollo) y PostgreSQL (producción) con código portable via ORM.

**Relaciones estrictas**: ForeignKey con on_delete configurado según criticidad (PROTECT para transaccionales, CASCADE para dependientes, SET_NULL para informativos).

**Integridad multi-nivel**: Validaciones en aplicación (Django `clean()`) + constraints en base de datos (FOREIGN KEY, UNIQUE, CHECK).

**Soft delete**: Entidades críticas (Insumo, Servicio, Paciente) usan flags booleanos en lugar de eliminación física, preservando historial y relaciones.

**Auditoría dual**: Campos de trazabilidad rápida en cada modelo + tabla centralizada append-only para historial completo.

**Sincronización automática**: Django signals registran cambios en historial sin código repetitivo en views, capturando usuario via thread-local middleware.

**Preservación de información**: Combinación de PROTECT en FKs, soft delete, copia de datos transaccionales, transacciones ACID, y backups periódicos garantiza que no se pierdan datos críticos.

Esta arquitectura prioriza **integridad de datos, auditoría completa y cumplimiento regulatorio** sobre optimización prematura, siendo apropiada para sistemas transaccionales con requerimientos de trazabilidad estrictos.

