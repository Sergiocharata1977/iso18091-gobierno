# ElevenLabs Conversational AI — Configuracion de Agentes WhatsApp

> Fecha: 2026-03-21
> Aplica a: 9001app-firebase (Don Cándido) + Landing-Agrobiciufa (Agrobiciufa)
> Fuente de verdad de prompts: `src/lib/voice/don-candido-agent.ts` y `Landing-Agrobiciufa/src/lib/voice/agrobiciufa-agent.ts`

> Importante: si el prompt cambia otra vez, copiar siempre el `system_prompt` directo desde el archivo fuente. No reutilizar un bloque viejo de esta guia sin compararlo con codigo.

---

## Parte 1 — Crear agente Agrobiciufa en ElevenLabs

### 1.1 Acceder al dashboard

URL: https://elevenlabs.io/app/conversational-ai

Hacer clic en **New Agent**.

### 1.2 Configurar el agente

**Nombre del agente:** `Asistente Agrobiciufa`

**System prompt vigente** (copiar desde `Landing-Agrobiciufa/src/lib/voice/agrobiciufa-agent.ts`):

```
Sos el asistente virtual de Agrobiciufa, concesionaria oficial CASE de maquinaria agrícola en Argentina.

Tu objetivo es ayudar a clientes y productores con:
- Consultas sobre repuestos CASE (tractores, cosechadoras, implementos, sembradores)
- Solicitudes de servicio técnico en campo y garantías
- Información sobre el catálogo de maquinaria disponible (CASE IH, New Holland)
- Opciones de financiación y planes de compra

Respondé en español argentino, de forma cordial y directa. Cuando el cliente necesite un presupuesto o quiera agendar un servicio técnico, pedí su nombre, teléfono y descripción del equipo (número de serie si lo tiene).

NO inventes precios ni disponibilidad de stock. Siempre decí que vas a confirmar y que un asesor va a contactarlo a la brevedad.

Para emergencias de maquinaria en campo, derivar inmediatamente al soporte técnico urgente.
```

### 1.3 Seleccionar voz

- En la sección **Voice**, buscar o pegar el Voice ID: `kulszILr6ees0ArU8miO`
- Configurar: Stability `0.5`, Similarity boost `0.75`, Language `es`

### 1.4 Guardar y obtener el Agent ID

1. Hacer clic en **Save**
2. El Agent ID aparece en la URL del dashboard: `https://elevenlabs.io/app/conversational-ai/agent_XXXXXXXXXXXXX`
3. Copiar ese ID

### 1.5 Pegar en Vercel (Landing-Agrobiciufa)

En Vercel → proyecto `Landing-Agrobiciufa` → Settings → Environment Variables:

```
ELEVENLABS_AGENT_ID_AGROBICIUFA=agent_XXXXXXXXXXXXX
```

---

## Parte 2 — Crear agente Don Cándido en ElevenLabs

### 2.1 Nuevo agente

Mismo URL: https://elevenlabs.io/app/conversational-ai → **New Agent**

**Nombre del agente:** `Don Cándido — Asistente ISO 9001`

**System prompt vigente** (copiar desde `9001app-firebase/src/lib/voice/don-candido-agent.ts`):

```
Sos Don Cándido, asistente especializado en Sistema de Gestión de Calidad ISO 9001:2015.

Ayudás a organizaciones y profesionales con:
- Interpretación de requisitos de la norma ISO 9001:2015 (cláusulas 4 al 10)
- Documentación requerida: procedimientos, registros, política de calidad
- Planificación de auditorías internas y gestión de no conformidades
- Mejora continua, indicadores de calidad y objetivos de calidad
- Preparación para auditorías de certificación

Respondé en español, de forma clara y con ejemplos prácticos. Citá la cláusula de la norma cuando sea relevante.

Para consultas que requieren acceso al sistema interno o documentos de la organización, indicar que deben ingresar a la plataforma web en doncandidoia.com.
```

### 2.2 Seleccionar voz

- Voice ID: `kulszILr6ees0ArU8miO` (mismo que Agrobiciufa, o crear voz separada en Voice Lab)

### 2.3 Guardar y pegar en Vercel (9001app-firebase)

