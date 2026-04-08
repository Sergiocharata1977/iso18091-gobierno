# Plan WhatsApp RRHH + CRM Inbox + Formulario Líquido — Ejecución multi-agente

**Fecha:** 2026-04-08
**Feature:** Completar código faltante en los 3 sistemas de comunicación IA: WhatsApp RRHH (bidireccionalidad), WhatsApp CRM Inbox (media, search, OAuth), Formulario Líquido (persistencia, feedback, validación)
**Proyectos afectados:** `9001app-firebase`

---

## Contexto del análisis previo

Del análisis realizado el 2026-04-08, se identificaron los siguientes gaps críticos:

### WhatsApp RRHH
- `WhatsappMessageReceivedHandler` devuelve `{ action: 'ignored', reason: 'Not implemented yet' }`
- Sin UI admin para ver jobs de `agent_jobs` enviados por WhatsApp
- Sin rate limiting por usuario para mensajes salientes
- Sin persistencia de contexto de sesión multi-paso

### WhatsApp CRM Inbox
- Media attachments (imágenes/docs) no renderizados en el chat
- Sin full-text search en mensajes
- Embedded Signup Meta OAuth — tipos definidos pero flujo UI incompleto
- Sin análisis de sentimiento para priorización de conversaciones

### Formulario Líquido Hablado
- Sin persistencia de sesión de voz (recarga = pérdida)
- Sin feedback en tiempo real ("¿te escuché bien?")
- Sin validación de rangos de negocio (ej: edad 200 años)
- Sin soporte multi-idioma (hardcodeado a español)

---

## Resumen de olas

| Ola | Agentes | Paralelos entre sí | Dependen de |
|-----|---------|---------------------|-------------|
| 1 | A, B, C | Sí | Nada |
| 2 | A, B, C | Sí | Ola 1 completa |
| 3 | A, B | Sí | Ola 2 completa |
| 4 | A | No aplica (único) | Ola 3 completa |

---

## Ola 1 — Fundaciones: tipos, servicios y lógica core
> Ejecutar Agente A + Agente B + Agente C en PARALELO
> Estos agentes trabajan en capas distintas del stack sin tocarse

---

### Agente A — WhatsApp RRHH: Bidireccionalidad y handler de respuestas

**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** nada — es la primera ola

#### Objetivo
Implementar `WhatsappMessageReceivedHandler` completo con lógica bidireccional: procesar respuestas de empleados, detectar intención (confirmación, consulta, rechazo), actualizar estado de tareas, y responder automáticamente con contexto.

#### Archivos a crear
- `src/services/agents/handlers/WhatsappMessageReceivedHandler.ts` — Handler completo (reemplaza el stub vacío)
- `src/services/whatsapp/RhrResponseProcessor.ts` — Lógica de procesamiento de respuestas RRHH separada del handler
- `src/types/whatsapp-rrhh.ts` — Tipos específicos para el flujo bidireccional RRHH

#### Archivos a modificar
- `src/services/agents/AgentWorkerService.ts` — Registrar el handler actualizado (ya tiene el slot, solo conectar)
- `src/services/whatsapp/WhatsAppService.ts` — Agregar método `handleEmployeeResponse()` que llama `RhrResponseProcessor`

#### Prompt completo para el agente

```
Eres un agente de desarrollo en el proyecto 9001app-firebase (Next.js 14 + Firebase + TypeScript strict).

## Tu tarea
Implementar la bidireccionalidad completa del sistema WhatsApp RRHH. Cuando un empleado responde un mensaje WhatsApp enviado por el sistema (asignación de tarea, recordatorio), el sistema debe procesar esa respuesta y actuar en consecuencia.

## Contexto del proyecto
- Stack: Next.js 14.2.18, TypeScript strict, Firebase Admin SDK 13.5, Zod v4.1.12
- `z.record()` siempre requiere 2 argumentos: `z.record(z.string(), valueType)`
- Auth: `withAuth` wrapper + `resolveAuthorizedOrganizationId`
- Patrón de jobs: colección Firestore `agent_jobs` con campos `intent`, `payload`, `status`, `organization_id`

## Archivos modelo a leer ANTES de escribir código
1. `src/services/agents/handlers/TaskAssignHandler.ts` — modelo de handler existente
2. `src/services/agents/handlers/TaskReminderHandler.ts` — modelo de handler existente
3. `src/services/agents/AgentWorkerService.ts` — ver cómo se registran handlers
4. `src/services/whatsapp/WhatsAppService.ts` — ver `sendMessage()`, `handleIncomingMessage()`
5. `src/types/whatsapp.ts` — tipos existentes de conversaciones y mensajes

## Lo que debes implementar

### 1. Tipos en `src/types/whatsapp-rrhh.ts`
```typescript
export type EmployeeResponseIntent =
  | 'confirm_task'      // "OK", "LISTO", "HECHO", "COMPLETADO", "DONE"
  | 'reject_task'       // "NO PUEDO", "IMPOSIBLE", "RECHAZADO", "NO"
  | 'ask_question'      // cualquier pregunta (contiene "?")
  | 'report_issue'      // "PROBLEMA", "ERROR", "FALLO", "NO FUNCIONA"
  | 'request_deadline'  // "CUÁNDO", "PARA CUÁNDO", "FECHA"
  | 'unknown'           // no clasificado

export interface EmployeeResponseContext {
  phone_e164: string
  organization_id: string
  message_text: string
  message_id: string
  conversation_id: string
  detected_intent: EmployeeResponseIntent
  confidence: number          // 0-1
  related_task_id?: string    // si se pudo vincular a una tarea
  related_job_id?: string     // job que originó el mensaje
}

export interface RhrResponseResult {
  intent: EmployeeResponseIntent
  action_taken: 'task_confirmed' | 'task_rejected' | 'question_queued' | 'issue_logged' | 'reply_sent' | 'ignored'
  reply_message?: string      // mensaje de respuesta enviado al empleado
  task_updated?: boolean
  error?: string
}
```

### 2. `src/services/whatsapp/RhrResponseProcessor.ts`
Clase `RhrResponseProcessor` con métodos:

```typescript
export class RhrResponseProcessor {
  constructor(private db: FirebaseFirestore.Firestore) {}

  // Detecta la intención de la respuesta del empleado
  detectIntent(text: string): { intent: EmployeeResponseIntent; confidence: number }

  // Busca en Firestore el último job enviado a este teléfono (últimas 48h)
  async findRelatedJob(phone_e164: string, org_id: string): Promise<AgentJob | null>

  // Actualiza el estado de la tarea en Firestore según la intención
  async updateTaskStatus(task_id: string, intent: EmployeeResponseIntent, org_id: string): Promise<void>

  // Genera mensaje de respuesta automática según intención
  generateReply(intent: EmployeeResponseIntent, context: EmployeeResponseContext): string | null

  // Orquesta todo el flujo
  async process(context: EmployeeResponseContext): Promise<RhrResponseResult>
}
```

Lógica de `detectIntent()`:
- CONFIRM: palabras clave positivas → ["ok", "listo", "hecho", "completado", "done", "realizado", "terminado", "ok!", "👍"]
- REJECT: palabras clave negativas → ["no puedo", "imposible", "no lo haré", "rechazo", "rechazado"]
- ASK_QUESTION: contiene "?" o empieza con qué/cuándo/dónde/cómo/por qué
- REPORT_ISSUE: contiene ["problema", "error", "fallo", "no funciona", "roto", "issue"]
- REQUEST_DEADLINE: contiene ["cuándo", "para cuándo", "fecha límite", "deadline"]
- UNKNOWN: todo lo demás (confidence: 0.3)

Lógica de `updateTaskStatus()`:
- Si CONFIRM: buscar tarea en colección `actions` o `audit_findings` con `responsable_phone = phone_e164` y `status != 'completada'` → actualizar a `status: 'completada'`, agregar campo `confirmed_by_whatsapp: true`, `confirmed_at: Timestamp.now()`
- Si REJECT: actualizar `status: 'rechazada_whatsapp'`, agregar `rejection_reason: message_text`

Lógica de `generateReply()`:
- CONFIRM: "✅ ¡Perfecto! Tarea marcada como completada. Gracias [nombre si disponible]."
- REJECT: "❌ Entendido. Notifiqué al administrador. Alguien se contactará contigo."
- ASK_QUESTION: "🤔 Tu consulta fue registrada. Un supervisor responderá a la brevedad."
- REPORT_ISSUE: "⚠️ Problema registrado. El equipo fue notificado. Código de referencia: [job_id]"
- UNKNOWN: null (no responder)

### 3. `src/services/agents/handlers/WhatsappMessageReceivedHandler.ts`
Reemplazar el stub vacío:

```typescript
import { AgentJobHandler } from './types'
import { RhrResponseProcessor } from '../whatsapp/RhrResponseProcessor'
import { EmployeeResponseContext } from '@/types/whatsapp-rrhh'

