/**
 * Types for Survey Module
 * Customer Satisfaction Surveys with multiple question types
 */

export type SurveyType =
  | 'anual'
  | 'post_entrega'
  | 'post_servicio'
  | 'post_compra'
  | 'ciudadana';
export type SurveyStatus = 'draft' | 'active' | 'completed';
export type SurveyTrigger = 'manual' | 'post_compra' | 'post_servicio';
export type SurveyAudience = 'cliente' | 'ciudadania';
export type SurveyChannel = 'interno' | 'publico';

// Question types
export type QuestionType = 'scale' | 'yes_no' | 'text' | 'multiple_choice';

export interface BaseQuestion {
  id: string;
  question: string;
  type: QuestionType;
  order: number;
  required: boolean;
}

export interface ScaleQuestion extends BaseQuestion {
  type: 'scale';
  minValue: number;
  maxValue: number;
  minLabel?: string; // e.g., "Muy insatisfecho"
  maxLabel?: string; // e.g., "Muy satisfecho"
}

export interface YesNoQuestion extends BaseQuestion {
  type: 'yes_no';
}

export interface TextQuestion extends BaseQuestion {
  type: 'text';
  multiline: boolean;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: string[];
  allowMultiple: boolean; // true = checkbox, false = radio
}

export type SurveyQuestion =
  | ScaleQuestion
  | YesNoQuestion
  | TextQuestion
  | MultipleChoiceQuestion;

// Response types for each question type
export interface ScaleResponse {
  questionId: string;
  type: 'scale';
  value: number;
}

export interface YesNoResponse {
  questionId: string;
  type: 'yes_no';
  value: boolean;
}

export interface TextResponse {
  questionId: string;
  type: 'text';
  value: string;
}

export interface MultipleChoiceResponse {
  questionId: string;
  type: 'multiple_choice';
  value: string | string[]; // single or multiple selections
}

export type QuestionResponse =
  | ScaleResponse
  | YesNoResponse
  | TextResponse
  | MultipleChoiceResponse;

export interface SurveyResponseData {
  id: string;
  surveyId: string;
  organization_id?: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  crm_cliente_id?: string | null;
  crm_contacto_id?: string | null;
  responses: QuestionResponse[];
  comments?: string;
  externalToken?: string;
  responseChannel?: 'internal' | 'external_token' | 'public_portal';
  npsScore?: number;
  createdAt: Date;
}

export interface Survey {
  id: string;
  organization_id?: string;
  surveyNumber: string;
  title: string;
  type: SurveyType;
  audience: SurveyAudience;
  channel: SurveyChannel;
  status: SurveyStatus;
  trigger: SurveyTrigger;

  // Fixed questions (cannot be edited for now)
  questions: SurveyQuestion[];

  // Responses
  responseCount: number;
  averageRating?: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string;
  externalToken?: string;
  crm_cliente_id?: string | null;
  crm_contacto_id?: string | null;
  targetClientName?: string | null;
  targetClientEmail?: string | null;

  // For post-delivery surveys
  relatedOrderId?: string;
  relatedOrderNumber?: string;
  relatedServiceId?: string;
  respondedAt?: Date;

  // Findings generated from this survey
  findingIds?: string[];
}

export interface SurveyFormData {
  title: string;
  type: SurveyType;
  trigger?: SurveyTrigger;
  audience?: SurveyAudience;
  channel?: SurveyChannel;
  organization_id?: string;
  crm_cliente_id?: string | null;
  crm_contacto_id?: string | null;
  targetClientName?: string | null;
  targetClientEmail?: string | null;
  relatedOrderId?: string;
  relatedOrderNumber?: string;
  relatedServiceId?: string;
}

export interface SurveyResponseFormData {
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  crm_cliente_id?: string | null;
  crm_contacto_id?: string | null;
  responses: QuestionResponse[];
  comments?: string;
  externalToken?: string;
  npsScore?: number;
}

export function getSurveyAudience(type: SurveyType): SurveyAudience {
  return type === 'ciudadana' ? 'ciudadania' : 'cliente';
}

export function getSurveyChannel(type: SurveyType): SurveyChannel {
  return type === 'ciudadana' ? 'publico' : 'interno';
}

export function requiresNpsScore(type: SurveyType): boolean {
  return type !== 'ciudadana';
}

