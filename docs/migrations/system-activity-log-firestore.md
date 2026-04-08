# Migracion Firestore para system_activity_log

## Objetivo

Dejar la coleccion `system_activity_log` lista para operar como registro central, cronologico e inmutable del sistema. Esta migracion define el enforcement de seguridad, los indices base y el orden recomendado de rollout antes de integrar writers o UI.

## Por que los logs son inmutables

- La bitacora central funciona como evidencia operativa y de auditoria. Permitir `update` o `delete` desde clientes romperia la trazabilidad.
- El modelo append-only evita reescrituras retrospectivas y simplifica la lectura cronologica por `occurred_at`.
- Si un evento fue emitido con datos incompletos o incorrectos, la correccion debe quedar registrada como un nuevo evento relacionado, no como mutacion silenciosa del evento original.
- El backend con Admin SDK puede seguir gestionando tareas excepcionales fuera de reglas cliente, pero la politica normal del producto queda cerrada a `create/read`.

## Reglas aplicadas

- `read`: permitido solo si el documento pertenece a la misma `organization_id` del usuario autenticado o si el usuario es admin.
- `create`: permitido solo cuando `request.resource.data.organization_id` coincide con la organizacion del usuario autenticado.
- `update` y `delete`: denegados siempre.

Este esquema replica el patron ya usado por `audit_logs` y mantiene aislamiento multi-tenant sin abrir capacidad de mutacion sobre evidencia historica.

## Indices compuestos base

### 1. `organization_id + occurred_at desc`

Soporta la vista cronologica general por organizacion:

- timeline global descendente
- listado inicial del registro central
- paginacion por fecha dentro de una organizacion

### 2. `organization_id + source_module + occurred_at desc`

Soporta consultas filtradas por modulo de origen:

- actividad de `audit`, `accounting`, `direct_actions`, `capabilities`, `terminales`
- timelines operativas por dominio funcional

### 3. `organization_id + actor_user_id + occurred_at desc`

Soporta consultas por actor humano:

- historial de acciones de un usuario
- investigacion de incidentes o revisiones de actividad individual

### 4. `organization_id + actor_department_id + occurred_at desc`

Soporta lectura por area o departamento:

- revision de actividad por departamento
- seguimiento gerencial o auditorias sectoriales

### 5. `organization_id + entity_type + entity_id + occurred_at desc`

Soporta trazabilidad de una entidad concreta:

- historial de un documento, hallazgo, accion, capability o registro de proceso
- reconstruccion cronologica de cambios y eventos vinculados a un mismo recurso

### 6. `organization_id + status + occurred_at desc`

Soporta filtros por resultado:

- eventos exitosos, denegados o fallidos
- revision de incidentes, rechazos o errores operativos

## Orden recomendado de deploy

1. Deploy de `firestore.rules`.
   Garantiza que la coleccion nazca protegida y append-only antes de cualquier writer cliente.
2. Deploy de `firestore.indexes.json`.
   Permite que las consultas cronologicas y filtradas no fallen cuando se habilite la lectura real.
3. Deploy del codigo integrador.
   Recien despues conviene activar servicios o endpoints que escriban y lean `system_activity_log`.

## Riesgos si se altera el orden

- Si se despliega codigo antes que reglas, un cliente podria intentar escribir sin enforcement explicito o fallar con permisos inconsistentes.
- Si se despliega lectura antes que indices, las consultas con filtros y `orderBy(occurred_at desc)` van a pedir creacion manual de indices en runtime.
- Si se permite mutacion del log, la bitacora deja de ser confiable como evidencia de auditoria.