export class WhatsappMessageReceivedHandler implements AgentJobHandler {
  intent = 'whatsapp.message.received'

  async handle(job: AgentJob, db: FirebaseFirestore.Firestore): Promise<HandlerResult> {
    const { phone_e164, message_text, message_id, conversation_id, organization_id } = job.payload

    const processor = new RhrResponseProcessor(db)
    const { intent, confidence } = processor.detectIntent(message_text)

    // Solo procesar si parece una respuesta RRHH (no un cliente externo)
    const relatedJob = await processor.findRelatedJob(phone_e164, organization_id)
    if (!relatedJob) {
      return { action: 'ignored', reason: 'No related RRHH job found in last 48h' }
    }

    const context: EmployeeResponseContext = {
      phone_e164,
      organization_id,
      message_text,
      message_id,
      conversation_id,
      detected_intent: intent,
      confidence,
      related_job_id: relatedJob.id,
      related_task_id: relatedJob.payload?.task_id,
    }

    const result = await processor.process(context)
    return { action: result.action_taken, ...result }
  }
}
```

### 4. Modificación en `WhatsAppService.ts`
Agregar al método `handleIncomingMessage()` existente — DESPUÉS de guardar el mensaje en Firestore y ANTES de retornar, encolar un job con la info completa:

```typescript
// Encolar para procesamiento RRHH (ya existe la línea, solo asegurarse que el payload sea completo)
await db.collection('agent_jobs').add({
  intent: 'whatsapp.message.received',
  organization_id: orgId,
  status: 'pending',
  payload: {
    phone_e164: fromPhone,
    message_text: body,
    message_id: savedMessage.id,
    conversation_id: conversation.id,
    organization_id: orgId,
  },
  created_at: Timestamp.now(),
})
```

## Lo que NO debes hacer
- No modificar el webhook de Meta (`/api/whatsapp/webhook/route.ts`) — solo el handler interno
- No crear UI en esta ola — solo backend/services
- No modificar `TaskAssignHandler` ni `TaskReminderHandler`
- No crear rate limiting todavía — va en Ola 2

## Criterio de éxito
- TypeScript compila sin errores: `npx tsc --noEmit`
- `WhatsappMessageReceivedHandler` ya no retorna `ignored` para mensajes relacionados a tareas
- `RhrResponseProcessor.detectIntent("OK listo")` retorna `{ intent: 'confirm_task', confidence: > 0.8 }`
- `RhrResponseProcessor.detectIntent("¿para cuándo?")` retorna `{ intent: 'request_deadline', confidence: > 0.7 }`
```

---

### Agente B — WhatsApp CRM Inbox: Media attachments y full-text search

**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** nada — es la primera ola

#### Objetivo
Implementar soporte para media attachments (imágenes, documentos, audio) en mensajes WhatsApp y agregar servicio de full-text search sobre mensajes usando índice en Firestore + normalización de texto.

#### Archivos a crear
- `src/services/whatsapp/MediaHandler.ts` — descarga, valida y almacena media de Meta API en Firebase Storage
- `src/services/whatsapp/MessageSearchService.ts` — indexa y busca mensajes por texto
- `src/types/whatsapp-media.ts` — tipos para media attachments

#### Archivos a modificar
- `src/types/whatsapp.ts` — agregar campos `media_url`, `media_type`, `media_size_bytes` a `WhatsAppMessageV2`
- `src/services/whatsapp/WhatsAppService.ts` — llamar `MediaHandler` al recibir mensajes con media
- `src/app/api/whatsapp/conversations/[id]/messages/route.ts` — incluir `search` query param

#### Prompt completo para el agente

```
Eres un agente de desarrollo en el proyecto 9001app-firebase (Next.js 14 + Firebase + TypeScript strict).

## Tu tarea
Implementar dos capacidades en el sistema WhatsApp CRM Inbox:
1. Media attachments: descargar y servir imágenes/documentos recibidos por WhatsApp
2. Full-text search: buscar en el historial de mensajes de una conversación

## Contexto del proyecto
- Stack: Next.js 14.2.18, TypeScript strict, Firebase Admin SDK 13.5, Firebase Storage, Zod v4.1.12
- `z.record()` siempre requiere 2 argumentos: `z.record(z.string(), valueType)`
- Auth: `withAuth` wrapper + `resolveAuthorizedOrganizationId`
- Firebase Storage bucket: ver `src/lib/firebase/admin.ts` para el bucket ID

## Archivos modelo a leer ANTES de escribir código
1. `src/types/whatsapp.ts` — tipos existentes `WhatsAppMessageV2`, `WhatsAppConversationV2`
2. `src/services/whatsapp/WhatsAppService.ts` — ver `handleIncomingMessage()`, `sendMessage()`
3. `src/app/api/whatsapp/conversations/[id]/messages/route.ts` — endpoint existente a modificar
4. `src/lib/firebase/admin.ts` — ver cómo se obtiene `db`, `storage`

## Lo que debes implementar

### 1. Tipos en `src/types/whatsapp-media.ts`
```typescript
export type WhatsAppMediaType = 'image' | 'document' | 'audio' | 'video' | 'sticker'

export interface WhatsAppMediaAttachment {
  media_type: WhatsAppMediaType
  original_url: string          // URL de Meta API (expira en 5 min)
  storage_path: string          // ruta en Firebase Storage (permanente)
  storage_url: string           // URL firmada de Firebase Storage (24h)
  mime_type: string             // ej: "image/jpeg", "application/pdf"
  file_size_bytes?: number
  file_name?: string            // para documentos
  thumbnail_url?: string        // para imágenes (si se genera)
  downloaded_at: FirebaseFirestore.Timestamp
}
```

### 2. Modificación de `WhatsAppMessageV2` en `src/types/whatsapp.ts`
Agregar al interface existente:
```typescript
// Media (solo si el mensaje tiene adjunto)
media?: WhatsAppMediaAttachment
has_media?: boolean
```

### 3. `src/services/whatsapp/MediaHandler.ts`
```typescript
export class MediaHandler {
  constructor(
    private storage: Storage,  // Firebase Admin Storage
    private metaAccessToken: string
  ) {}

  // Descarga media de Meta API usando el media_id del webhook payload
  async downloadFromMeta(media_id: string): Promise<Buffer>

  // Sube buffer a Firebase Storage bajo organizations/{orgId}/whatsapp_media/{filename}
  async uploadToStorage(
    buffer: Buffer,
    orgId: string,
    media_type: WhatsAppMediaType,
    mime_type: string,
    original_filename?: string
  ): Promise<{ storage_path: string; storage_url: string }>

  // Orquesta: descarga de Meta + sube a Storage + retorna attachment
  async processMediaMessage(
    media_id: string,
    media_type: WhatsAppMediaType,
    mime_type: string,
    orgId: string,
    original_filename?: string
  ): Promise<WhatsAppMediaAttachment>
}
```

Lógica de `downloadFromMeta()`:
```typescript
// 1. Obtener URL del media
const mediaInfoRes = await fetch(
  `https://graph.facebook.com/v19.0/${media_id}`,
  { headers: { Authorization: `Bearer ${this.metaAccessToken}` } }
)
const { url } = await mediaInfoRes.json()

// 2. Descargar el archivo
const fileRes = await fetch(url, {
  headers: { Authorization: `Bearer ${this.metaAccessToken}` }
})
return Buffer.from(await fileRes.arrayBuffer())
```

Lógica de `uploadToStorage()`:
- Path: `organizations/${orgId}/whatsapp_media/${Date.now()}_${uuid()}.${ext}`
- Usar `bucket.file(path).save(buffer, { metadata: { contentType: mime_type } })`
- Generar URL firmada con expiración de 7 días: `file.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })`

Tipos soportados y extensiones:
```typescript
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'video/mp4': 'mp4',
}
```

### 4. `src/services/whatsapp/MessageSearchService.ts`
```typescript
export class MessageSearchService {
  constructor(private db: FirebaseFirestore.Firestore) {}

  // Normaliza texto para búsqueda: minúsculas, sin acentos, sin puntuación
  private normalize(text: string): string

  // Genera tokens de búsqueda (bi-gramas + uni-gramas)
  private tokenize(text: string): string[]

  // Al guardar un mensaje, genera y guarda search_tokens en el documento
  async indexMessage(
    orgId: string,
    conversationId: string,
    messageId: string,
    text: string
  ): Promise<void>

  // Busca mensajes en una conversación que contengan el query
  async searchInConversation(
    orgId: string,
    conversationId: string,
    query: string,
    limit?: number
  ): Promise<string[]>  // retorna message IDs

