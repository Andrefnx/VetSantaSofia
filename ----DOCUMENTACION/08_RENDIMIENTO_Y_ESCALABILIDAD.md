# 08. RENDIMIENTO Y ESCALABILIDAD

## 1. SITUACIÓN ACTUAL (BASE REALISTA)

- Arquitectura: monolito Django (MVT) con templates + APIs JSON (híbrido).
- BD: PostgreSQL en producción, SQLite en dev. ORM de Django.
- Lógica: centralizada en capa de services (p. ej. [caja/services.py](caja/services.py)), señales para historiales.
- Despliegue típico: 1-2 instancias web, servidor de archivos estáticos del framework o nginx, sin colas ni caché distribuida.
- Carga esperada: clínica mediana (decenas/centenas de transacciones por día), bursts en horarios de atención.

Conclusión: el sistema está dimensionado para una operación mediana con foco en consistencia y trazabilidad antes que en throughput masivo.

---

## 2. CÓMO EL DISEÑO PERMITE CRECER

- Capa de services: separa coordinación HTTP (vistas) de la lógica de negocio, permitiendo optimizaciones/localizaciones sin tocar endpoints (ver [caja/services.py](caja/services.py)).
- Híbrido SSR + JSON: renderizado servidor para primeras cargas y endpoints JSON para operaciones; esto admite cacheos selectivos y evolución a SPAs por pantalla.
- Centralización de reglas críticas: un único punto para pagos/stock simplifica reforzar atomicidad, añadir métricas o introducir colas sin romper contratos.
- ORM + PostgreSQL: acceso transaccional ACID, índices y planes de query tuning; admite crecimiento vertical y ciertas estrategias horizontales (réplicas de lectura).
- Señales para auditoría: desacoplan efectos secundarios; se pueden hacer más ligeras o mover a tareas diferidas sin cambiar flujos.

---

## 3. SEPARACIÓN DE RESPONSABILIDADES

- Frontend (templates/JS): presentación y UX. Puede moverse a CDN y adoptar componentes más ricos sin cambiar el backend.
- Vistas: parseo HTTP y autorización; delgadas por diseño.
- Services: reglas de negocio (pagos, stock, sesiones) y transacciones.
- Modelos: estructura y validaciones básicas (constraints y clean()).
- BD: integridad y persistencia. 

Efecto: cambios en una capa no obligan a reescrituras en las demás, reduciendo el coste de escalar funcional o técnicamente.

---

## 4. CUELLOS DE BOTELLA PROBABLES Y MITIGACIONES

- Contención en stock (actualizaciones concurrentes): usar `select_for_update()` en descuentos, delimitar transacciones, y verificar idempotencia en `descontar_stock_insumo()`.
- N+1 queries: aplicar `select_related()`/`prefetch_related()` en listados y reportes; revisar [reportes/views.py](reportes/views.py) y endpoints con filtros.
- Filtros no indexados: crear índices en campos de búsqueda habitual (RUT, nombres, `activo`, `archivado`, foreign keys de join).
- Señales pesadas: mantenerlas ligeras (solo encolar data mínima); mover cálculos costosos a tareas diferidas cuando haya cola.
- Generación de reportes: paginar, exportar en background y notificar; evitar cargar todo en memoria.
- Estáticos y media: servir por CDN y almacenamiento de objetos; evitar bloquear workers con IO de archivos.

---

## 5. ¿QUÉ SE PUEDE ESCALAR EN EL FUTURO?

- Capa web:
  - Escala horizontal detrás de un balanceador (gunicorn/uvicorn + nginx). Sticky sessions opcional si sesiones en cache/DB.
  - Pool de conexiones y pgbouncer para reducir overhead de conexiones a PostgreSQL.
- Base de datos:
  - Escala vertical (CPU/RAM/IOPs) y tuning (work_mem, autovacuum, plan cache).
  - Réplicas de lectura para analítica/reportes; write en primario, read-only en réplicas.
  - Particionamiento por rango/fecha en tablas de auditoría/historial para mejorar VACUUM/retención.
