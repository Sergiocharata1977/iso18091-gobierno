# Twilio WhatsApp Setup

Guia operativa para activar el envio de WhatsApp del proyecto con Twilio.

## Estado verificado en el codigo

- El envio real usado por `src/app/api/public/solicitudes/route.ts` y `src/app/api/solicitudes/[id]/route.ts` pasa por `src/services/whatsapp/WhatsAppService.ts` -> `src/services/whatsapp/TwilioClient.ts`.
- Las env vars requeridas son `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y `TWILIO_WHATSAPP_NUMBER`.
- El formato efectivo que Twilio recibe es `whatsapp:+<E164>`.
- En `src/app/api/public/solicitudes/route.ts` el envio esta aislado con `try/catch`, asi que un fallo de WhatsApp no rompe el alta de la solicitud.
- En `src/app/api/solicitudes/[id]/route.ts` el cambio de estado usa `void sendMessage(...).catch(...)`, que si es fire-and-forget.

## Variables de entorno para Vercel

Configurar estas variables en Vercel para `Preview` y `Production`:

```env
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

Notas:

- `TWILIO_ACCOUNT_SID`: empieza con `AC`.
- `TWILIO_AUTH_TOKEN`: secreto de la cuenta Twilio.
- `TWILIO_WHATSAPP_NUMBER`: numero origen del canal WhatsApp en formato E.164.
- En sandbox de Twilio suele ser `+14155238886`.
- En produccion puede ser el numero aprobado por Twilio/WhatsApp. No guardar el prefijo `whatsapp:` en Vercel; el codigo lo agrega.
- Para numeros argentinos, cargar destino/origen en formato internacional. Ejemplo recomendado: `+5491123456789`.

## Como obtener cada valor en Twilio Console

1. Entrar a [Twilio Console](https://console.twilio.com/).
2. Copiar `Account SID` desde la pantalla principal del proyecto.
3. Abrir `Account Info` o `API Keys & Tokens` y revelar/copiar `Auth Token`.
4. Entrar a [Try WhatsApp / Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn) o a la configuracion de tu remitente WhatsApp.
5. Copiar el numero WhatsApp asignado por Twilio.

Referencia oficial de Twilio:

- Quickstart de WhatsApp: https://www.twilio.com/docs/whatsapp/quickstart
- Seguridad de webhooks: https://www.twilio.com/docs/usage/webhooks/webhooks-security

## Sandbox de WhatsApp para test local

1. En Twilio Console abrir `Messaging > Try it out > Send a WhatsApp message`.
2. Tomar el codigo `join ...` que muestra el sandbox.
3. Desde el telefono de prueba enviar ese `join <codigo>` al numero sandbox de Twilio.
4. Exponer tu app local con ngrok:

```bash
ngrok http 3000
```

5. Configurar en Twilio Sandbox:

- `When a message comes in`: `https://TU-NGROK.ngrok-free.app/api/whatsapp/webhook`
- `Status callback URL`:
  `https://TU-NGROK.ngrok-free.app/api/whatsapp/webhook`

6. Guardar cambios.
7. Verificar localmente:

- `GET /api/whatsapp/webhook` debe responder estado OK.
- Un mensaje entrante al sandbox debe llegar al endpoint `POST /api/whatsapp/webhook`.

## Test manual contra /api/public/solicitudes

Reemplazar `https://tu-app.vercel.app` por la URL real y `tenant-demo` por el tenant correcto.

```bash
curl -X POST "https://tu-app.vercel.app/api/public/solicitudes" ^
  -H "Content-Type: application/json" ^
  -d "{\"tenant_slug\":\"tenant-demo\",\"tipo\":\"servicio\",\"nombre\":\"Cliente Test\",\"telefono\":\"+5491123456789\",\"email\":\"cliente.test@example.com\",\"cuit\":\"20-12345678-9\",\"maquina_tipo\":\"Tractor\",\"modelo\":\"AX-100\",\"numero_serie\":\"SERIE-123\",\"descripcion_problema\":\"La maquina no enciende desde ayer y necesita revision tecnica.\",\"localidad\":\"Rosario\",\"provincia\":\"Santa Fe\"}"
```

Esperado:

- HTTP `201`
- `success: true`
- Se crea la solicitud
- Sale WhatsApp al operario si la organizacion tiene `whatsapp_notificaciones_dealer`
- Sale WhatsApp al cliente si `telefono` es valido

## Checklist de verificacion

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y `TWILIO_WHATSAPP_NUMBER` estan cargadas en Vercel.
- `TWILIO_WHATSAPP_NUMBER` coincide con el remitente activo de Twilio.
- El telefono del operario en Firestore (`organizations.whatsapp_notificaciones_dealer`) existe y tiene formato internacional.
- La solicitud publica responde `201`.
- El operario recibe el mensaje de nueva solicitud.
- El cliente recibe el mensaje de confirmacion.
- En cambio de estado de una solicitud, el cliente recibe la notificacion correspondiente.
- Si Twilio falla, la solicitud igual se registra y el error queda logueado.

## Hallazgos corregidos

- `src/lib/whatsapp/WhatsAppClient.ts` estaba apuntando a Meta Graph API y no a Twilio; se alineo con el cliente Twilio real para evitar configuraciones engañosas.
- `src/services/whatsapp/TwilioClient.ts` ahora lee las env vars en tiempo de uso y normaliza mejor numeros con `+`, `00`, `whatsapp:` y formatos locales.
- `src/app/api/whatsapp/send/route.ts` ahora valida tambien `TWILIO_WHATSAPP_NUMBER`.