  // Busca mensajes en todas las conversaciones de la org
  async searchAcrossOrg(
    orgId: string,
    query: string,
    limit?: number
  ): Promise<Array<{ conversationId: string; messageId: string }>>
}
```

Lógica de `normalize()`:
```typescript
private normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // eliminar acentos
    .replace(/[^a-z0-9\s]/g, ' ')     // solo alfanumérico
    .replace(/\s+/g, ' ')
    .trim()
}
```

Lógica de `tokenize()` — genera bi-gramas (pares de palabras) y uni-gramas:
```typescript
private tokenize(text: string): string[] {
  const words = this.normalize(text).split(' ').filter(w => w.length > 2)
  const unigrams = words
  const bigrams = words.slice(0, -1).map((w, i) => `${w}_${words[i + 1]}`)
  return [...new Set([...unigrams, ...bigrams])]
}
```

Lógica de `indexMessage()`: Agregar campo `search_tokens: string[]` al documento de mensaje en Firestore usando `arrayUnion`.

Lógica de `searchInConversation()`:
```typescript
const tokens = this.tokenize(query)
const firstToken = tokens[0]  // Firestore solo permite `array-contains` con 1 token
const messagesRef = db
  .collection(`organizations/${orgId}/whatsapp_conversations/${conversationId}/messages`)
  .where('search_tokens', 'array-contains', firstToken)
  .orderBy('created_at', 'desc')
  .limit(limit ?? 20)
```

### 5. Modificación del endpoint GET messages
En `src/app/api/whatsapp/conversations/[id]/messages/route.ts`, agregar soporte para `?search=texto`:

```typescript
const searchQuery = req.nextUrl.searchParams.get('search')
if (searchQuery) {
  const searchService = new MessageSearchService(db)
  const messageIds = await searchService.searchInConversation(orgId, convId, searchQuery)
  // retornar mensajes filtrados por IDs
}
```

## Lo que NO debes hacer
- No crear UI en esta ola — solo backend/services/types
- No modificar el webhook (`/api/whatsapp/webhook`) — el payload de media ya llega, solo procesar
- No implementar thumbnails de imágenes (complejidad innecesaria)
- No modificar `WhatsAppConversationV2`

## Criterio de éxito
- TypeScript compila sin errores: `npx tsc --noEmit`
- `MediaHandler.processMediaMessage()` retorna `WhatsAppMediaAttachment` válido
- `MessageSearchService.searchInConversation(orgId, convId, "factura")` retorna array de IDs
- `GET /api/whatsapp/conversations/[id]/messages?search=hola` no lanza error
```

---

### Agente C — Formulario Líquido: Persistencia de sesión, validación de rangos e i18n

**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** nada — es la primera ola

#### Objetivo
Extender `voiceFormFiller.ts` con validación de rangos de negocio, agregar soporte básico multi-idioma (español + inglés), e implementar persistencia de sesión de voz usando `localStorage` + Zod para serialización.

#### Archivos a crear
- `src/services/ai-core/voiceFormValidator.ts` — validación de rangos y reglas de negocio sobre campos extraídos
- `src/services/ai-core/voiceFormI18n.ts` — diccionario de términos y normalizador multi-idioma
- `src/hooks/use-voice-session.ts` — hook para persistir/recuperar sesión de voz en localStorage

#### Archivos a modificar
- `src/services/ai-core/voiceFormFiller.ts` — integrar `voiceFormValidator` y `voiceFormI18n` en el pipeline
- `src/types/voice-form.ts` (si existe) o crear `src/types/voice-form.ts` — agregar tipos para validación y i18n

#### Prompt completo para el agente

```
Eres un agente de desarrollo en el proyecto 9001app-firebase (Next.js 14 + Firebase + TypeScript strict).

## Tu tarea
Extender el sistema de Formulario Líquido Hablado con tres capacidades:
1. Validación de rangos de negocio (campos numéricos con min/max, enums válidos, fechas en rango)
2. Soporte multi-idioma básico (español + inglés) para la detección de valores
3. Persistencia de sesión de voz en localStorage (survives page refresh)

## Contexto del proyecto
- Stack: Next.js 14.2.18, TypeScript strict, Zod v4.1.12
- `z.record()` siempre requiere 2 argumentos: `z.record(z.string(), valueType)`
- Los hooks de cliente van en `src/hooks/`, usan `'use client'` implícitamente
- El motor actual tiene 487 líneas: `src/services/ai-core/voiceFormFiller.ts`

## Archivos modelo a leer ANTES de escribir código
1. `src/services/ai-core/voiceFormFiller.ts` — motor actual completo (leer todo)
2. `src/services/ai-core/voiceIntentDetector.ts` — patrón de detección
3. `src/components/voice/VoiceFormButton.tsx` — ver qué props/callbacks usa
4. `src/hooks/use-realtime-voice.ts` — hook de voz existente como modelo

## Lo que debes implementar

### 1. Tipos en `src/types/voice-form.ts`
```typescript
export type VoiceFormLanguage = 'es' | 'en'

export interface FieldValidationRule {
  field_id: string
  // Para campos numéricos
  min?: number
  max?: number
  unit?: string              // "años", "kg", "horas", "%"
  // Para campos de selección
  allowed_values?: string[]  // sobreescribe las opciones del campo
  // Para campos de fecha
  min_date?: 'today' | 'yesterday' | string   // ISO o keyword
  max_date?: 'today' | 'tomorrow' | string
  // Para campos de texto
  min_length?: number
  max_length?: number
  pattern?: string            // regex como string
  // Mensaje de error personalizado
  error_message?: string
}

export interface FieldValidationResult {
  field_id: string
  is_valid: boolean
  original_value: unknown
  corrected_value?: unknown   // si se puede auto-corregir (ej: clamp a min/max)
  error?: string
  warning?: string            // válido pero inusual (ej: edad 99)
}

export interface VoiceFormSessionState {
  session_id: string
  form_template_id: string
  language: VoiceFormLanguage
  extracted_fields: Record<string, unknown>   // campo_id → valor
  failed_fields: string[]
  transcript_history: string[]                // historial de dictaciones
  started_at: string    // ISO
  updated_at: string    // ISO
}
```

### 2. `src/services/ai-core/voiceFormValidator.ts`
```typescript
export class VoiceFormValidator {
  // Valida un campo extraído contra sus reglas de negocio
  validateField(
    field_id: string,
    value: unknown,
    rule: FieldValidationRule
  ): FieldValidationResult

  // Valida todos los campos extraídos de una vez
  validateAll(
    extracted: Array<{ campo_id: string; valor_extraido: unknown }>,
    rules: FieldValidationRule[]
  ): FieldValidationResult[]

  // Intenta auto-corregir valores fuera de rango (clamp numérico)
  autoCorrect(value: number, rule: FieldValidationRule): number | null
}
```

Lógica de `validateField()`:
```typescript
// Para tipo número:
if (typeof value === 'number') {
  if (rule.min !== undefined && value < rule.min) {
    const corrected = this.autoCorrect(value, rule)
    return {
      field_id,
      is_valid: false,
      original_value: value,
      corrected_value: corrected ?? undefined,
      error: rule.error_message ?? `El valor ${value} es menor al mínimo permitido (${rule.min} ${rule.unit ?? ''})`,
    }
  }
  if (rule.max !== undefined && value > rule.max) {
    // ...similar con max
  }
  // Warning si es inusual (ej: edad > 120)
  if (rule.unit === 'años' && value > 100) {
    return { field_id, is_valid: true, original_value: value, warning: `Edad inusualmente alta: ${value} años` }
  }
}

// Para tipo texto con pattern:
if (typeof value === 'string' && rule.pattern) {
  const regex = new RegExp(rule.pattern)
  if (!regex.test(value)) {
    return { field_id, is_valid: false, original_value: value, error: rule.error_message ?? 'Formato inválido' }
  }
}

// Para fechas:
if (value instanceof Date || typeof value === 'string') {
  const date = new Date(value as string)
  if (rule.min_date === 'today' && date < new Date()) {
    return { field_id, is_valid: false, original_value: value, error: 'La fecha no puede ser en el pasado' }
  }
}
```

### 3. `src/services/ai-core/voiceFormI18n.ts`
```typescript
export const VOICE_TERMS: Record<VoiceFormLanguage, {
  positive: string[]
  negative: string[]
  today: string[]
  yesterday: string[]
  tomorrow: string[]
  months: Record<string, number>
  units: Record<string, string>  // "kilos" → "kg", "pounds" → "lb"
}> = {
  es: {
    positive: ['sí', 'si', 'correcto', 'afirmativo', 'verdadero', 'ok', 'claro', 'por supuesto', 'efectivamente'],
    negative: ['no', 'negativo', 'falso', 'incorrecto', 'para nada', 'nunca'],
    today: ['hoy', 'el día de hoy', 'esta fecha'],
    yesterday: ['ayer', 'el día de ayer'],
    tomorrow: ['mañana', 'el día de mañana'],
    months: { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 },
    units: { kilos: 'kg', kilogramos: 'kg', gramos: 'g', litros: 'l', metros: 'm', centímetros: 'cm', horas: 'h', minutos: 'min', años: 'años', meses: 'meses' },
  },
  en: {
    positive: ['yes', 'correct', 'affirmative', 'true', 'ok', 'sure', 'absolutely', 'indeed'],
    negative: ['no', 'negative', 'false', 'incorrect', 'never', 'nope'],
    today: ['today', 'this day'],
    yesterday: ['yesterday'],
    tomorrow: ['tomorrow'],
    months: { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 },
    units: { kilos: 'kg', kilograms: 'kg', grams: 'g', liters: 'l', meters: 'm', centimeters: 'cm', hours: 'h', minutes: 'min', years: 'years', months: 'months' },
  },
}

