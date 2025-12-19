# 07. AUDITORÍA, CONSISTENCIA Y TRAZABILIDAD DE DATOS

## 1. PROPÓSITO Y ALCANCE

Este documento explica cómo el sistema garantiza:
- Auditoría integral de operaciones.
- Consistencia fuerte en flujos críticos.
- Trazabilidad completa de datos clínicos, inventario y caja.

Se detallan los mecanismos técnicos (signals, services, transacciones, constraints, flags), las decisiones arquitectónicas que los sustentan y el valor técnico y legal de dichas decisiones.

---

## 2. HISTORIALES (TRAZABILIDAD A NIVEL DE DOMINIO)

### 2.1 Registro automático mediante signals

- Mecanismo: señales `pre_save`/`post_save` capturan cambios en entidades clave y generan entradas en un historial inmutable.
- Ubicación: ver [historial/signals.py](historial/signals.py) y signals en cada app (p. ej. [inventario/signals.py](inventario/signals.py)).
- Actor: el usuario autenticado se obtiene desde un middleware de contexto (ver [cuentas/middleware.py](cuentas/middleware.py)), garantizando identidad en cada entrada.

### 2.2 Contenido mínimo de una entrada de historial

- Entidad y objeto (p. ej. `inventario`/`Insumo#123`).
- Tipo de evento (creación, modificación, ingreso/salida de stock, desactivación, etc.).
- Usuario (actor), marca de tiempo exacta (UTC) y criticidad.
- Datos relevantes del cambio: valores anteriores y nuevos cuando aplica.

### 2.3 Propiedades del historial

- Append-only: entradas no se editan ni se borran; las correcciones se realizan con nuevos eventos compensatorios.
- Inmutabilidad lógica: interfaces y servicios no exponen edición del historial.
- Trazabilidad transversal: enlaza con contexto (venta asociada, consulta, hospitalización) cuando aplica.

Decisión técnica: el historial por signals evita duplicación de lógica de auditoría en vistas, reduce errores humanos y asegura cobertura uniforme.

---

## 3. AUDITORÍA DE CAJA (CONTROL FINANCIERO OPERATIVO)

### 3.1 Sesión de caja como unidad de auditoría

- Modelo: `SesionCaja` agrupa operaciones de dinero en un período con apertura y cierre.
- Campos críticos: `monto_inicial`, `monto_final_calculado`, `monto_final_contado`, `diferencia`, usuarios de apertura/cierre, timestamps.
- Regla de cierre: no se puede cerrar con cobros `pendiente` asociados (integridad operacional).

### 3.2 Auditoría de acciones de caja

- Registro: `AuditoriaCaja` persiste eventos como abrir/cerrar sesión, confirmar pagos, cancelar ventas.
- Datos: usuario, acción, fecha/hora, detalles (monto, método de pago, diferencias), opcionalmente IP del cliente.
- Validación: las operaciones críticas pasan por services con `@transaction.atomic` para garantizar ACID (ver [caja/services.py](caja/services.py)).

Valor: provee evidencia verificable de cada transición de dinero, soporte para conciliación y para investigación de diferencias.

---

## 4. CONSISTENCIA (GARANTÍAS ACID EN FLUJOS CRÍTICOS)

### 4.1 Transacciones atómicas

- Pago y descuento de inventario: encapsulados en `procesar_pago()` con `@transaction.atomic`.
- Garantía: o se descuenta stock y la venta pasa a `pagado`, o nada cambia (rollback completo ante error).

### 4.2 Idempotencia con flags de control

- `DetalleVenta.stock_descontado`: previene dobles descuentos en reintentos o llamadas concurrentes.
- Estados de ciclo de vida: `Venta.estado` (`pendiente` → `pagado` → `cancelado`) restringen transiciones inválidas.

### 4.3 Constraints de base de datos

- `UNIQUE` (p. ej., microchip), `FOREIGN KEY` (integridad referencial), `CHECK` (rangos/valores válidos) refuerzan la capa de aplicación.
- Beneficio: defensa en profundidad — si la aplicación falla, la BD evita inconsistencias persistentes.

### 4.4 Centralización de reglas

- Reglas de negocio críticas viven en services (no en vistas), garantizando aplicación uniforme sin importar el endpoint que invoque el flujo.
- Ejemplos: "no pagar sin sesión de caja activa", "stock no puede ser negativo", "una hospitalización activa por paciente".

---

## 5. TRAZABILIDAD DE DATOS (DE PUNTA A PUNTA)

