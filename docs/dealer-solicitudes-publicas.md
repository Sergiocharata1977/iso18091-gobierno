# Solicitudes dealer publicas

Endpoint unico: `POST /api/public/solicitudes`

Configuracion requerida:

- `DEALER_PUBLIC_ORGANIZATION_ID`: organizacion destino donde se valida la capability `dealer_solicitudes` y se guarda la solicitud.

Contrato base:

```json
{
  "tipo": "repuesto | servicio | comercial",
  "nombre": "Juan Perez",
  "telefono": "+54 9 11 5555 5555",
  "email": "juan@cliente.com",
  "cuit": "20-12345678-9"
}
```

Payload `repuesto`:

```json
{
  "tipo": "repuesto",
  "nombre": "Juan Perez",
  "telefono": "+54 9 11 5555 5555",
  "email": "juan@cliente.com",
  "cuit": "",
  "maquina_tipo": "Cosechadora",
  "modelo": "AX 750",
  "numero_serie": "SER-123",
  "descripcion_repuesto": "Necesito filtro hidraulico y kit de retenes."
}
```

Payload `servicio`:

```json
{
  "tipo": "servicio",
  "nombre": "Juan Perez",
  "telefono": "+54 9 11 5555 5555",
  "email": "juan@cliente.com",
  "cuit": "",
  "maquina_tipo": "Tractor",
  "modelo": "T120",
  "numero_serie": "SER-987",
  "descripcion_problema": "Pierde presion hidraulica despues de 30 minutos.",
  "localidad": "Rafaela",
  "provincia": "Santa Fe"
}
```

Payload `comercial`:

```json
{
  "tipo": "comercial",
  "nombre": "Juan Perez",
  "telefono": "+54 9 11 5555 5555",
  "email": "juan@cliente.com",
  "cuit": "",
  "producto_interes": "Sembradora Serie S",
  "requiere_financiacion": true,
  "comentarios": "Necesito cotizacion y opciones de financiacion para abril."
}
```

Respuesta exitosa:

```json
{
  "success": true,
  "id": "firestore-doc-id",
  "numeroSolicitud": "SOL-20260307-ABC123",
  "tipo": "servicio",
  "message": "Solicitud registrada correctamente"
}
```

Notas:

- Los formularios envian campos anti-spam opcionales: `website` y `form_started_at`.
- El backend guarda la solicitud en `organizations/{organizationId}/solicitudes`.
