// Types for Conversational Forms

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'select'
  | 'number'
  | 'boolean'
  | 'file';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  description?: string;
  options?: string[]; // For select type
  validationRegex?: string;
  placeholder?: string;
}

export interface ConversationalFormDefinition {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  systemPrompt: string; // Prompt to guide the AI in collecting this info
  collectionName: string; // Firestore collection to save to
}

export interface FormSessionState {
  formId: string;
  formType: string; // Type of form (e.g., 'no-conformidad', 'auditoria')
  currentFieldId: string | null; // The field currently being asked about
  collectedData: Record<string, any>;
  isComplete: boolean;
  step: number;
  totalSteps: number;
}
