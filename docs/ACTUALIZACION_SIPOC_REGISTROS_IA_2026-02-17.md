# ACTUALIZACION SIPOC REGISTROS E IA - 2026-02-17

## Objetivo
Documentar los cambios funcionales recientes en `9001app-firebase` sobre:
- SIPOC simplificado para operación.
- Modelo de registros por tipo de proceso.
- Asistencia IA contextual y estabilidad en chat.

## 1) SIPOC simple con dos modelos de registro
Se consolidó la regla funcional de negocio:

1. Procesos con registros exclusivos (`tipo_registros = vincular`)
- Se gestionan en su módulo propio (`mejoras`, `auditorias`, `nc`).
- No corresponde crear registro en ABM general de Registros de Procesos.

2. Procesos sin módulo exclusivo (`tipo_registros = crear`)
- Se gestionan en ABM de Registros de Procesos.
- Cada registro queda vinculado a su Definición de Proceso.

3. Procesos híbridos (`tipo_registros = ambos`)
- Permite módulo exclusivo + ABM general.

## 2) Cambios aplicados

### Definiciones de proceso
- Se agregó captura y validación de:
  - `tipo_registros`
  - `modulo_vinculado`
- Regla de validación:
  - Si `tipo_registros = vincular`, `modulo_vinculado` es obligatorio.

### ABM de Registros de Procesos
- Se bloquea alta si la definición es `vincular`.
- Se muestra feedback en UI para que el usuario vaya al módulo correcto.
- Se refuerza relación de alta:
  - validación de definición existente,
  - validación de organización,
  - persistencia de `process_definition_nombre`.

### Etapas por defecto
- Al crear un registro, se crean automáticamente etapas en `processRecordStages` usando `etapas_default`.

## 3) Mejora UX: botón IA contextual
En `Procesos > Registros` se agregó botón:
- `¿Qué hago acá?`

Comportamiento:
- Usa IA contextual para guiar al usuario según pantalla y regla de negocio.
- La respuesta se muestra como guía dentro de la misma vista.

## 4) Error IA detectado y corrección
Error reportado por usuarios:
- `La base de datos requiere un índice` en chat.

Causa:
- Consultas de mensajes dependían de índice compuesto (`where + orderBy`) en Firestore.

Corrección aplicada:
- Se agregaron fallbacks en `ChatService` para que, si falta índice:
  - recupere mensajes sin `orderBy`,
  - ordene en memoria,
  - no interrumpa la conversación.
- Se mejoró detección de mensaje de índice en frontend (español/inglés).

## 5) Resultado esperado
- Menos fricción en carga de procesos y registros.
- Menos errores de uso por duplicidad de módulos.
- IA más útil para onboarding contextual.
- Chat más resiliente aunque falte índice en entorno.

## 6) Archivos clave impactados
- `src/components/processRecords/ProcessDefinitionFormDialog.tsx`
- `src/components/processRecords/ProcessRecordFormDialog.tsx`
- `src/app/api/process-definitions/route.ts`
- `src/app/api/process-records/route.ts`
- `src/services/processRecords/ProcessRecordServiceAdmin.ts`
- `src/app/procesos/definiciones/[id]/page.tsx`
- `src/app/procesos/registros/page.tsx`
- `src/components/procesos/ProcessAISuggestionDialog.tsx`
- `src/components/ui/AIAssistButton.tsx`
- `src/features/chat/services/ChatService.ts`
- `src/features/chat/components/ChatWindow.tsx`

## 7) Recomendaciones siguientes
1. Crear índices Firestore definitivos para mensajes/sesiones en producción.
2. Reemplazar el usuario mock de registros (`user-1`) por contexto real autenticado.
3. Extender botón `¿Qué hago acá?` a Definiciones y Kanban por etapa.
4. Agregar telemetría de uso de asistencia IA contextual.