// Fixed questions for customer satisfaction surveys
export const CUSTOMER_SATISFACTION_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'q1',
    type: 'scale',
    question:
      '¿Qué tan satisfecho está con la calidad de nuestros productos/servicios?',
    order: 1,
    required: true,
    minValue: 1,
    maxValue: 5,
    minLabel: 'Muy insatisfecho',
    maxLabel: 'Muy satisfecho',
  } as ScaleQuestion,
  {
    id: 'q2',
    type: 'scale',
    question: '¿Cómo califica el tiempo de entrega?',
    order: 2,
    required: true,
    minValue: 1,
    maxValue: 5,
    minLabel: 'Muy lento',
    maxLabel: 'Muy rápido',
  } as ScaleQuestion,
  {
    id: 'q3',
    type: 'multiple_choice',
    question: '¿Qué aspectos de nuestro servicio considera más importantes?',
    order: 3,
    required: true,
    options: [
      'Calidad del producto',
      'Precio competitivo',
      'Tiempo de entrega',
      'Atención al cliente',
      'Garantía y soporte',
    ],
    allowMultiple: true,
  } as MultipleChoiceQuestion,
  {
    id: 'q4',
    type: 'yes_no',
    question: '¿Recomendaría nuestros productos/servicios a otros?',
    order: 4,
    required: true,
  } as YesNoQuestion,
  {
    id: 'q5',
    type: 'scale',
    question: '¿Qué tan satisfecho está con la atención al cliente?',
    order: 5,
    required: true,
    minValue: 1,
    maxValue: 5,
    minLabel: 'Muy insatisfecho',
    maxLabel: 'Muy satisfecho',
  } as ScaleQuestion,
  {
    id: 'q6',
    type: 'text',
    question: '¿Qué podríamos mejorar en nuestros productos o servicios?',
    order: 6,
    required: false,
    multiline: true,
  } as TextQuestion,
  {
    id: 'q7',
    type: 'multiple_choice',
    question: '¿Cómo conoció nuestros productos/servicios?',
    order: 7,
    required: false,
    options: [
      'Recomendación de conocido',
      'Búsqueda en internet',
      'Redes sociales',
      'Publicidad',
      'Otro',
    ],
    allowMultiple: false,
  } as MultipleChoiceQuestion,
];

export const CITIZEN_PARTICIPATION_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'c1',
    type: 'scale',
    question: '¿Cómo evaluás la calidad general del servicio o iniciativa?',
    order: 1,
    required: true,
    minValue: 1,
    maxValue: 5,
    minLabel: 'Muy baja',
    maxLabel: 'Muy alta',
  } as ScaleQuestion,
  {
    id: 'c2',
    type: 'multiple_choice',
    question: '¿Sobre qué tema querés participar hoy?',
    order: 2,
    required: true,
    options: [
      'Satisfacción con servicios',
      'Consulta pública',
      'Presupuesto participativo',
      'Obras y espacio público',
      'Atención ciudadana',
    ],
    allowMultiple: false,
  } as MultipleChoiceQuestion,
  {
    id: 'c3',
    type: 'yes_no',
    question: '¿Sentís que el municipio escucha y considera la opinión ciudadana?',
    order: 3,
    required: true,
  } as YesNoQuestion,
  {
    id: 'c4',
    type: 'text',
    question: '¿Qué propuesta o mejora te gustaría priorizar?',
    order: 4,
    required: true,
    multiline: true,
  } as TextQuestion,
  {
    id: 'c5',
    type: 'multiple_choice',
    question: '¿Qué canal preferís para futuras consultas o convocatorias?',
    order: 5,
    required: false,
    options: ['Web municipal', 'WhatsApp', 'Email', 'Redes sociales', 'Presencial'],
    allowMultiple: false,
  } as MultipleChoiceQuestion,
];

// Labels and configurations
export const SURVEY_TYPE_LABELS: Record<SurveyType, string> = {
  anual: 'Encuesta Anual',
  post_entrega: 'Post-Entrega',
  post_servicio: 'Post-Servicio',
  post_compra: 'Post-Compra',
  ciudadana: 'Participación Ciudadana',
};

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: 'Borrador',
  active: 'Activa',
  completed: 'Completada',
};

export const SURVEY_STATUS_COLORS: Record<SurveyStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  scale: 'Escala',
  yes_no: 'Sí/No',
  text: 'Texto',
  multiple_choice: 'Opción Múltiple',
};

