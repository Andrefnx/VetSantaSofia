# ARQUITECTURA DEL SISTEMA

## VetSantaSofia - Diseño Arquitectónico y Organización Técnica

---

## 1. TIPO DE ARQUITECTURA IMPLEMENTADA

VetSantaSofia implementa una **arquitectura de tres capas (Three-Tier Architecture)** con separación explícita de responsabilidades, complementada por un **patrón de desacoplamiento basado en eventos (Event-Driven Architecture)** para coordinación entre módulos.

### 1.1 Clasificación Arquitectónica

**Arquitectura Monolítica Modular**: El sistema se despliega como una única aplicación, pero internamente está estructurado en módulos desacoplados que se comunican mediante interfaces definidas. Esta decisión contrasta con microservicios y responde a criterios de:

- **Simplicidad de despliegue**: Una sola instancia del servidor de aplicación
- **Transaccionalidad ACID**: Operaciones complejas que involucran múltiples entidades pueden ejecutarse como transacciones atómicas sin coordinación distribuida
- **Eficiencia operacional**: Menor overhead de comunicación entre módulos comparado con arquitecturas distribuidas
- **Suficiencia de escala**: Para el volumen esperado de operaciones en una clínica veterinaria (decenas de usuarios concurrentes, miles de transacciones diarias), un monolito modular es técnicamente adecuado

**Three-Tier Architecture**: Separación estricta entre:
- **Capa de Presentación**: Templates HTML con lógica de renderizado
- **Capa de Aplicación/Lógica de Negocio**: Modelos, servicios, signals y middleware
- **Capa de Persistencia**: Base de datos relacional con ORM como interfaz

**Event-Driven Components**: Utiliza el sistema de signals de Django para implementar comunicación asíncrona entre módulos, permitiendo que componentes reaccionen a eventos sin acoplamiento directo.

---

## 2. ORGANIZACIÓN DEL PROYECTO

### 2.1 Estructura de Aplicaciones Django

El proyecto se organiza en **13 aplicaciones Django independientes**, cada una encapsulando un dominio específico del negocio:

```
veteriaria/              # Aplicación raíz (configuración, URLs principales)
├── agenda/              # Gestión de citas y disponibilidad
├── caja/                # Transacciones, ventas, facturación
├── clinica/             # Procedimientos clínicos y atención
├── cuentas/             # Gestión de cuentas por cobrar
├── dashboard/           # Panel de control y métricas
├── historial/           # Sistema de auditoría centralizado
├── inventario/          # Gestión de insumos y stock
├── login/               # Autenticación y acceso
├── pacientes/           # Registro de mascotas y propietarios
├── reportes/            # Generación de reportes y análisis
└── servicios/           # Catálogo de servicios veterinarios
```

### 2.2 Arquitectura Interna de Cada Aplicación

Cada módulo Django sigue una estructura estandarizada:

**models.py**: Define el esquema de datos (capa de dominio). Contiene clases que heredan de `django.db.models.Model`, representando entidades persistentes con validaciones de negocio.

**views.py**: Controladores HTTP que procesan requests. Implementan la lógica de coordinación: obtienen datos de modelos, invocan servicios, y retornan respuestas (HTML o JSON).

**services.py**: Capa de lógica de negocio compleja. Contiene funciones que encapsulan operaciones que involucran múltiples modelos o requieren cálculos complejos. Ejemplo: `calcular_cantidad_insumos()`, `descontar_stock_insumo()`, `crear_cobro_pendiente()`.

**signals.py**: Manejadores de eventos del ciclo de vida de modelos (`pre_save`, `post_save`, `pre_delete`). Permiten que un módulo reaccione automáticamente a cambios en sus entidades o en otras aplicaciones sin acoplamiento directo.

**urls.py**: Mapeo de rutas HTTP a vistas. Define la API HTTP pública de cada módulo.