export function detectLanguage(text: string): VoiceFormLanguage {
  // Heurístico simple: si contiene más palabras en en que en es → 'en'
  const esMarkers = ['el', 'la', 'los', 'las', 'de', 'del', 'en', 'con', 'para', 'por']
  const enMarkers = ['the', 'a', 'an', 'of', 'in', 'with', 'for', 'by', 'at', 'to']
  const words = text.toLowerCase().split(/\s+/)
  const esScore = words.filter(w => esMarkers.includes(w)).length
  const enScore = words.filter(w => enMarkers.includes(w)).length
  return enScore > esScore ? 'en' : 'es'
}

export function normalizeWithLanguage(text: string, lang: VoiceFormLanguage): string {
  // Reemplaza términos del idioma por equivalentes normalizados antes de parsear
  // Ej: "pounds" → "lb", "yesterday" → fecha de ayer en ISO
  let normalized = text
  const terms = VOICE_TERMS[lang]
  // Reemplazar unidades
  for (const [term, unit] of Object.entries(terms.units)) {
    normalized = normalized.replace(new RegExp(`\\b${term}\\b`, 'gi'), unit)
  }
  // Reemplazar fechas relativas
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  terms.today.forEach(t => { normalized = normalized.replace(new RegExp(`\\b${t}\\b`, 'gi'), today) })
  terms.yesterday.forEach(t => { normalized = normalized.replace(new RegExp(`\\b${t}\\b`, 'gi'), yesterday) })
  terms.tomorrow.forEach(t => { normalized = normalized.replace(new RegExp(`\\b${t}\\b`, 'gi'), tomorrow) })
  return normalized
}
```

### 4. `src/hooks/use-voice-session.ts`
Hook React client-side para persistir sesión en localStorage:

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { VoiceFormSessionState } from '@/types/voice-form'

const SESSION_KEY_PREFIX = 'voice_form_session_'
const SESSION_TTL_MS = 2 * 60 * 60 * 1000  // 2 horas

export function useVoiceSession(templateId: string) {
  const key = `${SESSION_KEY_PREFIX}${templateId}`

  const [session, setSession] = useState<VoiceFormSessionState | null>(null)

  // Cargar sesión al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const parsed: VoiceFormSessionState = JSON.parse(raw)
      // Verificar TTL
      const age = Date.now() - new Date(parsed.updated_at).getTime()
      if (age > SESSION_TTL_MS) {
        localStorage.removeItem(key)
        return
      }
      setSession(parsed)
    } catch { /* ignorar */ }
  }, [key])

  // Guardar/actualizar sesión
  const saveSession = useCallback((updates: Partial<VoiceFormSessionState>) => {
    setSession(prev => {
      const next: VoiceFormSessionState = {
        ...(prev ?? {
          session_id: crypto.randomUUID(),
          form_template_id: templateId,
          language: 'es',
          extracted_fields: {},
          failed_fields: [],
          transcript_history: [],
          started_at: new Date().toISOString(),
        }),
        ...updates,
        updated_at: new Date().toISOString(),
      } as VoiceFormSessionState
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* quota exceeded */ }
      return next
    })
  }, [key, templateId])

  // Limpiar sesión
  const clearSession = useCallback(() => {
    localStorage.removeItem(key)
    setSession(null)
  }, [key])

  return { session, saveSession, clearSession }
}
```

### 5. Integración en `voiceFormFiller.ts`
Agregar al inicio del pipeline `extractFieldsFromVoice()`:
1. Detectar idioma: `const lang = detectLanguage(voiceText)`
2. Normalizar texto: `const normalizedText = normalizeWithLanguage(voiceText, lang)`
3. Usar `normalizedText` en lugar de `voiceText` para la extracción
4. Al final, si se pasan `validationRules`, ejecutar `validator.validateAll()`
5. Marcar campos inválidos en `campos_no_encontrados` con sufijo `:invalid`

Modificar la firma de `extractFieldsFromVoice()`:
```typescript
export async function extractFieldsFromVoice(
  voiceText: string,
  checklistFields: ChecklistField[],
  options?: {
    validationRules?: FieldValidationRule[]
    language?: VoiceFormLanguage  // si no se pasa, se autodetecta
  }
): Promise<VoiceFormFillResult>
```

## Lo que NO debes hacer
- No modificar `VoiceFormButton.tsx` ni `VoiceAuditor.tsx` — eso va en Ola 2
- No crear endpoints API — solo lógica de servicio y hooks
- No integrar ElevenLabs TTS — fuera de scope
- No hacer i18n completo de toda la UI — solo del motor de extracción de voz

## Criterio de éxito
- TypeScript compila sin errores: `npx tsc --noEmit`
- `detectLanguage("the equipment is broken")` retorna `'en'`
- `detectLanguage("el equipo está roto")` retorna `'es'`
- `validator.validateField('edad', 250, { field_id: 'edad', max: 120, unit: 'años' })` retorna `{ is_valid: false, error: '...' }`
- `useVoiceSession('solicitud_servicio')` persiste en localStorage y se recupera tras refresh
```

---

## Ola 2 — Frontend: UI y componentes que consumen los servicios de Ola 1
> Ejecutar SOLO después de que Ola 1 esté completa
> Ejecutar Agente A + Agente B + Agente C en PARALELO

---

### Agente A — UI: Admin de jobs WhatsApp RRHH

**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** Ola 1 completa (Agente A de Ola 1)

#### Objetivo
Crear una página de administración en el dashboard para que managers puedan ver los jobs de WhatsApp RRHH: estado, historial de envíos, respuestas de empleados, y re-disparar mensajes fallidos.

#### Archivos a crear
- `src/app/(dashboard)/rrhh/whatsapp-jobs/page.tsx` — página admin de jobs
- `src/components/rrhh/WhatsAppJobsTable.tsx` — tabla de jobs con filtros
- `src/components/rrhh/WhatsAppJobDetail.tsx` — modal de detalle de job con historial
- `src/app/api/rrhh/whatsapp-jobs/route.ts` — API para listar jobs de WhatsApp RRHH
- `src/app/api/rrhh/whatsapp-jobs/[id]/retry/route.ts` — API para re-disparar job fallido

#### Archivos a modificar
- `src/config/navigation.ts` — agregar entrada "WhatsApp RRHH" bajo sección RRHH (solo visible con rol manager/admin)

#### Prompt completo para el agente

```
Eres un agente de desarrollo en el proyecto 9001app-firebase (Next.js 14 + Firebase + TypeScript strict).

## Tu tarea
Crear la UI de administración para ver y gestionar los jobs de WhatsApp RRHH (asignaciones y recordatorios enviados a empleados por WhatsApp).

## Contexto del proyecto
- Stack: Next.js 14.2.18, TypeScript strict, Tailwind CSS, Radix UI, Firebase Admin SDK 13.5
- Design System: Radix UI + Tailwind. Ver componentes en `src/components/ui/` (button, card, badge, table, sheet, dialog)
- Auth: `withAuth` wrapper + `resolveAuthorizedOrganizationId` — SIEMPRE en APIs
- Iconos: `lucide-react`
- Fechas: usar `date-fns` (ya instalado) o `Intl.DateTimeFormat`
- Colección Firestore relevante: `agent_jobs` con campos: `intent`, `payload`, `status` ('pending'|'processing'|'completed'|'failed'), `organization_id`, `created_at`, `completed_at`, `error`

## Archivos modelo a leer ANTES de escribir código
1. `src/app/(dashboard)/rrhh/` — ver estructura de páginas RRHH existentes
2. `src/app/api/` — ver un ejemplo de API route simple con `withAuth`
3. `src/config/navigation.ts` — ver cómo se agrega una entrada de navegación
4. `src/types/whatsapp-rrhh.ts` — tipos creados en Ola 1 (leer)
5. `src/components/ui/` — componentes disponibles (button, badge, card, table)

## Lo que debes implementar

