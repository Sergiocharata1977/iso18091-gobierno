/**
 * Types for Process AI Suggestions System
 * Sistema de sugerencias IA para procesos ISO 9001
 */

import { ProcessCategoryId } from './processRecords';

// Contexto opcional para mejorar las sugerencias
export interface ProcessAIContext {
  rubro?: string; // Ej: "Agroindustria", "Tecnología"
  tamanioEmpresa?: string; // Ej: "PYME", "Grande"
  normaCriterios?: string; // Ej: "ISO 9001:2015", "ISO 14001"
  softwareUsado?: string; // Ej: "SAP", "Odoo"
  problemasActuales?: string; // Descripción de problemas
}

// Request para el endpoint de sugerencias
export interface ProcessAISuggestionRequest {
  mode: 'name' | 'full' | 'section';
  processName?: string;
  category?: ProcessCategoryId;
  existingFields?: {
    descripcion?: string;
    objetivo?: string;
    alcance?: string;
    funciones_involucradas?: string[];
  };
  context?: ProcessAIContext;
  section?:
    | 'descripcion'
    | 'objetivo'
    | 'alcance'
    | 'funciones'
    | 'entradas_salidas';
}

// Opción de nombre sugerido
export interface NameSuggestion {
  title: string;
  reason: string;
}

// Respuesta del endpoint de sugerencias
export interface ProcessAISuggestionResponse {
  success: boolean;
  suggestions: {
    // Modo "name"
    nameOptions?: NameSuggestion[];

    // Modo "full" o "section"
    descripcion?: string;
    objetivo?: string;
    alcance?: string;
    entradas?: string[];
    salidas?: string[];
    funciones?: string[];
    registros?: string[];
    riesgos?: string[];
    indicadores?: string[];
  };
  error?: string;
}

// Log de sugerencia aplicada (para trazabilidad ISO)
export interface ProcessAISuggestionLog {
  id: string;
  processId?: string;
  organizationId: string;
  userId: string;
  mode: 'name' | 'full' | 'section';
  inputContext: ProcessAIContext;
  outputHash: string; // Hash del contenido para auditoría
  camposAplicados: string[]; // Lista de campos donde se aplicó
  timestamp: Date;
}
