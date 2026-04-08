# Incidente deploy Vercel - UTF-8 invalido

**Fecha:** 2026-04-08  
**Proyecto:** iso18091-gobierno  
**Estado:** Resuelto en codigo (pendiente push + redeploy)

## Resumen
El deploy fallo en Vercel durante `next build` con error:
- `stream did not contain valid UTF-8`

Archivos reportados por Vercel:
- `src/services/auth/UserService.ts`
- `src/app/api/demo-requests/activate/route.ts`
- `src/services/whatsapp/WhatsAppService.ts`

## Causa raiz
Los archivos tenian mezcla de codificacion UTF-8 + bytes sueltos Windows-1252 (acentos aislados).
Webpack/Next en Vercel exige UTF-8 valido y corta la compilacion al encontrar bytes invalidos.

## Accion aplicada
Se normalizaron esos 3 archivos a UTF-8 valido.
No se modifico logica funcional; solo normalizacion de texto/codificacion.

## Verificacion
- Verificacion binaria local: los 3 archivos ahora pasan decode estricto UTF-8.
- El build local no pudo ejecutarse en esta maquina por falta de espacio (`ENOSPC`) al instalar dependencias.

## WhatsApp / claves
- **No** se detecto fallo por credenciales de WhatsApp.
- **No** se detecto fallo por variables secretas en este incidente.
- Un archivo afectado fue `WhatsAppService.ts`, pero el error era de codificacion de fuente, no de API key.

## Pendiente operativo
1. Hacer commit de los 3 archivos corregidos.
2. Push a GitHub (rama que usa Vercel).
3. Redeploy en Vercel (Build remoto).
4. Si aparece un error nuevo, registrarlo en un nuevo reporte con log completo.
