# Incidente deploy Vercel - recommended_action opcional en monitor

**Fecha:** 2026-04-08
**Proyecto:** iso18091-gobierno
**Commit con fallo en Vercel:** 86ab73a
**Estado:** corregido en codigo (pendiente push + redeploy)

## Sintoma
TypeScript fallo en build:
- `src/lib/gov/monitor-assembler.ts:337`
- `Type 'string | undefined' is not assignable to type 'string'`

## Causa raiz
`alert.recommended_action` puede venir `undefined` en `executive_alerts`,
pero el campo `reason` del gap exige `string` obligatorio.

## Fix aplicado
Se introdujo fallback local `recommendedAction` y se reutiliza en:
- `reason`
- `suggested_action`

Archivo modificado:
- `src/lib/gov/monitor-assembler.ts`

## Impacto WhatsApp / claves
- No relacionado con WhatsApp.
- No relacionado con secretos ni variables de entorno.

## Proximo paso
1. Commit/push de este fix.
2. Monitoreo con `vercel ls iso18091-gobierno` y `vercel inspect <url> --logs`.
3. Repetir por lotes pequenos hasta `Ready`.
