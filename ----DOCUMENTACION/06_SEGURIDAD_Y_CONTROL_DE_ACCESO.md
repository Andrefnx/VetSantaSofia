# 06. SEGURIDAD Y CONTROL DE ACCESO

## 1. MARCO GENERAL

El sistema implementa un modelo de seguridad en capas que combina:
- Autenticación basada en RUT con normalización y backend propio.
- Autorización por roles con decoradores y validaciones de dominio.
- Protección de acciones críticas mediante transacciones atómicas, gating por sesión de caja y banderas anti-duplicado.
- Validaciones en backend a nivel de vista, servicio, modelo y base de datos.
- Manejo consistente de errores con códigos HTTP y payloads JSON estandarizados.
- Auditoría sistemática de cambios y operaciones de caja.

Justifica decisiones técnicas orientadas a reducir superficie de ataque, prevenir inconsistencias y facilitar auditoría operativa y clínica.

---

## 2. AUTENTICACIÓN

- Identificador: RUT (normalizado) como `USERNAME_FIELD` para reducir fricción de entrada y alinearse con el contexto local.
- Backend personalizado: ver [cuentas/backends.py](cuentas/backends.py). Valida credenciales con `check_password()` (hash seguro) y normaliza RUT para búsquedas consistentes.
- Middleware de usuario actual: expone el usuario en contexto thread-local para auditoría de signals (ver [cuentas/middleware.py](cuentas/middleware.py)).
- Sesiones: autenticación vía `AuthenticationMiddleware` y cookie `sessionid` (Django). Timeout configurable (`SESSION_COOKIE_AGE`) y renovación con `SESSION_SAVE_EVERY_REQUEST` para minimizar expiraciones inesperadas.
- Recuperación de contraseña por RUT con validaciones mínimas y recomendación de segundo factor o confirmación out-of-band para producción (ver [login/views.py](login/views.py)).

Decisión técnica: reutilizar el stack probado de Django para autenticación, agregando backend por RUT para adecuación local, minimizando desarrollos ad-hoc de alto riesgo.

---

## 3. AUTORIZACIÓN POR ROLES

Roles del sistema:
- `administracion`: acceso amplio y funciones administrativas.
- `veterinario`: gestión clínica y de insumos (operaciones médicas y preparatorias).
- `recepcion`: flujo de agendamiento y caja dentro de límites.

Mecanismos:
- Decoradores de acceso (p. ej. `@login_required` y `@solo_admin_y_vet`) en vistas sensibles. Ver ejemplos en [inventario/views.py](inventario/views.py) y [servicios/views.py](servicios/views.py).
- Validaciones de negocio en services: evita confiar únicamente en decoradores HTTP. Aun cuando una vista sea invocada desde varios flujos, la verificación se mantiene en la capa de negocio (ver [caja/services.py](caja/services.py)).

Decisión técnica: combinar control de acceso en vista (rápido, claro) con enforcement en servicios (consistencia transversal), previniendo bypass por rutas alternativas.

---

## 4. PROTECCIÓN DE ACCIONES CRÍTICAS

Acciones críticas y controles asociados:

- Confirmación de pago:
  - Requiere sesión de caja activa; si no, se rechaza (gating). Implementado en `procesar_pago()` de [caja/services.py](caja/services.py).
  - Se ejecuta bajo `@transaction.atomic` para garantizar TODO o NADA (stock, estado de venta, auditoría).
  - Banderas anti-repetición: `DetalleVenta.stock_descontado` previene doble descuento.

- Descuento de inventario:
  - Centralizado exclusivamente en la capa de services de caja (no en clínica), evitando duplicados y estados intermedios. Ver `descontar_stock_insumo()` en [caja/services.py](caja/services.py).

- Cierre de sesión de caja:
  - Bloqueado si existen cobros pendientes; calcula y registra diferencia entre monto esperado y contado (auditoría). Ver `cerrar_sesion_caja()` en [caja/services.py](caja/services.py).

- Eliminación/Desactivación de servicios:
  - Soft delete si existen referencias; hard delete solo si no hay dependencias (consulta previa), minimizando pérdida de trazabilidad. Ver [servicios/views.py](servicios/views.py).

Decisión técnica: los controles se sitúan en services, con soporte de constraints y flags en modelos, para asegurar enforcement independientemente de la ruta de invocación.

---

## 5. VALIDACIONES EN BACKEND

Principio: el backend es la fuente de verdad. El cliente nunca es confiable.

- Capa Vista (HTTP):
  - Verificación de autenticación y rol.
  - Validaciones de formato/entrada (p. ej. tipos, rangos básicos).
  - Normalizaciones (RUT, teléfonos) donde aplique.

- Capa Services (negocio):
  - Reglas de dominio: sesión de caja para pagos, stock suficiente, estados válidos (pendiente → pagado), unicidad de hospitalización activa, etc.
  - Orquestación entre múltiples modelos en transacción atómica.

