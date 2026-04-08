# API Contratos Agro v1

## Endpoint base
`/api/agro/[collection]` y `/api/agro/[collection]/[id]`

## Colecciones soportadas
- `field_logbooks`
- `treatments`
- `irrigation_plans`
- `subplots`
- `sensor_readings`
- `profitability_snapshots`

## Metodos
1. `GET /api/agro/[collection]?organization_id=<org>&limit=<n>`
2. `POST /api/agro/[collection]`
3. `GET /api/agro/[collection]/[id]`
4. `PATCH /api/agro/[collection]/[id]`
5. `DELETE /api/agro/[collection]/[id]`

## Reglas de alcance
- Usuarios no `super_admin` solo operan sobre su organizacion activa.
- `super_admin` puede pasar `organization_id`.
- `organization_id` de payload se normaliza en backend.

## Payloads de creacion
### `field_logbooks`
```json
{
  "season": "2025-2026",
  "field_name": "Lote Norte",
  "event_date": "2026-02-14T10:00:00.000Z",
  "weather": { "temperature_c": 24, "humidity_pct": 68, "notes": "estable" },
  "observations": "Monitoreo sin incidencias"
}
```

### `treatments`
```json
{
  "logbook_id": "abc",
  "subplot_id": "xyz",
  "treatment_type": "fertilization",
  "product_name": "NPK 20-20-20",
  "dose": 2.5,
  "dose_unit": "kg/ha",
  "application_date": "2026-02-14T10:00:00.000Z",
  "operator_user_id": "uid_1",
  "notes": "aplicacion uniforme"
}
```

### `irrigation_plans`
```json
{
  "subplot_id": "xyz",
  "start_date": "2026-02-14T10:00:00.000Z",
  "end_date": "2026-02-21T10:00:00.000Z",
  "target_moisture_pct": 45,
  "method": "drip",
  "frequency_hours": 24,
  "status": "active"
}
```

### `subplots`
```json
{
  "field_name": "Lote Norte",
  "name": "Subparcela 1",
  "area_ha": 12.5,
  "crop": "soja",
  "planting_date": "2026-02-14T10:00:00.000Z",
  "soil_type": "franco arcilloso",
  "geojson": null
}
```

### `sensor_readings`
```json
{
  "subplot_id": "xyz",
  "sensor_id": "SEN-01",
  "metric": "soil_moisture",
  "value": 41.2,
  "unit": "%",
  "measured_at": "2026-02-14T10:00:00.000Z",
  "source": "iot"
}
```

### `profitability_snapshots`
```json
{
  "season": "2025-2026",
  "subplot_id": "xyz",
  "currency": "ARS",
  "revenue": 15000000,
  "costs": 11200000,
  "generated_at": "2026-02-14T10:00:00.000Z"
}
```

`margin` y `margin_pct` se calculan en backend.