### 1. API `GET /api/rrhh/whatsapp-jobs`
```typescript
// Query params: intent (task.assign|task.reminder), status, page (default 1), limit (default 20)
// Retorna: { jobs: AgentJob[], total: number, page: number }
// Filtrar por: organization_id (del token), intent que contiene 'whatsapp' o sea 'task.assign'/'task.reminder'
// Ordenar: created_at desc
```

### 2. API `POST /api/rrhh/whatsapp-jobs/[id]/retry`
```typescript
// Requiere rol 'admin' o 'manager'
// Crea un nuevo job en agent_jobs con el mismo payload, status: 'pending'
// Retorna: { new_job_id: string }
```

### 3. Página `/rrhh/whatsapp-jobs`
Diseño:
- Header: "WhatsApp RRHH — Historial de Mensajes" + badge con total de pendientes
- Filtros: Status (todos/pending/completed/failed), Intent (todos/asignación/recordatorio), rango de fechas
- Tabla con columnas: Empleado (phone), Tipo, Estado (badge coloreado), Fecha de envío, Respuesta, Acciones
- Acciones por row: "Ver detalle" → Sheet lateral, "Reintentar" (solo si failed)
- Paginación

Colores de badges de estado:
- `pending` → amarillo
- `processing` → azul
- `completed` → verde
- `failed` → rojo

### 4. Componente `WhatsAppJobDetail`
Sheet lateral que muestra:
- Teléfono del empleado + nombre si disponible
- Mensaje enviado (del payload)
- Respuesta del empleado (si existe en la conversación vinculada)
- Intent detectado en la respuesta (si existe)
- Timeline de estados del job
- Botón "Reintentar" si status es 'failed'

### 5. Modificación de `navigation.ts`
Agregar bajo sección RRHH:
```typescript
{
  label: 'WhatsApp RRHH',
  href: '/rrhh/whatsapp-jobs',
  icon: 'MessageSquare',
  requiredRoles: ['admin', 'manager'],
  // Solo visible si hay algún job en las últimas 24h (badge dinámico no requerido en esta ola)
}
```

## Lo que NO debes hacer
- No crear componentes de tiempo real (WebSocket/polling) — el refresh es manual
- No crear charts ni métricas — solo tabla y detalle
- No modificar la lógica de jobs ni handlers — solo UI
- No crear la integración de WhatsApp config desde esta UI

## Criterio de éxito
- La página `/rrhh/whatsapp-jobs` carga sin errores TypeScript
- La tabla muestra jobs filtrados por organización (no cross-org)
- Los badges de estado tienen los colores correctos
- El botón "Reintentar" llama al endpoint `/retry` y muestra feedback
- TypeScript compila sin errores: `npx tsc --noEmit`
```

---

### Agente B — UI: Media attachments y search en WhatsApp CRM Inbox

**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** Ola 1 completa (Agente B de Ola 1)

#### Objetivo
Actualizar la UI del WhatsApp CRM Inbox para renderizar media attachments (imágenes, documentos, audio) en el historial de mensajes, y agregar un input de búsqueda full-text sobre mensajes de una conversación.

#### Archivos a crear
- `src/components/crm/whatsapp/MediaMessage.tsx` — renderiza media según tipo (imagen, documento, audio)
- `src/components/crm/whatsapp/ConversationSearch.tsx` — input de búsqueda con resultados resaltados

#### Archivos a modificar
- `src/app/(dashboard)/crm/whatsapp/[convId]/page.tsx` — integrar `MediaMessage` y `ConversationSearch`
- `src/components/crm/whatsapp/` — cualquier componente de mensaje existente que deba renderizar media

#### Prompt completo para el agente

```
Eres un agente de desarrollo en el proyecto 9001app-firebase (Next.js 14 + Firebase + TypeScript strict).

## Tu tarea
Actualizar la UI del chat en WhatsApp CRM Inbox para:
1. Renderizar imágenes, documentos y audio recibidos por WhatsApp (media attachments)
2. Agregar búsqueda full-text dentro de una conversación

## Contexto del proyecto
- Stack: Next.js 14.2.18, TypeScript strict, Tailwind CSS, Radix UI, lucide-react
- Design System: Radix UI + Tailwind. Ver componentes en `src/components/ui/`
- Los tipos de media vienen de `src/types/whatsapp-media.ts` (creado en Ola 1)
- El endpoint de búsqueda es `GET /api/whatsapp/conversations/[id]/messages?search=texto`

## Archivos modelo a leer ANTES de escribir código
1. `src/app/(dashboard)/crm/whatsapp/[convId]/page.tsx` — página de conversación actual
2. `src/types/whatsapp.ts` — tipos existentes de mensajes (ahora tienen campo `media?`)
3. `src/types/whatsapp-media.ts` — tipos de media (creado en Ola 1, leer)
4. `src/components/ui/` — componentes disponibles

## Lo que debes implementar

### 1. Componente `MediaMessage.tsx`
```typescript
interface MediaMessageProps {
  media: WhatsAppMediaAttachment
  direction: 'inbound' | 'outbound'
}
```

Renderizado según tipo:
- **image**: `<img src={media.storage_url} className="max-w-[240px] max-h-[320px] rounded-lg object-cover cursor-pointer" />`
  - Al click → abrir en modal/lightbox usando `Dialog` de Radix
- **document**: Card con icono `FileText`, nombre del archivo, botón "Descargar" (link con `target="_blank"`)
  - Mostrar mime_type y size en bytes formateado (ej: "2.3 MB")
- **audio**: Elemento `<audio controls src={media.storage_url} className="w-full" />`
  - Si es ogg (WhatsApp voice note) → mostrar icono de micrófono + "Nota de voz"
- **video**: `<video controls src={media.storage_url} className="max-w-[240px] rounded-lg" />`
- **fallback**: Card con icono `Paperclip` + "Adjunto no soportado"

### 2. Integración en la UI de mensajes
En la página de conversación, al renderizar cada mensaje:
```tsx
{message.has_media && message.media ? (
  <MediaMessage media={message.media} direction={message.direction} />
) : (
  <p>{message.text}</p>
)}
```

### 3. Componente `ConversationSearch.tsx`
```typescript
interface ConversationSearchProps {
  conversationId: string
  onResultsChange: (messageIds: string[]) => void
}
```

- Input de texto con icono `Search` de lucide-react
- Debounce de 400ms antes de llamar API
- Al tipear 3+ caracteres → `GET /api/whatsapp/conversations/${convId}/messages?search=${query}`
- Mostrar badge con número de resultados: "3 mensajes encontrados"
- Botón X para limpiar búsqueda
- Si 0 resultados → "Sin resultados para '[query]'"

Resaltado de búsqueda: en el historial de mensajes, si `highlightedMessageIds` incluye el ID del mensaje, agregar `ring-2 ring-primary` al contenedor del mensaje.

### 4. Layout actualizado de la página de conversación
Agregar en el header del chat (encima del historial):
```
[← Volver] [Nombre del contacto] [Estado badge]    [🔍 Buscar en chat]
```

El `ConversationSearch` se abre/cierra con toggle en el botón de lupa.

## Lo que NO debes hacer
- No implementar upload de media desde la UI (enviar fotos) — solo recepción/visualización
- No crear compresión de imágenes
- No modificar el webhook ni los servicios backend — solo UI
- No hacer lightbox personalizado complejo — usar `Dialog` de Radix simple

## Criterio de éxito
- Mensajes con `has_media: true` muestran el componente correcto según tipo
- Imágenes se abren en dialog al click
- Documentos tienen link de descarga funcional
- La búsqueda hace debounce y llama al endpoint correcto
- Los mensajes encontrados se resaltan en el chat
- TypeScript compila sin errores: `npx tsc --noEmit`
```

---

### Agente C — UI: VoiceFormButton mejorado con feedback, persistencia y validación

**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** Ola 1 completa (Agente C de Ola 1)

#### Objetivo
Actualizar `VoiceFormButton` y `VoiceAuditor` para incorporar: feedback en tiempo real durante la dictación, persistencia de sesión via `useVoiceSession`, visualización de errores de validación de rangos, y detección de idioma automática con indicador en la UI.

#### Archivos a modificar
- `src/components/voice/VoiceFormButton.tsx` — integrar feedback, persistencia, validación
- `src/components/voice/VoiceAuditor.tsx` — agregar indicador de idioma detectado y estado de sesión

#### Archivos a crear
- `src/components/voice/VoiceSessionBanner.tsx` — banner que avisa que hay una sesión guardada con opción de restaurar

#### Prompt completo para el agente

```
Eres un agente de desarrollo en el proyecto 9001app-firebase (Next.js 14 + Firebase + TypeScript strict).

