/**
 * Tipos para el Sistema de Sagas (Orquestacion Multi-Agente)
 *
 * Una Saga es una secuencia de pasos (AgentJobs) coordinados para lograr una meta compleja.
 */

import { Timestamp } from 'firebase/firestore';

export type SagaStatus =
  | 'planning' // El agente esta decidiendo los pasos
  | 'running' // Ejecutando pasos
  | 'paused' // Esperando input externo o aprobacion
  | 'completed' // Exito total
  | 'failed' // Fallo irrecuperable
  | 'cancelled';

export interface SagaStep {
  id: string; // ID unico del paso dentro de la saga
  intent: string; // Que debe hacer este paso (ej: "doc.review")
  compensate_intent?: string; // Intent opcional para compensacion manual por paso
  payload: any; // Datos para el job

  // Dependencias
  depends_on?: string[]; // IDs de pasos que deben terminar antes

  // Estado del paso
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  job_id?: string; // ID del AgentJob asociado
  result?: any;
  error?: string;

  // Metadata
  assigned_agent_id?: string; // Si se fuerza un agente especifico
  description?: string; // Explicacion humana de que hace este paso
}

export interface SagaRun {
  id: string;
  organization_id: string;
  user_id: string; // Quien pidio la saga

  goal: string; // Meta en lenguaje natural ("Preparar auditoria...")

  // Estado
  status: SagaStatus;
  current_step_index: number;

  // Plan de ejecucion
  steps: SagaStep[];

  // Memoria compartida (Contexto)
  context: Record<string, any>; // Resultados acumulados de pasos anteriores

  // Trazabilidad
  created_at: Date | Timestamp;
  updated_at: Date | Timestamp;
  completed_at?: Date | Timestamp;

  // Errores globales
  error?: {
    code: string;
    message: string;
    failed_step_id?: string;
    compensation?: {
      policy: 'none' | 'manual_per_step';
      reason: 'late_step_failure' | 'no_compensation_needed';
      pending_steps: Array<{
        step_id: string;
        compensate_intent: string;
      }>;
    };
  };
}

export interface CreateSagaRequest {
  organization_id: string;
  user_id: string;
  goal: string;
  initial_context?: Record<string, any>;
}
