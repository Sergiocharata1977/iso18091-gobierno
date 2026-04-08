# Meta WhatsApp Business API — Webhook Setup

Guía de configuración completa para conectar Don Cándido con WhatsApp Business
a través de la Meta Graph API v19.0.

---

## 1. Variables de entorno necesarias

Agregar al archivo `.env.local` (desarrollo) y a las variables de entorno de Vercel (producción).

| Variable                  | Descripción                                                                       | Cómo obtener                                                                                                              |
|---------------------------|-----------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| `WHATSAPP_VERIFY_TOKEN`   | Token secreto que Meta usará para verificar tu webhook (puedes inventarlo tú)     | Generalo tú mismo: `openssl rand -hex 20` o cualquier string largo aleatorio. Lo pondrás también en Meta Developer Console |
| `WHATSAPP_APP_SECRET`     | App Secret de la Meta App (se usa para verificar la firma HMAC de cada POST)      | Meta Developer Console → Tu App → Settings → Basic → App Secret                                                          |
| `WHATSAPP_ACCESS_TOKEN`   | Token de acceso permanente con permisos `whatsapp_business_messaging`             | Meta Developer Console → Tu App → WhatsApp → API Setup → Temporary or Permanent Token                                    |
| `WHATSAPP_PHONE_NUMBER_ID`| ID numérico del número de teléfono WhatsApp Business (Phone Number ID)            | Meta Developer Console → Tu App → WhatsApp → API Setup → Phone Number ID                                                 |

> Nota: `WHATSAPP_PHONE_NUMBER_ID` no se usa directamente en el webhook receptor
> (el ID viene en el payload de Meta). Se usa en el cliente para envíos proactivos.
> El webhook resuelve el Phone Number ID desde Firestore (`whatsapp_phone_number_id` o
> `whatsapp_config.phone_number_id` en el documento de la organización).

Ejemplo `.env.local`:

```
WHATSAPP_VERIFY_TOKEN=mi-token-secreto-largo-aleatorio
WHATSAPP_APP_SECRET=abc123def456...
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
```

---

## 2. Configurar el webhook en Meta Developer Console

