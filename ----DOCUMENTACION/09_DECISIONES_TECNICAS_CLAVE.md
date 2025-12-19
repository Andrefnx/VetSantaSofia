# 09. DECISIONES TÉCNICAS CLAVE

Este documento enumera las decisiones técnicas principales del sistema y, para cada una, expone su justificación, beneficios y riesgos mitigados. El enfoque es práctico y alineado al contexto operativo de VetSantaSofia.

---

## 1) Framework: Django (MVT + Templates + APIs JSON)

- Justificación: 
  - Marco maduro con autenticación, CSRF, ORM, migraciones y administración integrados, que acelera entregas sin sacrificar seguridad.
  - Patrón MVT encaja con el modelo de negocio (formularios, flujos administrativos) y facilita un híbrido SSR + JSON para interactividad.
- Beneficio:
  - Productividad alta (menos boilerplate) y consistencia transversal (auth, sesiones, middlewares, señales).
  - Seguridad out‑of‑the‑box (CSRF, escaping, ORM parametrizado) y ecosistema probado.
- Riesgo mitigado:
  - Implementaciones ad‑hoc inseguras (auth/CSRF), duplicación de lógica y vulnerabilidades por código artesanal.

---

## 2) Base de datos: PostgreSQL (producción) / SQLite (desarrollo)

- Justificación:
  - PostgreSQL ofrece ACID robusto, buenas capacidades de indexación, constraints avanzados, y opciones como JSONB cuando se requiera flexibilidad.
  - SQLite simplifica ambientes locales sin sobrecargar la entrada al proyecto.
- Beneficio:
  - Integridad y rendimiento adecuados para cargas de clínica mediana; camino claro a tunning (índices, autovacuum, pgbouncer, réplicas read‑only).
  - Fricción mínima para desarrollo y pruebas tempranas.
- Riesgo mitigado:
  - Corrupción/inkonsistencias por falta de constraints, y bloqueos a futuro por motores menos capaces.

---

## 3) ORM: Django ORM

- Justificación:
  - Abstracción de acceso a datos con migraciones, transacciones y parametrización que disminuye superficie de ataque (inyección SQL) y errores de query manuales.
- Beneficio:
  - Mantenibilidad y portabilidad; tooling de migraciones, `select_related/prefetch_related` para rendimiento y una curva de aprendizaje conocida por el equipo.
- Riesgo mitigado:
  - Inyección SQL, divergencia entre esquema y modelo, y migraciones manuales que rompen entornos.

---

## 4) Soft Delete en entidades transaccionales (p. ej., Servicios, Pacientes, Insumos)

- Justificación:
  - En dominios clínicos/financieros, la eliminación física rompe trazabilidad y auditoría. El soft delete (flags `activo`/`archivado`) preserva historia y relaciones.
- Beneficio:
  - Auditoría histórica confiable, reversibilidad operativa, reportes coherentes en el tiempo y no repudio.
- Riesgo mitigado:
  - Pérdida permanente de evidencia, referencias rotas (FK) y no conformidad con exigencias de conservación de registros.

---

## 5) Sesión de caja obligatoria para pagos

- Justificación:
  - El efectivo necesita un perímetro operativo (apertura→operación→cierre) para conciliar diferencias, asignar responsabilidad y acotar horario de transacciones.
- Beneficio:
  - Auditoría financiera por período, cálculo automático de diferencias (monto esperado vs contado) y gating de operaciones críticas.
- Riesgo mitigado:
  - Fraude/faltantes no detectados, pagos fuera de horario y descuentos de stock sin control. Evita doble cobro mediante estados y validaciones en el flujo.

---

## 6) Validaciones en backend y defensa en profundidad (Vista + Services + Modelo + BD)

- Justificación:
  - El cliente no es confiable. Las reglas de negocio deben centralizarse en services para consistencia, y redundarse con validaciones de modelo y constraints en BD.
- Beneficio:
  - Consistencia transversal, reusabilidad de reglas, atomicidad (`@transaction.atomic`) en flujos críticos (pago/stock) y pruebas unitarias directas de negocio.
- Riesgo mitigado:
  - Bypass por rutas alternativas, estados inválidos (p. ej., stock negativo, pagar sin sesión), efectos parciales sin transacción y drift entre capas.

---

## Notas complementarias (derivadas de las decisiones anteriores)

- Descuento de stock centralizado en caja/services:
  - Beneficio: evita dobles descuentos y asegura que el inventario solo cambie si el pago se confirma dentro de una transacción.
  - Riesgo mitigado: inconsistencias entre clínica y caja.
- Arquitectura híbrida SSR + JSON:
  - Beneficio: primeras cargas rápidas y operaciones dinámicas eficientes, permitiendo optimizar sin reescrituras masivas.
  - Riesgo mitigado: cuellos por render clientes pesados o por full reload innecesario.

Estas decisiones priorizan consistencia, seguridad y trazabilidad, manteniendo a la vez una ruta clara de evolución (índices, caché, colas, réplicas) sin incurrir en complejidad prematura.
