# Incidente deploy Vercel - tipo User exige getIdToken

**Fecha:** 2026-04-08
**Proyecto:** iso18091-gobierno
**Commit con fallo en Vercel:** 51f4f58
**Estado:** corregido en codigo (pendiente push + redeploy)

## Sintoma
TypeScript fallo en build:
- `src/services/auth/UserService.ts:103`
- objeto de usuario no asignable a `User` por faltar `getIdToken`

## Causa raiz
El tipo `User` en `src/types/auth.ts` mezclaba modelo de usuario de Firestore con capacidad de Firebase Auth (`getIdToken`), obligatoria para todos los casos.

## Fix aplicado
Se hizo `getIdToken` opcional en `User`:
- de: `getIdToken: () => Promise<string>`
- a: `getIdToken?: () => Promise<string>`

Archivo modificado:
- `src/types/auth.ts`

## Impacto WhatsApp / claves
- No relacionado con WhatsApp.
- No relacionado con secretos.

## Proximo paso
1. Commit/push del fix.
2. Monitoreo por Vercel CLI.
3. Repetir ciclo incremental hasta `Ready`.
