// Tipos legacy para compatibilidad con código existente
// Estos tipos se re-exportan desde el nuevo módulo de chat

// Re-export types from new location
export type { ChatMessage, ChatSession } from '@/features/chat/types';

// Legacy types for UsageTrackingService compatibility
export interface UsoClaude {
  id: string;
  user_id: string;
  organization_id?: string | null;
  session_id?: string;
  tipo_operacion: 'chat' | 'formulario' | 'analisis_imagen' | 'reporte';
  ai_plan_id?: string | null;
  provider?: string | null;
  model?: string | null;
  tokens_input: number;
  tokens_output: number;
  costo_estimado: number;
  tokens_input_real?: number;
  tokens_output_real?: number;
  cost_actual_usd?: number;
  cost_billing_usd?: number;
  agent_instance_id?: string | null;
  intent?: string | null;
  fecha: Date;
  metadata: {
    modulo?: string;
    tipo_consulta?: string;
    tiempo_respuesta_ms?: number;
  };
}

export interface UsageSummary {
  total_consultas: number;
  total_tokens_input: number;
  total_tokens_output: number;
  costo_total: number;
  promedio_tokens_por_consulta: number;
}

export interface LimitStatus {
  exceeded: boolean;
  consultas_restantes: number;
  tokens_restantes: number;
  costo_restante: number;
}

// Legacy types for continuous mode
export type ContinuousModeState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking';

export interface ContinuousModeControllerProps {
  onTranscript: (text: string) => void;
  onResponse: (text: string) => void;
  disabled?: boolean;
  onStateChange?: (state: ContinuousModeState) => void;
  responseText?: string;
}

// Legacy Mensaje type (alias for ChatMessage)
export interface Mensaje {
  id: string;
  tipo: 'usuario' | 'asistente' | 'sistema';
  contenido: string;
  timestamp: Date;
  via: 'texto' | 'voz' | 'imagen';
  tokens?: {
    input: number;
    output: number;
  };
  autoPlay?: boolean;
}
