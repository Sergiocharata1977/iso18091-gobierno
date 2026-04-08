// Types for conversational forms

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'boolean';
  required: boolean;
  validation?: (value: unknown) => boolean;
  options?: string[];
  defaultValue?: unknown;
  description?: string;
}

export interface FormState {
  id: string;
  session_id: string;
  user_id: string;
  form_type: string;
  estado: 'en_progreso' | 'completado' | 'cancelado';

  fields: FormField[];
  collected_data: Record<string, unknown>;
  current_field_index: number;

  created_record_id?: string;

  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface ConversationalFormDefinition {
  type: string;
  name: string;
  description: string;
  fields: FormField[];
  collectionName: string; // Firestore collection to save to
}