**templates/**: Archivos HTML con template language de Django. Implementan la capa de presentación específica del módulo.

**admin.py**: Configuración del panel administrativo de Django para gestión directa de datos.

### 2.3 Organización de Recursos Compartidos

**templates/partials/**: Componentes de UI reutilizables (sidebar, topbar, base layouts). Permiten consistencia visual sin duplicación.

**static/**: Recursos estáticos (CSS, JavaScript, imágenes) organizados por tipo y módulo.

**middleware.py** (en `historial`): Lógica transversal que intercepta todas las requests para capturar el usuario autenticado en thread-locals, permitiendo acceso global sin acoplamiento explícito.

---

## 3. SEPARACIÓN DE CAPAS

### 3.1 Capa de Presentación

**Responsabilidad**: Renderizar información para el usuario final y capturar inputs.

**Componentes**:
- **Templates Django**: Archivos `.html` con template tags (`{% if %}`, `{% for %}`, `{{ variable }}`)
- **Archivos estáticos**: CSS (KaiAdmin framework), JavaScript (jQuery, custom scripts)
- **Views como controladores**: Funciones que coordinan qué template renderizar con qué datos

**Características técnicas**:
- Templates heredan de layouts base (`templates/partials/base.html`) usando `{% extends %}`
- Partials reutilizables incluidos con `{% include %}`
- Context processors inyectan datos globales (usuario autenticado, mensajes)
- Decoradores `@login_required` aseguran que solo usuarios autenticados accedan

**Separación estricta**: Los templates **NO contienen lógica de negocio**. Solo iteran sobre datos provistos por la vista, aplican formato y presentan formularios. Validaciones complejas y cálculos ocurren en la capa de aplicación.

### 3.2 Capa de Lógica de Negocio

**Responsabilidad**: Implementar reglas de negocio, validaciones, cálculos y coordinación de operaciones.

**Subcapas**:

#### 3.2.1 Modelos (Domain Layer)

Clases que definen entidades del dominio con:
- Atributos persistentes (`models.CharField`, `models.IntegerField`, etc.)
- Validaciones básicas (max_length, choices, constraints)
- Métodos de instancia para comportamiento específico de la entidad
- Metadata (`Meta` class) para configurar índices, orden predeterminado, permisos

Ejemplo: `Insumo` en `inventario/models.py` define stock_actual, precio_venta, validaciones de formato, y choices para tipo de medicamento.

#### 3.2.2 Services (Business Logic Layer)

Funciones independientes en `services.py` que encapsulan operaciones complejas:

```python
# caja/services.py
def descontar_stock_insumo(detalle_venta):
    """
    Descuenta el stock cuando se confirma un pago.
    
    Esta función es el ÚNICO punto donde se descuenta stock.
    Lógica:
    1. Obtener el insumo asociado
    2. Validar stock disponible
    3. Actualizar stock_actual
    4. Establecer tipo_ultimo_movimiento
    5. Registrar usuario responsable
    6. Guardar cambio (dispara signal que registra en historial)
    """
```

**Ventajas de esta separación**:
- **Reutilización**: Múltiples vistas pueden invocar el mismo servicio
- **Testabilidad**: Los servicios se testean de forma aislada sin HTTP
- **Transaccionalidad**: Servicios pueden decorarse con `@transaction.atomic` para garantizar atomicidad

#### 3.2.3 Signals (Event Handlers)

Manejadores que se ejecutan automáticamente cuando ocurren eventos en el ciclo de vida de modelos:

```python
# inventario/signals.py
@receiver(post_save, sender=Insumo)
def insumo_post_save(sender, instance, created, **kwargs):
    """
    Se ejecuta automáticamente después de guardar un Insumo.
    Registra el cambio en el historial según el tipo_ultimo_movimiento.
    """
```

**Patrón Observer**: Los signals permiten que módulos reaccionen a eventos sin que el emisor conozca a los receptores. Ejemplo: cuando se guarda un `Insumo` con `tipo_ultimo_movimiento='salida_stock'`, el signal en `inventario/signals.py` automáticamente registra el movimiento en `historial.RegistroHistorico`.

#### 3.2.4 Middleware

Componentes que interceptan todas las requests y responses para inyectar comportamiento transversal:

```python
# historial/middleware.py
class CurrentUserMiddleware:
    """
    Captura el usuario de cada request y lo almacena en thread-locals.
    Permite que signals accedan al usuario que realizó la acción
    sin pasar explícitamente el usuario por todos los métodos.
    """
```

**Thread-locals**: Almacenamiento por thread que permite acceso global sin variables globales compartidas, evitando race conditions en escenarios multi-thread.

### 3.3 Capa de Persistencia

**Responsabilidad**: Almacenamiento y recuperación de datos con garantías ACID.

**Componentes**:

#### 3.3.1 Base de Datos Relacional

- **Desarrollo**: SQLite (archivo `db.sqlite3`, sin servidor)
- **Producción**: PostgreSQL (servidor independiente con conexiones simultáneas)

**Transacciones ACID**:
- **Atomicidad**: Operaciones complejas se ejecutan completamente o se revierten
- **Consistencia**: Constraints de integridad referencial garantizan validez de relaciones
- **Isolation**: Niveles de aislamiento previenen lecturas sucias
- **Durability**: Cambios confirmados persisten ante fallos

#### 3.3.2 ORM (Object-Relational Mapping)

Django ORM abstrae SQL, permitiendo interacción con base de datos mediante objetos Python:

```python
# En lugar de: SELECT * FROM inventario_insumo WHERE stock_actual < stock_minimo
insumos_bajo_stock = Insumo.objects.filter(stock_actual__lt=models.F('stock_minimo'))
```

**Ventajas técnicas**:
- **Portabilidad**: Mismo código funciona en SQLite y PostgreSQL
- **Prevención de SQL injection**: Queries parametrizadas automáticas
- **Lazy evaluation**: Queries se ejecutan solo cuando se itera sobre resultados
- **Query optimization**: `.select_related()`, `.prefetch_related()` previenen problema N+1

#### 3.3.3 Migraciones

Sistema de versionado de esquema de base de datos:

```bash
python manage.py makemigrations  # Genera archivos de migración
python manage.py migrate         # Aplica migraciones
```

Cada migración es un archivo Python que define cambios incrementales del esquema. Permite:
- **Sincronización**: Múltiples entornos (dev, staging, prod) mantienen mismo esquema
- **Rollback**: Migraciones son reversibles
- **Historial**: Cada cambio de esquema está documentado y versionado

---

## 4. ROL DE DJANGO Y EL PATRÓN MVT

### 4.1 Django como Framework Full-Stack

Django proporciona una suite completa de componentes:

**ORM**: Mapeo objeto-relacional con soporte para PostgreSQL, MySQL, SQLite, Oracle.

**Template Engine**: Sistema de templates con herencia, inclusión, filtros y tags personalizados.

**URL Dispatcher**: Mapeo de URLs a vistas mediante expresiones regulares o path converters.

**Forms Framework**: Validación automática de formularios, rendering HTML, manejo de errores.

**Admin Interface**: Panel administrativo generado automáticamente desde modelos.

**Authentication System**: Gestión de usuarios, permisos, sesiones, password hashing.

**Middleware Framework**: Hooks para procesar requests/responses globalmente.

**Signals Framework**: Sistema de eventos para desacoplamiento.

**Testing Framework**: Suite integrada para unit tests y integration tests.

### 4.2 Patrón MVT (Model-View-Template)

Django implementa una variación de MVC llamada **MVT**:

**Model (M)**: Representa la lógica de datos y negocio. En Django, son clases que heredan de `models.Model` y definen el esquema de base de datos y comportamiento de entidades.

**View (V)**: Actúa como **controlador** (no como "vista" en sentido MVC tradicional). Las views reciben requests HTTP, invocan modelos y servicios, y retornan responses. Equivalen al Controller de MVC.

**Template (T)**: Implementa la **capa de presentación**. Son archivos HTML con lógica de rendering. Equivalen a la View de MVC.

**Comparación con MVC clásico**:

| MVC Tradicional | Django MVT | Responsabilidad |
|----------------|------------|-----------------|
| Model | Model | Lógica de dominio y datos |
| View | Template | Presentación |
| Controller | View | Coordinación y control de flujo |

### 4.3 Flujo de Request-Response en MVT

1. **Request HTTP llega al servidor**: `GET /inventario/lista/`
2. **URL Dispatcher resuelve vista**: `inventario/urls.py` mapea la URL a `views.lista_insumos`
3. **Middleware procesa request**: `CurrentUserMiddleware` captura el usuario autenticado
4. **View ejecuta lógica**:
   - Verifica autenticación (`@login_required`)
   - Consulta modelos: `Insumo.objects.filter(archivado=False)`
   - Invoca servicios si es necesario
   - Prepara contexto: `{'insumos': insumos, 'usuario': request.user}`
5. **Template renderiza HTML**: `inventario/lista.html` itera sobre `insumos` y genera HTML
6. **Response HTTP retorna al cliente**: HTML renderizado con status 200

---

## 5. JUSTIFICACIÓN TÉCNICA DE LA ARQUITECTURA

### 5.1 Selección de Arquitectura Monolítica Modular

**Decisión**: Monolito modular en lugar de microservicios.

**Justificación**:

**Transaccionalidad requiere ACID**: Operaciones críticas como confirmar venta (actualizar caja, descontar inventario, registrar historial) requieren transaccionalidad fuerte. En microservicios, esto requeriría implementar Saga Pattern o Two-Phase Commit, añadiendo complejidad sin beneficio claro para el dominio.

**Volumen de operaciones manejable**: Una clínica veterinaria promedio procesa decenas de transacciones por hora. Un monolito bien diseñado en Django + PostgreSQL puede manejar miles de transacciones por segundo, ampliamente suficiente.

**Simplicidad operacional**: Un único despliegue simplifica CI/CD, logging, monitoring, y debugging. Microservicios requerirían orquestación (Kubernetes), service mesh, distributed tracing, sin justificación de escala.

**Desarrollo más rápido**: Compartir código entre módulos (utilities, middleware) es directo. En microservicios requeriría librerías compartidas o duplicación.

### 5.2 Uso de Signals para Desacoplamiento

**Decisión**: Implementar coordinación entre módulos mediante signals en lugar de invocación directa.

**Justificación**:

**Principio Open/Closed**: Nuevos módulos pueden reaccionar a eventos existentes sin modificar código fuente del emisor. Ejemplo: si se agrega un módulo de notificaciones, puede suscribirse a `post_save` de `Venta` sin modificar `caja/`.

**Single Responsibility**: Cada módulo se enfoca en su dominio. `caja/services.py` descuenta stock y establece `tipo_ultimo_movimiento`, pero NO registra en historial. Ese registro ocurre en el signal de `inventario/`, que escucha cambios de su propio modelo.

**Testabilidad**: Los signals pueden deshabilitarse en tests para verificar lógica de forma aislada.

**Trade-off aceptado**: Los signals hacen el flujo menos explícito (no se ve en el código quién reacciona a un evento). Se mitiga con documentación exhaustiva en docstrings.

### 5.3 Separación de Services Layer

**Decisión**: Extraer lógica compleja de views a `services.py`.

**Justificación**:

**Reusabilidad**: `descontar_stock_insumo()` puede invocarse desde vistas, comandos de management, tasks asíncronas, o scripts.

**Transaccionalidad clara**: Servicios complejos se decoran con `@transaction.atomic`, garantizando que toda la operación es atómica.

**Testing aislado**: Los servicios se testean sin inicializar framework HTTP, haciendo tests más rápidos y focalizados.

### 5.4 Middleware para Captura de Usuario

**Decisión**: Usar thread-locals en middleware para capturar usuario en lugar de pasarlo explícitamente.

**Justificación**:

**Signals sin parámetros de usuario**: Los signals estándar de Django no reciben el usuario. Pasarlo requeriría monkey-patching o variables globales. Thread-locals proveen acceso por-thread sin contaminación global.

**Transparencia**: El código de negocio no necesita saber que el usuario será registrado. El middleware inyecta el contexto automáticamente.

**Trade-off**: Thread-locals son implícitos y pueden ser confusos. Se documenta explícitamente en `historial/middleware.py` y se usa exclusivamente para este propósito.

---

## 6. VENTAJAS DE LA ARQUITECTURA IMPLEMENTADA

### 6.1 Ventajas Técnicas

**Transaccionalidad garantizada**: Operaciones críticas se ejecutan como transacciones ACID sin complejidad de sistemas distribuidos.

**Desarrollo rápido**: Django provee componentes out-of-the-box que aceleran implementación (admin, auth, forms, ORM).

**Trazabilidad completa**: El sistema de signals + historial registra automáticamente cada cambio, garantizando auditoría sin código repetitivo en cada vista.

**Modularidad interna**: 13 aplicaciones desacopladas permiten desarrollo paralelo. Un equipo puede trabajar en `agenda/` mientras otro en `inventario/` sin conflictos.

**Testing facilitado**: Cada módulo se testea independientemente. Services layer permite unit tests sin framework web.

**Portabilidad de base de datos**: ORM abstrae diferencias. Desarrollo en SQLite, producción en PostgreSQL sin cambios de código.

**Escalabilidad vertical directa**: Agregar CPU/RAM al servidor escala el sistema proporcionalmente sin cambios arquitectónicos.

### 6.2 Ventajas Operacionales

**Despliegue simple**: Un único artefacto (código + dependencias Python). No requiere orquestación ni service discovery.

**Debugging eficiente**: Stack traces completos. En microservicios, errores requieren correlacionar logs distribuidos.

**Mantenimiento centralizado**: Cambios de esquema de base de datos se aplican con migraciones. No requiere sincronización entre servicios.

**Backup y recuperación directa**: Base de datos relacional única. Backup tradicional con `pg_dump`.

### 6.3 Ventajas de Negocio

**Time-to-market reducido**: Framework maduro con ecosistema rico permite implementar features rápidamente.

**Costo de infraestructura bajo**: Un servidor de aplicación + base de datos es suficiente. Microservicios requerirían múltiples instancias, load balancers, service mesh.

**Onboarding de desarrolladores**: Django es framework mainstream. Desarrolladores Python pueden contribuir sin curva de aprendizaje empinada.

---

## 7. LIMITACIONES REALES DE LA ARQUITECTURA

### 7.1 Limitaciones de Escalabilidad

**Escalabilidad horizontal compleja**: Monolitos escalan verticalmente (más recursos al servidor) pero horizontalmente requieren load balancer con sticky sessions y base de datos compartida. Para carga extrema (millones de transacciones/hora), microservicios serían más apropiados.

**Acoplamiento de despliegue**: Cambio en un módulo requiere redespliegue completo. No se puede desplegar `inventario/` independientemente de `caja/`. Esto aumenta riesgo de despliegues y complejidad de rollbacks parciales.

**Monolítico en runtime**: Si un módulo tiene memory leak o CPU spike, afecta toda la aplicación. En microservicios, cada servicio es aislado.

### 7.2 Limitaciones Técnicas del Patrón MVT

**Acoplamiento a Django**: Migrar a otro framework (FastAPI, Flask, Node.js) requiere reescribir gran parte del código. Django es opinionated y proporciona mucha "magia" que hace portabilidad difícil.

**Signals implícitos**: El flujo de ejecución no es evidente del código. Un `insumo.save()` dispara signal que registra en historial, pero esto no es obvio sin leer `signals.py`. Esto complica debugging y onboarding.

**ORM constraints**: Django ORM, aunque poderoso, tiene limitaciones en queries complejas. Queries que requieren subqueries avanzadas o window functions requieren raw SQL, perdiendo abstracción.

**Render server-side**: Templates Django generan HTML en servidor. Para UIs altamente interactivas (drag-and-drop, real-time updates), requiere mucho JavaScript custom o integración con frameworks frontend (React, Vue), que Django no maneja nativamente.

### 7.3 Limitaciones Operacionales

**Sin fault isolation**: Si la base de datos cae, toda la aplicación falla. Microservicios con caching y circuit breakers pueden degradar gracefully.

**Deployment monolítico**: Despliegue requiere downtime (aunque breve con blue-green deployment). Microservicios permiten deployments continuos sin afectar toda la plataforma.

**Testing de integración costoso**: Tests que involucran múltiples módulos requieren base de datos completa y fixtures complejas. En microservicios, se pueden mockear APIs entre servicios.

### 7.4 Limitaciones de Dominio Específicas

**Real-time features limitadas**: El sistema no implementa WebSockets o Server-Sent Events para actualizaciones en tiempo real. Para features como "notificaciones push" o "agenda colaborativa en tiempo real", se requeriría añadir Django Channels o tecnología similar.

**Concurrencia optimista básica**: No hay manejo sofisticado de conflictos de escritura simultánea. Si dos usuarios editan el mismo insumo, el último que guarda sobrescribe cambios sin merge. Esto es mitigable con row-level locking pero no está implementado.

**Background jobs dependiente de middleware**: El sistema asume que cada operación tiene un usuario asociado (capturado por middleware). Tareas asíncronas (background jobs) ejecutadas sin request HTTP no tienen usuario automático, requiriendo manejo especial.

---

## 8. CRITERIOS DE ESCALABILIDAD FUTURA

### 8.1 Escalabilidad Vertical (Implementable sin Cambios Arquitectónicos)

- **Upgrade de hardware**: Servidor con más CPU/RAM
- **Connection pooling**: PgBouncer para reutilizar conexiones PostgreSQL
- **Caching**: Redis para cachear queries frecuentes
- **Static files CDN**: Servir assets estáticos desde CDN (CloudFlare, AWS CloudFront)

### 8.2 Escalabilidad Horizontal (Requiere Cambios Arquitectónicos)

- **Load balancing**: Múltiples instancias de aplicación detrás de load balancer
- **Database read replicas**: Leer de réplicas, escribir a master
- **Separación de servicios críticos**: Extraer módulos de alta carga (ej: `reportes/`) a servicios independientes

### 8.3 Migración Incremental a Microservicios (Si es Necesario)

Django permite migración gradual:

1. Extraer módulo a API independiente (DRF)
2. Aplicación principal consume API
3. Compartir base de datos inicialmente
4. Eventualmente separar bases de datos con eventos/queues

---

## SÍNTESIS ARQUITECTÓNICA

VetSantaSofia implementa una **arquitectura monolítica modular de tres capas** con **desacoplamiento basado en eventos**, utilizando **Django MVT** como framework full-stack. La separación entre presentación (templates), lógica de negocio (models + services + signals) y persistencia (PostgreSQL + ORM) es explícita y respetada consistentemente.

Esta arquitectura es **técnicamente apropiada** para el dominio: prioriza transaccionalidad ACID, trazabilidad automática, y desarrollo rápido sobre escalabilidad extrema. Las limitaciones (acoplamiento de despliegue, implicitness de signals, escalabilidad horizontal compleja) son **trade-offs aceptados** dado el volumen de operaciones esperado y los requerimientos de negocio.

El diseño permite **evolución incremental**: escalabilidad vertical inmediata, horizontal con modificaciones moderadas, y migración gradual a microservicios si el volumen de negocio lo justifica en el futuro.