## Tu tarea
Mejorar los componentes de voz del Formulario Líquido para incorporar:
1. Feedback en tiempo real: mostrar transcript parcial mientras el usuario habla
2. Persistencia: usar `useVoiceSession` para recordar campos entre recargas
3. Validación: mostrar errores/warnings de validación de rangos en la UI
4. Idioma: detectar y mostrar el idioma detectado (ES/EN)

## Contexto del proyecto
- Stack: Next.js 14.2.18, TypeScript strict, Tailwind CSS, Radix UI, lucide-react
- Los hooks y servicios de Ola 1 ya existen:
  - `src/hooks/use-voice-session.ts` — persistencia localStorage
  - `src/services/ai-core/voiceFormValidator.ts` — validación de rangos
  - `src/services/ai-core/voiceFormI18n.ts` — detectLanguage()
- Iconos disponibles: lucide-react (Mic, MicOff, Languages, AlertTriangle, CheckCircle, RotateCcw)

## Archivos modelo a leer ANTES de escribir código
1. `src/components/voice/VoiceFormButton.tsx` — componente actual completo
2. `src/components/voice/VoiceAuditor.tsx` — componente actual
3. `src/hooks/use-voice-session.ts` — hook creado en Ola 1
4. `src/hooks/use-realtime-voice.ts` — ver qué expone el hook de voz
5. `src/types/voice-form.ts` — tipos creados en Ola 1

## Lo que debes implementar

### 1. `VoiceFormButton.tsx` actualizado

Nuevas props a agregar (retrocompatibles — todas opcionales):
```typescript
interface VoiceFormButtonProps {
  templateId: string
  onFieldsExtracted: (result: VoiceFormFillResult) => void
  disabled?: boolean
  // NUEVO:
  validationRules?: FieldValidationRule[]     // reglas de validación por campo
  enablePersistence?: boolean                  // default: true
  onSessionRestored?: (session: VoiceFormSessionState) => void  // callback al restaurar
  showLanguageIndicator?: boolean              // default: true
}
```

Nuevos estados visuales:
```
idle        → [🎤] Completar por voz
listening   → [🎙️ Escuchando... "texto parcial aquí"] (animado, muestra transcript parcial)
processing  → [⏳ Procesando en ES...]  ← muestra idioma detectado
done        → [✅ 3 campos completados, 1 con advertencia]
error       → [⚠️ Error: "descripción"] + botón reintentar
validating  → [🔍 Validando campos...]
```

Implementar transcript parcial:
- Mientras `status === 'listening'`, mostrar el interim transcript debajo del botón en texto pequeño gris
- Usar el interim result de Web Speech API si disponible, o placeholder animado

Implementar banner de validación:
- Después de extracción, si hay `FieldValidationResult` con `is_valid: false`:
  ```
  ⚠️ Campo "Edad": El valor 250 supera el máximo (120 años). ¿Deseas corregirlo?
  [Usar 120] [Dejarlo vacío] [Ignorar]
  ```
- Si solo hay warnings (is_valid: true pero hay warning):
  ```
  ℹ️ Campo "Edad": Valor inusualmente alto (99 años). ¿Es correcto?
  [Sí, es correcto] [Corregir]
  ```

Implementar persistencia:
```typescript
const { session, saveSession, clearSession } = useVoiceSession(templateId)

// Al extraer campos exitosamente:
saveSession({
  extracted_fields: result.campos_extraidos.reduce((acc, f) => ({ ...acc, [f.campo_id]: f.valor_extraido }), {}),
  failed_fields: result.campos_no_encontrados,
  transcript_history: [...(session?.transcript_history ?? []), transcript],
  language: detectedLang,
})
```

### 2. `VoiceSessionBanner.tsx`
Componente que aparece en la parte superior del formulario si hay sesión guardada:

```
┌─────────────────────────────────────────────────────────────────┐
│ 💬 Tienes una sesión de voz guardada de hace 12 minutos        │
│ Se completaron: cliente_nombre, tipo_servicio (+2 más)          │
│                    [Restaurar sesión]  [Descartar]              │
└─────────────────────────────────────────────────────────────────┘
```

Props:
```typescript
interface VoiceSessionBannerProps {
  session: VoiceFormSessionState
  onRestore: (session: VoiceFormSessionState) => void
  onDiscard: () => void
}
```

Al click en "Restaurar sesión": llamar `onRestore(session)` — el padre aplica los valores al form.
Al click en "Descartar": llamar `onDiscard()` → `clearSession()`.

### 3. `VoiceAuditor.tsx` actualizado
Agregar en el header del componente:
- Badge de idioma detectado: `[ES]` o `[EN]` (se actualiza tras cada dictación)
- Indicador de sesión: "💾 Sesión activa" si hay session guardada

## Lo que NO debes hacer
- No reescribir la lógica de Web Speech API ni OpenAI Realtime — solo UI
- No modificar `voiceFormFiller.ts` — ya fue modificado en Ola 1
- No crear nuevos endpoints API
- No implementar TTS (texto a voz de respuesta) — solo STT (voz a texto)

## Criterio de éxito
- El botón muestra transcript parcial mientras escucha
- El idioma detectado aparece en el badge durante `processing`
- Campos con errores de validación muestran banner con opciones
- `useVoiceSession` preserva los campos extraídos entre recargas de página
- `VoiceSessionBanner` aparece si hay sesión en localStorage con menos de 2h
- TypeScript compila sin errores: `npx tsc --noEmit`
```

---

## Ola 3 — Integración, rate limiting y Embedded Signup
> Ejecutar SOLO después de que Ola 2 esté completa
> Ejecutar Agente A + Agente B en PARALELO

---

### Agente A — Rate limiting WhatsApp + circuit breaker

**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** Ola 2 completa

#### Objetivo
Implementar rate limiting por usuario para mensajes WhatsApp salientes (máximo N mensajes por hora por organización) y un circuit breaker simple para fallos de Twilio/Meta API.

#### Archivos a crear
- `src/lib/whatsapp/RateLimiter.ts` — contador en Firestore con ventana deslizante de 1h
- `src/lib/whatsapp/CircuitBreaker.ts` — circuit breaker: closed/open/half-open con Firestore

#### Archivos a modificar
- `src/services/whatsapp/WhatsAppService.ts` — integrar `RateLimiter` y `CircuitBreaker` en `sendMessage()`
- `src/lib/whatsapp/WhatsAppClient.ts` — envolver `sendTextMessage()` con circuit breaker

#### Prompt completo para el agente

```
Eres un agente de desarrollo en el proyecto 9001app-firebase (Next.js 14 + Firebase + TypeScript strict).

## Tu tarea
Implementar rate limiting y circuit breaker para el sistema de envío WhatsApp.

## Contexto del proyecto
- Stack: Next.js 14.2.18, TypeScript strict, Firebase Admin SDK 13.5
- Firestore: se usa como store compartido entre instancias de Next.js (serverless)
- `z.record()` requiere 2 argumentos: `z.record(z.string(), valueType)`

## Archivos modelo a leer
1. `src/lib/whatsapp/WhatsAppClient.ts` — cliente actual
2. `src/services/whatsapp/WhatsAppService.ts` — ver `sendMessage()`

## Lo que debes implementar

### 1. `src/lib/whatsapp/RateLimiter.ts`
```typescript
interface RateLimitConfig {
  max_per_hour: number       // default: 100 mensajes por org por hora
  max_per_minute: number     // default: 10 mensajes por org por minuto
}

export class WhatsAppRateLimiter {
  constructor(private db: FirebaseFirestore.Firestore, private config: RateLimitConfig) {}

  // Verifica si se puede enviar. Si no, lanza RateLimitError
  async checkAndIncrement(orgId: string): Promise<void>

  // Consulta cuántos mensajes quedan en la ventana actual
  async getRemainingQuota(orgId: string): Promise<{ per_hour: number; per_minute: number }>
}
```

Implementación con Firestore:
- Documento: `system_rate_limits/{orgId}_whatsapp`
- Campos: `count_hour: number`, `count_minute: number`, `window_hour_start: Timestamp`, `window_minute_start: Timestamp`
- Usar `runTransaction()` para atomicidad
- Si la ventana expiró (>1h o >1min), resetear contador a 0

### 2. `src/lib/whatsapp/CircuitBreaker.ts`
```typescript
type CircuitState = 'closed' | 'open' | 'half-open'

interface CircuitBreakerConfig {
  failure_threshold: number    // fallos consecutivos para abrir (default: 5)
  success_threshold: number    // éxitos en half-open para cerrar (default: 2)
  timeout_ms: number           // tiempo en open antes de probar half-open (default: 60000 = 1min)
}

export class WhatsAppCircuitBreaker {
  constructor(private db: FirebaseFirestore.Firestore, private config: CircuitBreakerConfig) {}

  // Ejecuta la función protegida. Si el circuit está 'open', lanza CircuitOpenError
  async execute<T>(fn: () => Promise<T>): Promise<T>

  // Consulta el estado actual del circuit
  async getState(): Promise<CircuitState>
}
```