- Capa Modelos:
  - `clean()` y lógica de validación local (unicidad de microchip, rangos, campos obligatorios del dominio).
  - Flags y campos de control (p. ej. `activo`, `archivado`, `stock_descontado`).

- Base de datos (PostgreSQL):
  - `UNIQUE`, `FOREIGN KEY`, `CHECK` para defender integridad ante errores de aplicación.

Decisión técnica: validaciones redundantes en capas complementarias para defensa en profundidad; el fallo en un nivel no debe comprometer integridad.

---

## 6. PREVENCIÓN DE ACCIONES INVÁLIDAS

- Pagar sin sesión de caja activa: rechazado por service (ValidationError) → no se descuenta stock ni se cambia estado.
- Descontar stock más de una vez: bloqueado por `stock_descontado` y validaciones en `descontar_stock_insumo()`.
- Stock negativo: validación previa en services; opcionalmente refuerzo con `CHECK (stock_actual >= 0)`.
- Cerrar caja con pendientes: conteo de ventas `pendiente` impide el cierre.
- Modificar inventario sin permisos: decoradores por rol + enforcement en services.
- Eliminar entidades con referencias activas: soft delete y validaciones de dependencia previa.

Decisión técnica: usar flags de control y estados de ciclo de vida para evitar transiciones ilegales, más fácil de razonar y auditar.

---

## 7. MANEJO DE ERRORES

- Contratos de respuesta JSON uniformes:
  - Éxito: `{ "success": true, "data": { ... } }`
  - Error: `{ "success": false, "error": "mensaje" }`

- Códigos HTTP coherentes:
  - `200` OK, `400` Bad Request (validaciones), `401` Unauthorized, `403` Forbidden, `404` Not Found, `405` Method Not Allowed, `500` Server Error, `503` Service Unavailable.

- Mensajes seguros:
  - No exponen detalles internos ni datos sensibles.
  - En autenticación, mensajes genéricos para evitar enumeración de usuarios.

- Auditoría y logging:
  - Operaciones de caja con `AuditoriaCaja` (usuario, acción, timestampt, diferencias, IP). Cambios de entidades registradas vía signals (historial inmutable). Ver [caja/services.py](caja/services.py) y [historial/signals.py](historial/signals.py).

Decisión técnica: separar códigos HTTP (canal técnico) del mensaje de negocio (payload), mejorando DX y trazabilidad.

---

## 8. DEFENSAS DE PLATAFORMA

- CSRF: tokens en formularios y headers `X-CSRFToken` en requests AJAX a endpoints mutadores.
- XSS: escapado por defecto del templating de Django; evitar `safe` sin estricta revisión.
- SQL Injection: ORM de Django (parametrización por defecto). Evitar concatenar SQL crudo; cuando se use, parametrizar.
- Clickjacking: headers recomendados (`X-Frame-Options`), configurables en settings.
- Transporte: HTTPS recomendado en despliegue (TLS), con `SECURE_*` flags de Django.

Decisión técnica: aprovechar protecciones nativas de Django y ajustar cabeceras de seguridad en producción.

---

## 9. DECISIONES TÉCNICAS Y SU JUSTIFICACIÓN

- Identidad por RUT: reduce fricción y errores de digitación locales; normalización garantiza matching robusto.
- Capa de services: elimina duplicación de lógica, refuerza consistencia y simplifica testing.
- Descuento centralizado en caja: previene doble descuento y asegura correspondencia pago ↔ inventario.
- Sesión de caja obligatoria: habilita auditoría financiera (diferencias) y acota horario de operaciones.
- Soft delete condicional: preserva trazabilidad histórica sin bloquear operaciones administrativas.
- Transacciones atómicas: garantizan consistencia ACID en operaciones críticas (pago, cierre, reversas).

---

## 10. RIESGOS Y MITIGACIONES

- Operaciones concurrentes:
  - Mitigación: `transaction.atomic` y validación de estados antes de mutar; flags idempotentes.
- Errores de usuario (rol equivocado):
  - Mitigación: decoradores por rol + mensajes claros; rutas de solo lectura para perfiles restringidos.
- Datos inconsistentes históricos:
  - Mitigación: normalizaciones y validaciones progresivas; constraints DB evitan nuevos inconsistentes.
- Fugas de información por errores:
  - Mitigación: mensajes genéricos, logging privado, captura global de excepciones 500.

---

## 11. TRAZABILIDAD Y CUMPLIMIENTO

- Cada cambio relevante queda en historial con usuario, fecha, tipo de cambio y contexto (venta, consulta, hospitalización).
- Sesión de caja registra diferencias contables de forma auditable.
- Las reglas de negocio clave son verificables por inspección en services y por reportes operativos.

Resultado: un sistema con defensas en profundidad, controles consistentes, y explicabilidad operativa ante auditorías internas o externas.
