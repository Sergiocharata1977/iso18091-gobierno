# Incidente deploy Vercel - validationRules opcional en voiceFormFiller

**Fecha:** 2026-04-08
**Proyecto:** iso18091-gobierno
**Commit con fallo en Vercel:** e99905c
**Estado:** corregido en codigo (pendiente push + redeploy)

## Sintoma
TypeScript fallo en build:
- `src/services/ai-core/voiceFormFiller.ts:495`
- `FieldValidationRule[] | undefined` no asignable a `FieldValidationRule[]`

## Causa raiz
`validationRules` es opcional en `options`, pero se enviaba a `validateAll` con una guarda que no estrechaba el tipo de forma suficiente para el compilador.

## Fix aplicado
Se cambio la condicion a una guarda explicita:
- de: `if ((validationRules?.length ?? 0) > 0)`
- a: `if (validationRules && validationRules.length > 0)`

Archivo modificado:
- `src/services/ai-core/voiceFormFiller.ts`

## Impacto WhatsApp / claves
- No relacionado con WhatsApp.
- No relacionado con secretos.

## Proximo paso
1. Commit/push del fix.
2. Monitorear deploy por CLI y seguir en lotes pequenos.