En Vercel → proyecto `9001app-firebase` → Settings → Environment Variables:

```
ELEVENLABS_AGENT_ID_DON_CANDIDO=agent_XXXXXXXXXXXXX
```

---

## Parte 3 — Vincular WhatsApp Business

> IMPORTANTE: ElevenLabs gestiona la conexion con WhatsApp directamente desde el dashboard del agente.
> No se requiere webhook propio para este canal. Es independiente del webhook multi-tenant en `/api/public/whatsapp/webhook`.

### 3.1 Para cada agente (repetir en Agrobiciufa y Don Cándido)

1. Abrir el agente en https://elevenlabs.io/app/conversational-ai
2. Ir a la pestaña **Channels**
3. Hacer clic en **WhatsApp** → **Connect WhatsApp Account**
4. Flujo OAuth de Meta: autorizar la cuenta de Business Manager
5. Seleccionar el **número de WhatsApp Business** correspondiente
   - Agrobiciufa: número WhatsApp Business de la concesionaria
   - Don Cándido: número SEPARADO del webhook propio multi-tenant (ver nota abajo)
6. Activar la opción **"Enable audio message response"** si se desea respuesta de voz
7. Hacer clic en **Save**

### 3.2 Obtener el Phone Number ID

1. En Meta Business Suite → Cuentas de WhatsApp
2. Seleccionar el número → Configuracion → copiar **Phone number ID** (ej: `1234567890123456`)
3. Pegar en Vercel:
   - Agrobiciufa: `WHATSAPP_PHONE_NUMBER_ID_AGROBICIUFA=1234567890123456`
   - Don Cándido: `ELEVENLABS_WHATSAPP_PHONE_NUMBER_ID=1234567890123456`

> NOTA: El webhook propio de Don Cándido (`/api/public/whatsapp/webhook`) es el canal PRINCIPAL
> para el sistema multi-tenant (tiene acceso a Firestore, organizationId, historial por organización).
> El agente ElevenLabs usa un numero DIFERENTE y es para consultas ISO 9001 generales
> sin contexto de organización específica.

---

## Parte 4 — Variables de entorno completas

### 9001app-firebase (proyecto Don Cándido)