Almacenamiento en Firestore:
- Documento: `system_circuit_breakers/whatsapp`
- Campos: `state: CircuitState`, `failure_count: number`, `success_count: number`, `last_failure_at: Timestamp`, `opened_at?: Timestamp`

### 3. Integración en `WhatsAppService.sendMessage()`
Antes de llamar a `WhatsAppClient.sendTextMessage()`:
```typescript
const rateLimiter = new WhatsAppRateLimiter(db, { max_per_hour: 100, max_per_minute: 10 })
await rateLimiter.checkAndIncrement(orgId)  // lanza si excede

const breaker = new WhatsAppCircuitBreaker(db, { failure_threshold: 5, timeout_ms: 60000 })
const result = await breaker.execute(() => client.sendTextMessage(phone, text))
```

Manejar errores:
```typescript
catch (err) {
  if (err instanceof RateLimitError) {
    return { success: false, error: 'rate_limit', retry_after_seconds: err.retry_after }
  }
  if (err instanceof CircuitOpenError) {
    return { success: false, error: 'service_unavailable', retry_after_seconds: 60 }
  }
  throw err
}
```

## Lo que NO debes hacer
- No crear UI para monitorear el circuit breaker
- No usar Redis — solo Firestore
- No aplicar rate limiting al webhook entrante (solo saliente)

## Criterio de éxito
- `checkAndIncrement()` lanza error si se supera el límite
- `execute()` lanza `CircuitOpenError` si `state === 'open'`
- `sendMessage()` retorna `{ success: false, error: 'rate_limit' }` correctamente
- TypeScript compila sin errores: `npx tsc --noEmit`
```

---

### Agente B — Embedded Signup Meta OAuth para WhatsApp CRM

**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** Ola 2 completa

#### Objetivo
Completar el flujo de Embedded Signup de Meta para que cada organización pueda conectar su propio número WhatsApp Business desde la UI, sin intervención manual de soporte.

#### Archivos a crear
- `src/components/crm/whatsapp/EmbeddedSignupFlow.tsx` — componente UI del flujo OAuth Meta
- `src/app/api/whatsapp/connect/route.ts` — endpoint para intercambiar código OAuth por access token (ya puede existir como stub — verificar y completar)
- `src/app/api/whatsapp/connect/callback/route.ts` — callback OAuth de Meta

#### Archivos a modificar
- `src/app/(dashboard)/crm/whatsapp/config/page.tsx` — integrar `EmbeddedSignupFlow` (si la página existe; si no, crearla)

#### Prompt completo para el agente

```
Eres un agente de desarrollo en el proyecto 9001app-firebase (Next.js 14 + Firebase + TypeScript strict).

## Tu tarea
Implementar el flujo completo de Embedded Signup de Meta para que organizaciones puedan conectar su número WhatsApp Business desde la UI de la plataforma.

## Contexto del proyecto
- Stack: Next.js 14.2.18, TypeScript strict, Tailwind CSS, Radix UI, Firebase Admin SDK 13.5
- Auth: `withAuth` wrapper + `resolveAuthorizedOrganizationId`
- Los tipos de config de WhatsApp por org están en `src/types/whatsapp.ts` → `OrganizationWhatsAppConfig`
- La config se guarda en Firestore: `organizations/{orgId}/settings/channels_whatsapp`
- Variables de entorno necesarias: `META_APP_ID`, `META_APP_SECRET`, `NEXT_PUBLIC_META_APP_ID`

## Archivos modelo a leer ANTES de escribir código
1. `src/types/whatsapp.ts` — ver `OrganizationWhatsAppConfig` (campos: `connection_method`, `connection_status`, `connected_waba_id`, `access_token`)
2. `src/app/api/whatsapp/connect/route.ts` — si existe, leer el stub
3. `src/components/ui/` — componentes disponibles (button, card, badge, dialog, alert)

## Lo que debes implementar

### 1. `EmbeddedSignupFlow.tsx`
Flujo en 4 pasos visuales (stepper):

```
Paso 1: Introducción
┌─────────────────────────────────────────────────────────────┐
│ 📱 Conecta tu número WhatsApp Business                      │
│ Necesitas una cuenta de Meta Business Manager activa       │
│                                        [Comenzar →]        │
└─────────────────────────────────────────────────────────────┘

Paso 2: Login con Meta (Embedded Signup)
┌─────────────────────────────────────────────────────────────┐
│ Inicia sesión con tu cuenta de Meta para autorizar         │
│ el acceso a tu WhatsApp Business Account                   │
│                    [Iniciar sesión con Meta]                │
│ (Abre popup de Meta OAuth con FB.login())                  │
└─────────────────────────────────────────────────────────────┘

Paso 3: Procesando conexión (spinner)
┌─────────────────────────────────────────────────────────────┐
│ ⏳ Conectando tu número...                                  │
│ Verificando permisos y configurando webhook                 │
└─────────────────────────────────────────────────────────────┘

Paso 4: Éxito o error
┌─────────────────────────────────────────────────────────────┐
│ ✅ ¡Número conectado exitosamente!                          │
│ +54 9 11 XXXX-XXXX está listo para recibir mensajes       │
│                           [Ir al Inbox]                     │
└─────────────────────────────────────────────────────────────┘
```

Integración con Meta Embedded Signup SDK:
```typescript
// Cargar SDK de Meta en useEffect
useEffect(() => {
  const script = document.createElement('script')
  script.src = 'https://connect.facebook.net/es_LA/sdk.js'
  script.async = true
  script.defer = true
  document.body.appendChild(script)
  window.fbAsyncInit = () => {
    FB.init({ appId: process.env.NEXT_PUBLIC_META_APP_ID!, version: 'v19.0' })
  }
}, [])

// Al click en "Iniciar sesión con Meta":
const handleConnect = () => {
  FB.login(
    async (response) => {
      if (response.authResponse?.code) {
        // Intercambiar code por access token en nuestro backend
        const res = await fetch('/api/whatsapp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code: response.authResponse.code }),
        })
        if (res.ok) setStep('success')
        else setStep('error')
      }
    },
    {
      config_id: '<META_CONFIG_ID>',  // Se leerá de env var META_EMBEDDED_SIGNUP_CONFIG_ID
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {}, featureName: 'whatsapp_embedded_signup', sessionInfoVersion: 3 },
    }
  )
}
```

### 2. API `POST /api/whatsapp/connect`
```typescript
// Body: { code: string }  ← el code OAuth de Meta
// 1. Intercambiar code por access token:
const tokenRes = await fetch(
  `https://graph.facebook.com/v19.0/oauth/access_token?` +
  `client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${code}`
)
const { access_token } = await tokenRes.json()

// 2. Obtener WABA ID y número de teléfono del access token:
const wabaRes = await fetch(
  `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts`,
  { headers: { Authorization: `Bearer ${access_token}` } }
)
const { data: [waba] } = await wabaRes.json()

// 3. Guardar en Firestore:
await db.doc(`organizations/${orgId}/settings/channels_whatsapp`).set({
  enabled: true,
  provider: 'meta',
  connection_method: 'embedded_signup',
  connection_status: 'connected',
  connected_waba_id: waba.id,
  access_token,  // token por organización
  token_connected_at: Timestamp.now(),
}, { merge: true })

// 4. Registrar webhook de Meta para esta org (opcional en esta ola — dejar como TODO)

// Retornar: { success: true, waba_id: waba.id }
```

### 3. Página `/crm/whatsapp/config`
Si no existe, crearla con:
- Sección "Estado de conexión": badge con `connection_status` de Firestore
- Si `not_connected`: mostrar `EmbeddedSignupFlow`
- Si `connected`: mostrar número conectado, WABA ID, botón "Desconectar"
- Sección "Configuración": `auto_reply_enabled`, `welcome_message`, `out_of_hours_message` (formulario simple)
- Botón "Guardar configuración" → `PATCH /api/whatsapp/config`

## Lo que NO debes hacer
- No implementar el registro de webhook de Meta de forma automática (es complejo, dejar como TODO comentado)
- No crear billing/payment flow para Meta Business
- No guardar el access_token en el cliente — solo en Firestore vía API

## Criterio de éxito
- El popup de Meta se abre al click en "Iniciar sesión con Meta"
- El code OAuth se intercambia por access token en el backend
- `organizations/{orgId}/settings/channels_whatsapp` se actualiza con `connection_status: 'connected'`
- La página de config muestra el estado actual de la conexión
- TypeScript compila sin errores: `npx tsc --noEmit`
```

---

## Ola 4 — Tests de integración
> Ejecutar SOLO después de que Ola 3 esté completa
> Agente único

---

### Agente A — Tests de integración para los 3 sistemas

**Puede ejecutarse en paralelo con:** es el único de esta ola
**Depende de:** Ola 3 completa

