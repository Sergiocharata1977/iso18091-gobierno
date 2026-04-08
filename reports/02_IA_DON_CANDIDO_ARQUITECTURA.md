# 02 — Arquitectura IA: Don Cándido
**Actualizado:** 2026-03-27

---

## Visión general

Don Cándido es el asistente IA integrado en la plataforma. No es un chatbot genérico: conoce el contexto de la organización (normas, procesos, CRM, contabilidad) y responde en ese contexto.

---

## Componentes principales

### LLMRouter (`src/ai/services/LLMRouter.ts`)
- **Primario:** Claude Sonnet (Anthropic)
- **Fallback:** Groq (Llama)
- Selección automática según disponibilidad y latencia
- Telemetría de uso por provider

### UnifiedConverseService (`src/services/ai-core/UnifiedConverseService.ts`)
- Cerebro único de IA — todos los adapters pasan por acá
- Recibe contexto unificado + historial + mensaje
- Genera respuesta con streaming opcional
- Conoce capabilities instaladas del tenant

### ContextService (`src/features/chat/services/ContextService.ts`)
- Construye el contexto que se le pasa a la IA
- Carga: orgConfig + usuario + personal + asignaciones + cumplimiento + **contabilidad**
- `getContext()` — flujo chat interno
- `getExternalChannelContext()` — flujo WhatsApp / canales externos

### AccountingContextBuilder (`src/services/ai-core/accountingContextBuilder.ts`)
- Agrega contexto contable al prompt: período activo, saldos, últimos asientos
- Don Cándido puede responder: "¿Cuánto se facturó este mes?", "¿El balance cuadra?"

### ConversationStore (`src/services/ai-core/conversationStore.ts`)
- Historial persistente en Firestore (`ai_conversations`, `ai_messages`)
- Permite continuación de conversaciones entre sesiones

---

## Adapters (canales de entrada)

| Adapter | Canal | Archivo |
|---|---|---|
| Chat adapter | Web UI interno | `src/services/ai-core/adapters/chat/` |
| Voice adapter | Voz (ElevenLabs) | `src/services/ai-core/adapters/voice/` |
| WhatsApp adapter | WhatsApp Business API | `src/services/ai-core/adapters/whatsapp/` |

---

## WhatsApp (`crm_whatsapp_inbox`)

### Flujo externo (webhook público)
```
Meta → POST /api/webhooks/whatsapp → HMAC verify → WhatsAppAdapter → UnifiedConverseService → respuesta
```

### Dashboard interno
- `/crm/whatsapp` — inbox de conversaciones
- `/crm/whatsapp/config` — configuración del número
- `/crm/whatsapp/simulador` — testing sin Meta

### Pendiente producción
- Configurar webhook URL en Meta Developer Console
- Variables de entorno: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`

---

## Openclaw (`openclaw`)

Plugin premium para análisis legal/compliance IA avanzado.

- **Admin:** `/admin/openclaw/page.tsx`
- **Manifest:** `src/config/plugins/openclaw.manifest.ts`
- **Pendiente:** `hasOpenclawPlugin = true` hardcodeado → usar `useCurrentUser({ includeContext: true })`

---

## Documentación in-app

- 39 archivos MD en `content/docs/` (13 módulos cubiertos)
- Loader: `src/lib/docs/` — loader + parser + registry + mapping + ai-context
- La IA tiene acceso al contenido de docs para responder preguntas sobre el sistema

---

## Prompts y schemas

- `src/ai/` — LLMRouter, prompts versionados, schemas Zod, telemetría
- Prompts contextualizados por módulo y perfil de usuario
- Schemas de validación de respuestas IA