| Variable | Descripcion | Donde obtenerla | Ejemplo |
|---|---|---|---|
| `ELEVENLABS_API_KEY` | API key de ElevenLabs | https://elevenlabs.io/app/settings/api-keys | `sk_abc123...` |
| `ELEVENLABS_VOICE_ID` | ID de la voz del asistente | ElevenLabs Voice Lab → copiar ID | `kulszILr6ees0ArU8miO` |
| `ELEVENLABS_AGENT_ID_DON_CANDIDO` | ID del agente Don Cándido creado en el paso 2 | URL del agente en dashboard ElevenLabs | `agent_abc123...` |
| `ELEVENLABS_WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID de Meta (numero adicional para este agente) | Meta Business Suite → WhatsApp → Configuracion → Phone number ID | `1234567890123456` |

### Landing-Agrobiciufa

| Variable | Descripcion | Donde obtenerla | Ejemplo |
|---|---|---|---|
| `ELEVENLABS_API_KEY` | API key de ElevenLabs (misma cuenta) | https://elevenlabs.io/app/settings/api-keys | `sk_abc123...` |
| `ELEVENLABS_VOICE_ID` | ID de la voz del asistente | ElevenLabs Voice Lab → copiar ID | `kulszILr6ees0ArU8miO` |
| `ELEVENLABS_AGENT_ID_AGROBICIUFA` | ID del agente Agrobiciufa creado en el paso 1 | URL del agente en dashboard ElevenLabs | `agent_xyz456...` |
| `WHATSAPP_PHONE_NUMBER_ID_AGROBICIUFA` | Phone Number ID de Meta del numero de Agrobiciufa | Meta Business Suite → WhatsApp → Configuracion → Phone number ID | `9876543210987654` |
| `ADMIN_SECRET` | Secret para endpoint de diagnostico (`x-admin-secret`) | Generar con `openssl rand -hex 32` | `a1b2c3d4e5f6...` |

---

## Parte 5 — Verificacion

### 5.1 Endpoint de diagnostico

#### Don Cándido (9001app-firebase)

Requiere token de admin/super_admin:

```
GET /api/voice/whatsapp-agent-config
Authorization: Bearer <token>
```

Respuesta esperada cuando todo esta configurado:

```json
{
  "success": true,
  "data": {
    "name": "Don Cándido — Asistente ISO 9001",
    "voice_id": "kulszILr6ees0ArU8miO",
    "channels": ["whatsapp"],
    "env_configured": {
      "api_key": true,
      "agent_id": true,
      "whatsapp_number": true
    },
    "webhook_own_status": "activo (canal principal multi-tenant)",
    "elevenlabs_whatsapp": "canal adicional (numero separado)"
  }
}
```

#### Agrobiciufa (Landing-Agrobiciufa)

```
GET /api/voice/whatsapp-agent-config
x-admin-secret: <valor de ADMIN_SECRET>
```

Respuesta esperada:

```json
{
  "success": true,
  "data": {
    "name": "Asistente Agrobiciufa",
    "voice_id": "kulszILr6ees0ArU8miO",
    "channels": ["whatsapp", "web"],
    "env_configured": {
      "api_key": true,
      "voice_id": true,
      "agent_id": true,
      "whatsapp_number": true
    }
  }
}
```

Si alguno de los flags en `env_configured` es `false`, la variable correspondiente no esta configurada en el entorno.

### 5.2 Test manual WhatsApp

1. Enviar un mensaje de WhatsApp al numero configurado para el agente
2. El agente ElevenLabs responde automaticamente (sin webhook propio)
3. Si no hay respuesta en 30 segundos, verificar en el dashboard del agente:
   - ElevenLabs → agente → Channels → WhatsApp → estado de conexion
   - Meta Business Suite → numero de telefono → estado de API

### 5.3 Test TTS web (Agrobiciufa)

```
GET /api/voice/tts?text=Hola%2C+soy+el+asistente+de+Agrobiciufa
```

Debe retornar un stream de audio MP3.

---

## Parte 6 — Costos estimados

> Basado en 1000 interacciones/mes de 3 minutos promedio cada una.

| Concepto | Detalle | Costo estimado |
|---|---|---|
| ElevenLabs TTS (web) | Incluido en plan. Limite: 100K chars/mes (Creator) | $0 en plan Creator |
| ElevenLabs Conversational AI (WhatsApp) | $0.10 USD/min de conversacion activa | $300 USD/mes (1000 conv x 3 min) |
| Meta WhatsApp Business API | $0.0613 USD/conversacion (24h, Argentina, tarifa servicio) | ~$61 USD/mes |
| **Total estimado** | **1000 conversaciones x 3 min** | **~$361 USD/mes** |

**Desglose por escenario:**

| Escenario | Conv/mes | Costo estimado |
|---|---|---|
| Arranque (bajo volumen) | 100 | ~$36 USD |
| Operacion normal | 500 | ~$180 USD |
| Alta demanda | 1000 | ~$361 USD |
| Escala (2000+) | 2000 | ~$722 USD |

> Los precios de Meta API varían por región y categoría de conversación (marketing, utilidad, servicio).
> Los valores anteriores corresponden a conversaciones de "servicio" (iniciadas por el usuario) en Argentina.
> Revisar pricing actual en: https://developers.facebook.com/docs/whatsapp/pricing

> ElevenLabs plan Creator: $22 USD/mes base, incluye 100K caracteres TTS.
> Plan Pro: $99 USD/mes, incluye 500K caracteres TTS y menor costo por minuto de Conversational AI.

---

## Notas de arquitectura

- El webhook propio (`/api/public/whatsapp/webhook`) en 9001app-firebase sigue siendo el canal **PRINCIPAL** para WhatsApp multi-tenant porque tiene acceso a Firestore, organizationId y historial por organizacion.
- El agente ElevenLabs para Don Cándido es un canal **ADICIONAL** con numero diferente, para consultas ISO 9001 generales sin contexto de org.
- Ambos agentes usan la misma cuenta ElevenLabs y el mismo `ELEVENLABS_API_KEY`.
- Los agentes son independientes entre si (IDs diferentes, numeros WhatsApp diferentes).
