# 05 — Contabilidad Central (Plugin `contabilidad_central`)
**Actualizado:** 2026-03-27
**Decisión arquitectónica:** La UI es READ-ONLY. Los asientos los crean los plugins verticales automáticamente.

---

## Modelo mental

```
Plugin CRM crea una factura
  → llama emitAccountingEvent({ operation_type: 'crm_factura', importe: 1000 })
  → AccountingEngine busca regla para 'crm_factura'
  → Genera asiento: Debe Clientes / Haber Ventas + IVA
  → Escribe en acc_entries + acc_entry_lines (transacción atómica)
  → Queda visible en Libro Diario + Mayor + Balance

El contador NUNCA crea asientos. Solo los consulta.
```

---

## Arquitectura del motor

### AccountingEngine (`src/lib/accounting/AccountingEngine.ts`)
8 pasos de procesamiento:
1. Verificar idempotency_key (rechaza duplicados)
2. Resolver período (YYYY-MM de la fecha del evento)
3. Verificar período NO cerrado
4. Buscar regla contable activa (operation_type + plugin_id)
5. Resolver cuentas (lookup por código, verificar imputable + activa)
6. Calcular importes por línea (base + fórmula de la regla)
7. Verificar balance: `Math.round(debe*100) === Math.round(haber*100)`
8. Escribir en Firestore (transacción atómica)

### emitAccountingEvent (`src/lib/accounting/emitEvent.ts`)
Función pública que usan los plugins para emitir eventos:
```typescript
await emitAccountingEvent({
  organization_id,
  plugin_id: 'crm',
  operation_type: 'crm_factura',
  idempotency_key: `factura_${factura.id}`,
  fecha: new Date(),
  importe_total: factura.total,
  importe_neto: factura.subtotal,
  importe_iva: factura.iva,
  documento_id: factura.id,
  tercero_id: factura.cliente_id,
  moneda: 'ARS',
});
```

### OutboxService (`src/lib/accounting/outbox/OutboxService.ts`)
Tolerancia a fallos:
- Registra evento en `acc_outbox` con status `pending` antes de procesar
- Si éxito → marca `processed`
- Si falla → marca `failed` con error message
- Admin puede reprocesar fallidos vía `POST /api/accounting/reprocess-event`

### SnapshotService (`src/lib/accounting/SnapshotService.ts`)
- Pre-calcula saldos por cuenta para performance
- Se genera automáticamente al cerrar un período
- `GET /api/accounting/snapshots/auto` — genera snapshot del período actual
- Balance trial: usa snapshot si existe; calcula desde renglones si no

---

## Colecciones Firestore

| Colección | Descripción |
|---|---|
| `acc_accounts` | Plan de cuentas (código, nombre, naturaleza, tipo) |
| `acc_entries` | Cabecera de asientos (fecha, período, origen, status) |
| `acc_entry_lines` | Renglones debe/haber (cuenta, lado, importe, dimensiones) |
| `acc_rules` | Reglas contables por operation_type + plugin |
| `acc_periods` | Períodos YYYY-MM (abierto/cerrado) |
| `acc_snapshots` | Saldos pre-calculados por período y cuenta |
| `acc_outbox` | Cola de eventos (pending/processed/failed) |
| `acc_audit_log` | Log de acciones contables |

---

## Regla de saldo (NUNCA almacenar saldos)
```
saldo = SUM(lineas WHERE lado='debe') - SUM(lineas WHERE lado='haber')
// Para naturaleza pasiva/ingreso: saldo = haber - debe
```
Los saldos se derivan siempre desde `acc_entry_lines`. Los snapshots son SOLO para performance.

---

## Plan de cuentas ARG (seed)

| Código | Cuenta | Naturaleza |
|---|---|---|
| 1.1.01 | Caja | Activo |
| 1.1.02 | Bancos | Activo |
| 1.1.03 | Créditos por Ventas | Activo |
| 1.1.04 | Créditos por Financiaciones | Activo |
| 2.1.04 | IVA Débito Fiscal | Pasivo |
| 3.1.01 | Capital | Patrimonio |
| 4.1.01 | Ventas | Ingresos |
| 5.1.01 | Costo de Ventas | Egresos |

Seed completo: `src/lib/accounting/seeds/argentina-general.ts`

---

## Reglas CRM (instaladas con el plugin CRM)

| Operación | Debe | Haber |
|---|---|---|
| `crm_factura` | Clientes (1.1.03) | Ventas (4.1.01) + IVA (2.1.04) |
| `crm_cobro` | Caja (1.1.01) | Clientes (1.1.03) |
| `crm_credito_otorgado` | Créditos Financiaciones (1.1.04) | Ventas financiadas (4.1.02) |
| `crm_cuota_cobrada` | Caja (1.1.01) | Créditos Financiaciones (1.1.04) + Intereses (4.1.03) |

---

## UI (READ-ONLY)

| Página | Ruta | Qué muestra |
|---|---|---|
| Dashboard | `/contabilidad` | Estado período + saldos por naturaleza + accesos rápidos |
| Libro Diario | `/contabilidad/libro-diario` | Tabla paginada de asientos con filtro de mes |
| Mayor | `/contabilidad/mayor` | Selector de cuenta + debe/haber/saldo acumulado |
| Balance | `/contabilidad/balance` | Sumas y saldos agrupados por naturaleza + cuadra |
| Períodos | `/contabilidad/periodos` | Lista de períodos + botón cerrar (con confirmación) |

---

## APIs

| Endpoint | Descripción |
|---|---|
| `POST /api/accounting/events` | Recibe AccountingEvent (lo usan los plugins) |
| `GET /api/accounting/entries` | Libro diario paginado |
| `GET /api/accounting/accounts/:id/ledger` | Mayor de una cuenta |
| `GET /api/accounting/balance-trial` | Balance sumas y saldos |
| `POST /api/accounting/close-period` | Cierre de período |
| `GET /api/accounting/periods` | Lista de períodos |
| `POST /api/accounting/snapshots/auto` | Genera snapshot período actual |

---

## Integrar un nuevo plugin con contabilidad

1. Importar `emitAccountingEvent` desde `@/lib/accounting/emitEvent`
2. Llamar después del `await db.collection(...).add(...)` principal
3. Usar `idempotency_key` único (ej: `${operation_type}_${doc.id}`)
4. Crear regla contable en `src/lib/accounting/rules/${plugin}Rules.ts`

Ver skill `/contabilidad-eventos` para el patrón completo.
