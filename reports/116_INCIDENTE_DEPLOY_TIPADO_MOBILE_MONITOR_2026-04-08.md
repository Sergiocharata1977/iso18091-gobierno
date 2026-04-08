# Incidente deploy Vercel - tipado mobile monitor

**Fecha:** 2026-04-08
**Proyecto:** iso18091-gobierno
**Commit base con fallo:** cb0c6e2
**Estado:** Resuelto en codigo (pendiente push + redeploy)

## Sintoma
Build en Vercel fallo en TypeScript:
- `src/app/api/mobile/government/monitor/route.ts:46`
- `Argument of type 'GovMonitorMobileData' is not assignable to parameter of type 'MobileSuccessData'`

## Causa raiz
El contrato `mobileSuccessResponse` en `src/lib/mobile/operaciones/contracts.ts` definia `MobileSuccessData` con una forma que no aceptaba interfaces sin index signature explicita.
`GovMonitorMobileData` es un objeto tipado valido para respuesta JSON, pero no era compatible con ese alias.

## Correccion aplicada
Se amplio el alias a `type MobileSuccessData = unknown;` para permitir respuestas JSON tipadas sin forzar index signature artificial.

Archivo modificado:
- `src/lib/mobile/operaciones/contracts.ts`

## Impacto WhatsApp / claves
- No relacionado con WhatsApp.
- No relacionado con variables secretas ni credenciales.

## Siguiente paso operativo
1. Commit y push del cambio.
2. Redeploy en Vercel sobre el nuevo commit.
3. Si aparece un nuevo error, abrir nuevo reporte sin sobreescribir este incidente.
