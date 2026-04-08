# Incidente deploy Vercel - PluginDeploymentMode invalido

**Fecha:** 2026-04-08
**Proyecto:** iso18091-gobierno
**Commit con fallo en Vercel:** 98538cc
**Estado:** corregido en codigo (pendiente push + redeploy)

## Sintoma
TypeScript fallo en build:
- `src/config/plugins/pack_gov.manifest.ts:54`
- `Type '"dedicated_government"' is not assignable to type 'PluginDeploymentMode'`

## Causa raiz
El manifiesto `pack_gov` usaba un valor no permitido por el contrato de tipos.
`PluginDeploymentMode` solo acepta: `shared_saas | single_tenant | hybrid`.

## Fix aplicado
Se cambio en `pack_gov.manifest.ts`:
- de: `deployment_modes: ['shared_saas', 'dedicated_government']`
- a: `deployment_modes: ['shared_saas', 'single_tenant']`

## Impacto WhatsApp / claves
- No relacionado con WhatsApp.
- No relacionado con secretos ni variables de entorno.

## Proximo paso
1. Commit y push de este fix.
2. Verificar deploy por CLI (`vercel ls iso18091-gobierno`).
3. Si aparece otro error, abrir nuevo reporte y repetir estrategia incremental.