1. Ir a [https://developers.facebook.com](https://developers.facebook.com) → seleccionar tu App.
2. Navegar a **WhatsApp** → **Configuration** (o **Webhooks** en el menú lateral).
3. En el campo **Callback URL** ingresar la URL del webhook:
   ```
   https://<tu-dominio>/api/public/whatsapp/webhook
   ```
   Ejemplo de producción:
   ```
   https://app.tudominio.com/api/public/whatsapp/webhook
   ```
4. En el campo **Verify Token** ingresar el valor de tu `WHATSAPP_VERIFY_TOKEN`.
5. Hacer click en **Verify and Save**.
   - Meta enviará un GET con `hub.mode=subscribe`, `hub.verify_token` y `hub.challenge`.
   - El servidor responderá con el challenge si el token coincide (HTTP 200).
6. Una vez verificado, suscribirse al campo **messages** (marcar el checkbox).

---

## 3. Configurar el número de WhatsApp Business en Firestore

El webhook resuelve la organización buscando el Phone Number ID en Firestore.
Agregar uno de los siguientes campos al documento `organizations/{orgId}`:

**Opción A** (campo directo):
```json
{
  "whatsapp_phone_number_id": "123456789012345"
}
```

**Opción B** (objeto de configuración):
```json
{
  "whatsapp_config": {
    "phone_number_id": "123456789012345",
    "display_phone_number": "+54 9 11 xxxx-xxxx"
  }
}
```

El webhook intentará las tres variantes en paralelo y usará la primera que encuentre.

---

## 4. Test de verificación GET (curl)

Reemplazar `<TU_VERIFY_TOKEN>` con el valor de tu variable `WHATSAPP_VERIFY_TOKEN`.

```bash
curl -i "https://app.tudominio.com/api/public/whatsapp/webhook\
?hub.mode=subscribe\
&hub.verify_token=<TU_VERIFY_TOKEN>\
&hub.challenge=test_challenge_12345"
```

Respuesta esperada:
```
HTTP/2 200
content-type: text/plain

test_challenge_12345
```

Si responde `403 Verification failed`, verificar que `WHATSAPP_VERIFY_TOKEN` esté
correctamente configurada en el entorno del servidor.

---

## 5. Test de mensaje POST (curl)

Este test simula un mensaje entrante de WhatsApp. Requiere calcular el HMAC correcto.

### Generar el HMAC (en bash, reemplazar `<APP_SECRET>`):
```bash
APP_SECRET="<APP_SECRET>"
BODY='{"object":"whatsapp_business_account","entry":[{"id":"WABA_ID","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"+54911XXXXXXXX","phone_number_id":"123456789012345"},"phone_number_id":"123456789012345","messages":[{"from":"5491155555555","id":"wamid.test001","timestamp":"1700000000","text":{"body":"Hola Don Candido"},"type":"text"}]},"field":"messages"}]}]}'
SIG="sha256=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$APP_SECRET" | awk '{print $2}')"
echo "Signature: $SIG"
```

### Enviar el POST:
```bash
curl -i -X POST "https://app.tudominio.com/api/public/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: $SIG" \
  -d "$BODY"
```

Respuesta esperada:
```json
{"success":true}
```

El servidor responde 200 inmediatamente. El procesamiento (llamada a Don Cándido +
envío de respuesta a Meta) ocurre de forma asíncrona.

Si responde `401 Invalid signature`, verificar que `WHATSAPP_APP_SECRET` coincida
con el App Secret de la Meta App.

---

## 6. Checklist final: flujo completo

```
Usuario envía WhatsApp
        |
        v
Meta Graph API recibe el mensaje
        |
        v
Meta envia POST a /api/public/whatsapp/webhook
  - Header: x-hub-signature-256: sha256=...
  - Body: JSON con entry[].changes[].value.messages[]
        |
        v
Webhook verifica HMAC (WHATSAPP_APP_SECRET) ──── FALLA → 401
        |
        v
Webhook responde 200 inmediatamente a Meta
        |
        v (fire-and-forget)
processWebhook() async:
  1. Extrae phone_number_id del payload
  2. Busca la organización en Firestore por phone_number_id
  3. Para cada mensaje de tipo "text":
     a. Normaliza el número del remitente (extractPhoneNumber)
     b. Llama a WhatsAppAdapter.handleIncoming()
        - Resuelve identidad (channel_identity_links en Firestore)
        - Verifica permisos (AIPolicyEngine)
        - Deduplicación idempotente (ai_idempotency_keys en Firestore)
        - Llama a UnifiedConverseService (LLMRouter → Claude / Groq)
        - Retorna el texto de respuesta del asistente
     c. Crea o reutiliza conversación en whatsapp_conversations
     d. Envía respuesta via Meta Graph API v19.0:
        POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
        Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
     e. Guarda el mensaje saliente en whatsapp_messages
        |
        v
Usuario recibe respuesta de Don Cándido en WhatsApp
```

---

## 7. Troubleshooting

### El webhook no verifica (Meta muestra error al guardar)

- Verificar que la URL sea accesible desde internet (no localhost).
- Verificar que `WHATSAPP_VERIFY_TOKEN` esté configurada en el servidor.
- Probar con el curl del paso 4.
- En desarrollo local, usar [ngrok](https://ngrok.com): `ngrok http 3000`.

### Error 401 en el POST (Invalid signature)

- `WHATSAPP_APP_SECRET` no coincide con el App Secret de Meta.
- El body fue modificado en tránsito (por ejemplo, por un proxy que re-serializa el JSON).
  El HMAC se calcula sobre el body crudo tal como llega; el webhook usa `request.text()`.

### El bot no responde al WhatsApp

1. Verificar logs del servidor para errores en `[Public WhatsApp Webhook]`.
2. Verificar que el `phone_number_id` del payload exista en Firestore:
   ```
   organizations/{orgId}.whatsapp_phone_number_id = "123456789012345"
   ```
3. Verificar que `WHATSAPP_ACCESS_TOKEN` no haya expirado (los tokens temporales
   duran 24 hs; usar tokens de sistema permanentes en producción).
4. Verificar que la App tenga el permiso `whatsapp_business_messaging` aprobado.

### Error de Meta: "Message failed to send because more than 24 hours have passed..."

WhatsApp Business solo permite mensajes libres dentro de las 24 hs posteriores
al último mensaje del usuario. Pasado ese tiempo, se requieren plantillas aprobadas.
Don Cándido solo envía respuestas reactivas, por lo que esto no debería ocurrir en
el flujo normal.

### UnifiedConverseService devuelve null / no genera respuesta

- Verificar variables de entorno del LLM: `ANTHROPIC_API_KEY` o `GROQ_API_KEY`.
- Verificar que la organización exista en Firestore y tenga configuración válida.
- El adapter retorna `null` si el usuario no tiene permisos (AIPolicyEngine bloquea
  acciones como "aprobar documento" o "eliminar proceso" para roles sin elevación).

### Mensajes duplicados

La deduplicación idempotente usa `ai_idempotency_keys` en Firestore con TTL de 5
minutos. Si Meta reintenta el webhook (lo hace si no recibe 200 a tiempo), el mismo
`wamid` (message ID de Meta) producirá la misma respuesta sin llamar al LLM de nuevo.

---

_Actualizado: 2026-03-21 — Ola 1C del plan 61_
