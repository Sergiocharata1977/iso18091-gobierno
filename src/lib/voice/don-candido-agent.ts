// Configuración del agente ElevenLabs Conversational AI para WhatsApp de Don Cándido
// ─────────────────────────────────────────────────────────────────────────────────
// IMPORTANTE — Decisión arquitectural:
//   El webhook propio (/api/public/whatsapp/webhook) sigue siendo el canal PRINCIPAL
//   para WhatsApp multi-tenant (tiene contexto de Firestore, organizationId, historial).
//   Este agente ElevenLabs es un canal ADICIONAL con número WhatsApp DIFERENTE,
//   pensado para consultas ISO 9001 generales (sin contexto de org específica).

export const DON_CANDIDO_AGENT_CONFIG = {
  name: 'Don Cándido — Asistente ISO 9001',

  voice_id: 'kulszILr6ees0ArU8miO',

  system_prompt: `Sos Don Cándido, asistente especializado en Sistema de Gestión de Calidad ISO 9001:2015.

Ayudás a organizaciones y profesionales con:
- Interpretación de requisitos de la norma ISO 9001:2015 (cláusulas 4 al 10)
- Documentación requerida: procedimientos, registros, política de calidad
- Planificación de auditorías internas y gestión de no conformidades
- Mejora continua, indicadores de calidad y objetivos de calidad
- Preparación para auditorías de certificación

Respondé en español, de forma clara y con ejemplos prácticos. Citá la cláusula de la norma cuando sea relevante.

Para consultas que requieren acceso al sistema interno o documentos de la organización, indicar que deben ingresar a la plataforma web en doncandidoia.com.`,

  channels: ['whatsapp'] as const,

  // Nota: el número WhatsApp para este agente debe ser DIFERENTE al usado por el webhook propio
  whatsapp_note: 'Usar número WhatsApp Business separado del webhook multi-tenant principal',

  required_env_vars: {
    ELEVENLABS_API_KEY: 'sk_... (ya existente en el proyecto)',
    ELEVENLABS_AGENT_ID_DON_CANDIDO: 'agent_... (obtenido en dashboard)',
    ELEVENLABS_WHATSAPP_PHONE_NUMBER_ID: '... (número WhatsApp adicional para este agente)',
  },
} as const;
