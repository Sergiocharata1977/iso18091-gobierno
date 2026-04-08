# API CRM

Fecha de relevamiento: 2026-02-19
Base path: `/api/crm`

## Endpoints documentados

### GET `/api/crm/clientes`

Obtiene clientes activos de la organizacion.

**Query Parameters:**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `organization_id` | string | Condicional | Requerido para `super_admin` si no tiene org en sesion |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "cliente_1",
      "razon_social": "Acme SA",
      "organization_id": "org_1"
    }
  ]
}
```

**Response (400):**

```json
{
  "success": false,
  "error": "organization_id es requerido"
}
```

**Response (500):**

```json
{
  "success": false,
  "error": "Failed to get clientes"
}
```

### POST `/api/crm/clientes`

Crea un cliente CRM y asigna estado inicial de kanban.

**Body Parameters (principales):**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `organization_id` | string | Condicional | Para `super_admin`; para otros roles se toma de sesion |
| `razon_social` | string | Si | Razon social del cliente |
| `cuit_cuil` | string | Si | Identificacion fiscal |
| `tipo_cliente` | string | Si | Tipo de cliente |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "cliente_1",
    "organization_id": "org_1",
    "isActive": true
  }
}
```

**Response (400):**

```json
{
  "success": false,
  "error": "organization_id es requerido"
}
```

**Response (500):**

```json
{
  "success": false,
  "error": "Failed to create cliente"
}
```

### GET `/api/crm/clientes/[id]`

Obtiene un cliente por ID.

**Path Parameters:**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `id` | string | Si | ID del cliente |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "cliente_1",
    "razon_social": "Acme SA"
  }
}
```

**Response (404):**

```json
{
  "success": false,
  "error": "Cliente no encontrado"
}
```

**Response (403):**

```json
{
  "success": false,
  "error": "Acceso denegado"
}
```

### PUT `/api/crm/clientes/[id]`

Actualiza un cliente por ID.

**Path Parameters:**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `id` | string | Si | ID del cliente |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "cliente_1"
  },
  "message": "Cliente actualizado exitosamente"
}
```

**Response (400):**

```json
{
  "success": false,
  "error": "Validation error"
}
```

**Response (500):**

```json
{
  "success": false,
  "error": "Failed to update cliente"
}
```

### DELETE `/api/crm/clientes/[id]`

Elimina un cliente por ID.

**Path Parameters:**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `id` | string | Si | ID del cliente |

**Response (200):**

```json
{
  "success": true,
  "message": "Cliente eliminado exitosamente"
}
```

**Response (404):**

```json
{
  "success": false,
  "error": "Cliente no encontrado"
}
```

### GET `/api/crm/contactos`

Lista contactos por organizacion y opcionalmente por cliente CRM.

**Query Parameters:**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `organization_id` | string | Condicional | Requerido para `super_admin` sin org en sesion |
| `crm_organizacion_id` | string | No | Filtra contactos por cliente CRM |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "contacto_1",
      "nombre": "Juan",
      "telefono": "5491111111111"
    }
  ]
}
```

**Response (400):**

```json
{
  "success": false,
  "error": "organization_id es requerido"
}
```

### POST `/api/crm/contactos`

Crea un contacto.

**Body Parameters (principales):**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `organization_id` | string | Condicional | Para `super_admin`; para otros roles se toma de sesion |
| `nombre` | string | Si | Nombre del contacto |
| `telefono` | string | Si | Telefono del contacto |
| `crm_organizacion_id` | string | No | Vinculo a cliente CRM |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "contacto_1",
    "nombre": "Juan"
  }
}
```

**Response (400):**

```json
{
  "success": false,
  "error": "nombre y telefono son requeridos"
}
```

### GET `/api/crm/acciones`

Lista acciones comerciales.

**Query Parameters:**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `organization_id` | string | Condicional | Requerido para `super_admin` sin org en sesion |
| `cliente_id` | string | No | Filtra por cliente |
| `oportunidad_id` | string | No | Filtra por oportunidad |
| `vendedor_id` | string | No | Filtra por vendedor |
| `tipo` | string | No | Filtra por tipo de accion |
| `estado` | string | No | Filtra por estado |
| `fecha_desde` | string | No | Filtro por fecha minima (`createdAt >=`) |
| `limit` | number | No | Limite de resultados (default 50) |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "accion_1",
      "titulo": "Llamada inicial",
      "estado": "programada"
    }
  ]
}
```

**Response (400):**

```json
{
  "success": false,
  "error": "organization_id requerido"
}
```

### POST `/api/crm/acciones`

Crea una accion comercial. Si incluye telefono de vendedor, encola `task.assign`.

**Body Parameters (principales):**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `organization_id` | string | Condicional | Para `super_admin`; para otros roles se toma de sesion |
| `titulo` | string | No | Titulo de accion |
| `tipo` | string | No | Tipo de accion |
| `estado` | string | No | Estado inicial; default `programada` |
| `vendedor_phone` | string | No | Si viene, se encola job de agente |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "accion_1",
    "estado": "programada"
  }
}
```

**Response (400):**

```json
{
  "success": false,
  "error": "organization_id requerido"
}
```

### GET `/api/crm/oportunidades`

Lista oportunidades.

**Query Parameters:**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `organization_id` | string | Condicional | Requerido para `super_admin` sin org en sesion |
| `estado_kanban_id` | string | No | Filtra por estado de kanban |
| `vendedor_id` | string | No | Filtra por vendedor |
| `crm_organizacion_id` | string | No | Filtra por cliente CRM |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "opp_1",
      "nombre": "Venta fertilizante"
    }
  ]
}
```

**Response (400):**

```json
{
  "success": false,
  "error": "organization_id es requerido"
}
```

### POST `/api/crm/oportunidades`

Crea oportunidad CRM.

**Body Parameters (principales):**

| Param | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `organization_id` | string | Condicional | Para `super_admin`; para otros roles se toma de sesion |
| `nombre` | string | Si | Nombre de la oportunidad |
| `crm_organizacion_id` | string | Si | Cliente CRM asociado |
| `monto_estimado` | number | No | Monto estimado |
| `probabilidad` | number | No | Probabilidad de cierre |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "opp_1",
    "nombre": "Venta fertilizante"
  }
}
```

**Response (400):**

```json
{
  "success": false,
  "error": "organization_id, nombre y crm_organizacion_id son requeridos"
}
```

### GET `/api/crm/kanban`

Estado: **No implementado**.

Notas:
- No existe `src/app/api/crm/kanban/route.ts`.
- Rutas operativas actuales del modulo kanban:
  - `GET /api/crm/kanban/estados`
  - `POST /api/crm/kanban/mover`
  - `POST /api/crm/kanban/reset`