### 5.1 Cadena de eventos

- Consulta/Hospitalización → crea/actualiza cobros pendientes → confirmación de pago → descuento de stock → auditoría de caja → historial de inventario.
- Cada eslabón registra: quién, cuándo, qué cambió y en qué contexto, permitiendo reconstrucción forense del flujo completo.

### 5.2 Identidad del actor y contexto

- Usuario: capturado por middleware y propagado a signals/services.
- Contexto: IDs de entidades relacionadas (consulta, hospitalización, venta, insumo/servicio) en cada registro.
- Tiempo: timestamps normalizados (zona consistente) para ordenamiento temporal inequívoco.

### 5.3 Reportabilidad

- Los historiales y auditorías permiten construir reportes: movimientos de stock, ventas por sesión, diferencias de caja, cambios de precio/servicio, etc.

---

## 6. PREVENCIÓN DE INCONSISTENCIAS (PATRONES Y CONTROLES)

- Descuento centralizado de stock: solo en caja/services al confirmar pago — evita descuentos anticipados/duplicados (no en clínica).
- Gating por sesión de caja: imposible confirmar pagos sin sesión activa; evita operaciones fuera de horario o sin responsable.
- One-to-one Consulta↔Venta: evita cobros duplicados por la misma consulta.
- Soft delete y estados: en lugar de borrar, se marca `activo`/`archivado` manteniendo trazabilidad y evitando referencias rotas.
- Validación previa: stock suficiente, estados válidos, permisos por rol, unicidades de dominio, etc.

Resultado: se minimizan estados intermedios inválidos y se facilita la detección temprana de errores.

---

## 7. RETENCIÓN: POR QUÉ NO SE ELIMINAN DATOS CRÍTICOS

- Razón técnica: los datos clínicos y financieros componen cadenas de trazabilidad; su eliminación rompería auditorías, historiales y reconciliaciones.
- Estrategia: soft delete (flags) para ocultar de flujos activos, preservando el registro; correcciones mediante eventos compensatorios, no mediante edición/borrado.
- Beneficio: consistencia histórica, reproducibilidad de estados pasados y soporte a auditorías internas/externas.

---

## 8. VALOR TÉCNICO Y LEGAL DEL DISEÑO

### 8.1 Valor técnico

- Observabilidad: historiales y auditoría de caja permiten medir, depurar y explicar comportamientos del sistema.
- Resiliencia: transacciones y constraints reducen probabilidad de corrupción de datos.
- Mantenibilidad: centralizar reglas en services reduce deuda técnica y facilita cambios controlados.

### 8.2 Valor legal/regulatorio

- Evidencia operativa: cada operación relevante incluye actor y timestamp, aportando cadena de custodia de la información.
- No repudio: registros inmutables (append-only) y diferencias de caja registradas dificultan el ocultamiento de cambios/faltantes.
- Conservación de registros: soft delete y retención histórica soportan requerimientos de conservación (médicos/contables) típicos del dominio veterinario.

Nota: para cumplimiento estricto (jurisdicción-dependiente), se recomienda complementar con políticas de retención formal, time-stamping con sellado de tiempo y control de acceso a nivel de infraestructura (TLS, WAF, backups inmutables).

---

## 9. ESCENARIOS TÍPICOS Y SU COBERTURA

- Cobro duplicado: bloqueado por `estado` de la venta e idempotencia de descuento.
- Diferencia de caja: registrada con cálculo automático y responsable identificable.
- Stock negativo: prevenido por validación previa y/o `CHECK` en BD.
- Borrado de referencias: evitado con soft delete y `PROTECT`/`CASCADE` controlado.
- Corrección de errores: via eventos compensatorios (p. ej., cancelación de venta y reintegro), preservando el rastro histórico.

---

## 10. LÍMITES Y CONSIDERACIONES

- Integridad horaria: se recomienda sincronización NTP en servidores para precisión temporal.
- Registro de IP y metadatos: puede activarse para fortalecer análisis forense (considerar privacidad).
- Auditorías externas: exportaciones firmadas (hashing) fortalecen verificabilidad fuera del sistema.

---

## 11. CONCLUSIÓN

El sistema implementa defensas en profundidad: auditoría automatizada por signals, control financiero por sesiones de caja, consistencia garantizada por transacciones y constraints, y trazabilidad completa mediante historiales y estados. Este enfoque eleva la calidad técnica, reduce riesgos operativos y aporta valor probatorio en contextos legales y de cumplimiento.
