# Incidente deploy Vercel - tipo opened_at en CircuitBreaker

**Fecha:** 2026-04-08
**Proyecto:** iso18091-gobierno
**Commit con fallo en Vercel:** 4a1cadf
**Estado:** corregido en codigo (pendiente push + redeploy)

## Sintoma
TypeScript fallo en build:
- `src/lib/whatsapp/CircuitBreaker.ts:191`
- `Type 'FieldValue' is not assignable to type 'Timestamp & FieldValue'`

## Causa raiz
La combinacion de tipos en `satisfies` generaba interseccion invalida para `opened_at`.
Al usar `Partial<StoredCircuitBreakerData> & { opened_at: FieldValue }`,
TypeScript termina exigiendo simultaneamente `Timestamp` y `FieldValue`.

## Fix aplicado
Se reemplazo el tipo por:
- `Omit<Partial<StoredCircuitBreakerData>, 'opened_at'> & { opened_at: ... }`

Esto se aplico en ambos `tx.set` donde `opened_at` puede ser `FieldValue.delete()`.

Archivo modificado:
- `src/lib/whatsapp/CircuitBreaker.ts`

## Impacto WhatsApp / claves
- Relacionado con codigo de WhatsApp (circuit breaker), pero **no** con API keys.
- No requiere cambio de secretos.

## Proximo paso
1. Commit/push del fix.
2. Monitorear deploy por CLI.
3. Repetir en lotes pequenos hasta `Ready`.