#### Objetivo
Crear tests de integración cross-org para las nuevas APIs y servicios, siguiendo el patrón de tests existente en el proyecto.

#### Archivos a crear
- `src/__tests__/whatsapp/rrhh-bidireccional.test.ts` — tests del `RhrResponseProcessor`
- `src/__tests__/whatsapp/rate-limiter.test.ts` — tests del `WhatsAppRateLimiter`
- `src/__tests__/voice/voice-form-validator.test.ts` — tests del `VoiceFormValidator`
- `src/__tests__/voice/voice-form-i18n.test.ts` — tests del detector de idioma y normalizador

#### Prompt completo para el agente

```
Eres un agente de desarrollo en el proyecto 9001app-firebase (Next.js 14 + Firebase + TypeScript strict).

## Tu tarea
Crear tests de integración para los servicios implementados en las olas anteriores. Todos los tests deben ser cross-org (verificar que datos de org A no son visibles desde org B).

## Contexto del proyecto
- Tests en `src/__tests__/`, correr con: `npm test`
- Ver tests existentes en `src/__tests__/crm/` o `src/__tests__/iso/` como modelo de estilo y estructura
- Mock de Firestore: ver cómo lo hacen los tests existentes
- Patrón cross-org: crear dos orgs distintas, verificar aislamiento

## Archivos modelo a leer ANTES de escribir
1. Cualquier test existente en `src/__tests__/` — leer al menos 2 para entender el patrón
2. `src/services/whatsapp/RhrResponseProcessor.ts` — servicio a testear
3. `src/lib/whatsapp/RateLimiter.ts` — servicio a testear
4. `src/services/ai-core/voiceFormValidator.ts` — servicio a testear
5. `src/services/ai-core/voiceFormI18n.ts` — servicio a testear

## Tests requeridos

### `rrhh-bidireccional.test.ts`
```typescript
describe('RhrResponseProcessor', () => {
  describe('detectIntent()', () => {
    it('detecta CONFIRM para "OK"')
    it('detecta CONFIRM para "listo 👍"')
    it('detecta REJECT para "no puedo hacerlo"')
    it('detecta ASK_QUESTION para "¿cuándo es?"')
    it('detecta REPORT_ISSUE para "hay un problema con el equipo"')
    it('detecta REQUEST_DEADLINE para "¿para cuándo necesito entregarlo?"')
    it('retorna UNKNOWN con confidence 0.3 para texto ambiguo')
  })

  describe('generateReply()', () => {
    it('genera mensaje de confirmación para CONFIRM')
    it('retorna null para UNKNOWN (no responder)')
    it('genera mensaje de problema registrado para REPORT_ISSUE')
  })

  describe('cross-org isolation', () => {
    it('no encuentra job relacionado de otra organización')
  })
})
```

### `rate-limiter.test.ts`
```typescript
describe('WhatsAppRateLimiter', () => {
  it('permite enviar dentro del límite por minuto')
  it('bloquea al superar el límite por minuto')
  it('resetea contador cuando la ventana expira')
  it('aísla contadores por organización (cross-org)')
})
```

### `voice-form-validator.test.ts`
```typescript
describe('VoiceFormValidator', () => {
  describe('validateField() numérico', () => {
    it('retorna is_valid: true para valor dentro de rango')
    it('retorna is_valid: false para valor menor al mínimo')
    it('retorna is_valid: false para valor mayor al máximo')
    it('incluye corrected_value al hacer auto-clamp')
    it('retorna warning para valor inusualmente alto')
  })

  describe('validateField() fecha', () => {
    it('retorna is_valid: false para fecha en el pasado con min_date: today')
    it('acepta fecha de hoy con min_date: today')
  })

  describe('validateField() texto con pattern', () => {
    it('valida email básico')
    it('rechaza email inválido')
  })
})
```

### `voice-form-i18n.test.ts`
```typescript
describe('detectLanguage()', () => {
  it('detecta español correctamente')
  it('detecta inglés correctamente')
  it('retorna "es" por defecto cuando es ambiguo')
})

describe('normalizeWithLanguage()', () => {
  it('reemplaza "kilos" por "kg" en español')
  it('reemplaza "pounds" por "lb" en inglés')
  it('reemplaza "hoy" por fecha ISO de hoy en español')
  it('reemplaza "today" por fecha ISO de hoy en inglés')
  it('reemplaza "ayer" por fecha ISO de ayer')
})
```

## Lo que NO debes hacer
- No crear tests de UI/componentes React
- No crear tests e2e (Playwright/Cypress) — solo unit/integration
- No testear el webhook de Meta (requiere infraestructura externa)

## Criterio de éxito
- `npm test` pasa sin errores
- Todos los tests cross-org verifican aislamiento de datos
- Cobertura de los casos happy path + edge cases descritos
```

---

## Verificación final

### Checklist manual post-implementación

#### WhatsApp RRHH
- [ ] Asignar una tarea a un responsable con teléfono en su perfil
- [ ] Verificar que se crea job `task.assign` en `agent_jobs`
- [ ] Simular respuesta "OK" al webhook → verificar que tarea se marca `completada`
- [ ] Simular respuesta "¿para cuándo?" → verificar que job responde con deadline
- [ ] Ir a `/rrhh/whatsapp-jobs` → ver el job en la tabla
- [ ] Click "Ver detalle" → ver el mensaje enviado y la respuesta del empleado
- [ ] Click "Reintentar" en un job `failed` → verificar que crea nuevo job

#### WhatsApp CRM Inbox
- [ ] Simular recepción de imagen via webhook → verificar que se descarga y guarda en Storage
- [ ] Abrir conversación → verificar que la imagen se renderiza (no placeholder roto)
- [ ] Click en imagen → verificar que se abre en modal
- [ ] Simular recepción de PDF → verificar card de documento con link de descarga
- [ ] Usar search box "factura" → verificar que mensajes relevantes se resaltan
- [ ] Ir a `/crm/whatsapp/config` → verificar estado de conexión
- [ ] Si no conectado → ver el flujo de Embedded Signup (Paso 1 al menos)

#### Formulario Líquido
- [ ] Abrir formulario con `VoiceFormButton`
- [ ] Si hay sesión previa → ver `VoiceSessionBanner`
- [ ] Click "Restaurar sesión" → verificar que campos se recuperan
- [ ] Dictar en español → verificar badge `[ES]` en UI
- [ ] Dictar en inglés → verificar badge `[EN]` en UI
- [ ] Dictar valor fuera de rango (ej: edad 300) → ver banner de advertencia con opciones
- [ ] Click "Usar 120" → verificar que campo se ajusta al máximo
- [ ] Recargar página → verificar que sesión persiste si tiene < 2h
- [ ] Verificar en localStorage: `voice_form_session_[templateId]` con datos correctos

#### Tests
- [ ] `npm test` pasa sin errores
- [ ] Tests cross-org verifican aislamiento correcto

---

## Resumen de archivos por ola

| Ola | Agente | Archivos nuevos | Archivos modificados |
|-----|--------|-----------------|----------------------|
| 1 | A (RRHH) | `WhatsappMessageReceivedHandler.ts`, `RhrResponseProcessor.ts`, `whatsapp-rrhh.ts` | `AgentWorkerService.ts`, `WhatsAppService.ts` |
| 1 | B (Media/Search) | `MediaHandler.ts`, `MessageSearchService.ts`, `whatsapp-media.ts` | `whatsapp.ts`, `WhatsAppService.ts`, `messages/route.ts` |
| 1 | C (Voice) | `voiceFormValidator.ts`, `voiceFormI18n.ts`, `use-voice-session.ts` | `voiceFormFiller.ts`, `voice-form.ts` |
| 2 | A (UI RRHH) | `whatsapp-jobs/page.tsx`, `WhatsAppJobsTable.tsx`, `WhatsAppJobDetail.tsx`, `rrhh/whatsapp-jobs/route.ts`, `retry/route.ts` | `navigation.ts` |
| 2 | B (UI Media) | `MediaMessage.tsx`, `ConversationSearch.tsx` | `crm/whatsapp/[convId]/page.tsx` |
| 2 | C (UI Voice) | `VoiceSessionBanner.tsx` | `VoiceFormButton.tsx`, `VoiceAuditor.tsx` |
| 3 | A (Rate limit) | `RateLimiter.ts`, `CircuitBreaker.ts` | `WhatsAppService.ts`, `WhatsAppClient.ts` |
| 3 | B (OAuth Meta) | `EmbeddedSignupFlow.tsx`, `connect/route.ts`, `connect/callback/route.ts` | `crm/whatsapp/config/page.tsx` |
| 4 | A (Tests) | 4 archivos de test | — |

**Total: 19 archivos nuevos, 10 modificados — 4 olas, 9 agentes**
