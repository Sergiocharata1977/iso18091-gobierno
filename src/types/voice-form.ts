export type VoiceFormLanguage = 'es' | 'en';

export interface FieldValidationRule {
  field_id: string;
  min?: number;
  max?: number;
  unit?: string;
  allowed_values?: string[];
  min_date?: 'today' | 'yesterday' | string;
  max_date?: 'today' | 'tomorrow' | string;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  error_message?: string;
}

export interface FieldValidationResult {
  field_id: string;
  is_valid: boolean;
  original_value: unknown;
  corrected_value?: unknown;
  error?: string;
  warning?: string;
}

export interface VoiceFormSessionState {
  session_id: string;
  form_template_id: string;
  language: VoiceFormLanguage;
  extracted_fields: Record<string, unknown>;
  failed_fields: string[];
  transcript_history: string[];
  started_at: string;
  updated_at: string;
}