- Caché:
  - Redis para cache por vista/fragmento y para sesiones; invalidación dirigida por signals.
  - Cacheo de catálogos (servicios, insumos activos) con TTLs cortos.
- Procesamiento asíncrono:
  - Cola de tareas (Celery/RQ) para PDFs, consolidaciones, notificaciones y trabajos pesados.
  - Retries con backoff y deduplicación (task keys) para idempotencia.
- Búsqueda:
  - Motor dedicado (OpenSearch/Elasticsearch) si ILIKE deja de ser suficiente en volumen o relevancia.
- Observabilidad:
  - APM (OpenTelemetry/New Relic), métricas de aplicación, alerta por P95 de pagos, lock wait y tasa de 500.

---

## 6. ¿QUÉ NO SE IMPLEMENTÓ Y POR QUÉ? (DECISIONES PRÁCTICAS)

- Microservicios: descartado por complejidad operativa (redes, contratos, observabilidad distribuida) y tamaño del equipo. El monolito con capa de services ya marca límites claros para una futura extracción, si hiciera falta.
- Cola y workers dedicados: no incluidos inicialmente para evitar sobrecarga operativa (brokers, monitoreo). La carga actual permite síncrono con transacciones sin afectar UX.
- Capa de caché distribuida: omitida por simplicidad y riesgo de incoherencias; se prioriza consistencia fuerte. Se añadirá cuando el perfil de lectura lo justifique.
- Réplicas de lectura/particionamiento: prematuros con el volumen actual; añadir cuando reportes afecten el primario o crezca la retención.
- Pila 100% async: Django sync es suficiente (IO de BD predominante). Migrar a ASGI/async se evaluará solo si aparecen necesidades de IO concurrente alto (WebSockets, streaming intensivo).

---

## 7. ROADMAP TÉCNICO (ESCALADO PROGRESIVO)

- Corto plazo (semanas):
  - Índices focalizados, `select_related/prefetch_related`, paginación consistente, compresión (gzip/brotli) y cache-control en estáticos.
  - Pooling y límites de conexiones; revisar transacciones largas en pagos/stock.
- Medio plazo (trimestres):
  - Redis para sesiones/cache de catálogos; Celery para reportes y notificaciones.
  - CDN para estáticos/media; APM y dashboards de métricas.
  - Pgbouncer + réplica de lectura para consultas analíticas.
- Largo plazo (año+):
  - Particionar historiales/auditorías por fecha; archiving policies.
  - Extraer tareas de caja/reportes intensivos si crece el throughput.

---

## 8. RIESGOS DE ESCALADO Y CONTROLES

- Contención por locks en inventario: medir lock wait; aplicar `select_for_update`, granularidad de filas y, si hace falta, colas de comandos.
- Invalidez de caché: diseñar invalidación por eventos (signals) y TTLs conservadores.
- Replicación: latencia de réplicas puede causar lecturas stale; reservar para reportes o usar `read-your-writes` donde importe.
- Back-pressure: proteger el primario con límites de concurrencia y colas; timeouts y circuit breakers en servicios externos.

---

## 9. MÉTRICAS CLAVE A MONITOREAR

- P95 de confirmación de pago y creación de venta.
- Tiempos de queries críticas, locks y deadlocks por minuto.
- CPU/IO de PostgreSQL, tamaño de índices/tablas de historial.
- Tasa de 5xx/4xx, reintentos y tiempo de cola (si se introduce Celery).

---

## 10. CONCLUSIÓN

El sistema adopta un monolito bien estructurado: vistas delgadas, services con reglas, modelo rico y BD ACID. Ese diseño facilita crecer de forma iterativa: primero optimizaciones locales (índices, N+1, paginación), luego infraestructura (cache/colas/CDN), y finalmente partición/replicación si el volumen lo exige. Se prioriza la consistencia y la trazabilidad; las decisiones de no-implementación responden a evitar complejidad prematura y a mantener un costo operativo razonable.
