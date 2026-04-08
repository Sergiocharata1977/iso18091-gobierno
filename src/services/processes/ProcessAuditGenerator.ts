import {
  AuditChecklist,
  AuditQuestion,
  ProcessDefinition,
} from '@/types/processes-unified';
import { Timestamp } from 'firebase-admin/firestore';

export class ProcessAuditGenerator {
  /**
   * Genera un checklist de auditoría inicial basado en la estructura SIPOC/PHVA.
   * Por ahora es determinístico (reglas), luego se enriquecerá con IA.
   */
  static generateChecklist(process: ProcessDefinition): AuditChecklist {
    const questions: AuditQuestion[] = [];

    // 1. Preguntas generales del proceso (PHVA - Planificar)
    questions.push({
      id: `q_${Date.now()}_obj`,
      text: `¿El objetivo del proceso "${process.nombre || 'Sin nombre'}" es conocido y entendido por el personal responsable?`,
      type: 'boolean',
      required_evidence: false,
      linked_norm_point: '5.2.2', // Comunicación de la política/objetivos (aprox)
    });

    // 2. Preguntas basadas en Actividades (PHVA - Hacer)
    if (process.sipoc?.activities) {
      process.sipoc.activities.forEach((activity, index) => {
        // Pregunta de ejecución
        questions.push({
          id: `q_${Date.now()}_act_${index}_exec`,
          text: `¿Se ejecuta la actividad "${activity.name}" según lo descrito?`,
          type: 'boolean',
          required_evidence: true,
          linked_activity_id: activity.id,
          linked_norm_point: '8.5.1', // Control de la producción/servicio
        });

        // Pregunta de responsabilidad (si aplica)
        if (activity.responsible_position_id) {
          questions.push({
            id: `q_${Date.now()}_act_${index}_resp`,
            text: `¿El responsable de "${activity.name}" cuenta con la competencia necesaria?`,
            type: 'boolean',
            required_evidence: false,
            linked_activity_id: activity.id,
            linked_norm_point: '7.2',
          });
        }
      });
    }

    // 3. Preguntas basadas en Controles (PHVA - Verificar)
    if (process.sipoc?.controls) {
      process.sipoc.controls.forEach((control, index) => {
        questions.push({
          id: `q_${Date.now()}_ctrl_${index}`,
          text: `¿Se evidencia la ejecución del control "${control.description}" con frecuencia ${control.frequency}?`,
          type: 'evidence_upload',
          required_evidence: true,
          linked_control_id: control.id,
          linked_norm_point: '9.1.1', // Seguimiento y medición
        });
      });
    }

    // 4. Preguntas de Salidas/Cliente (PHVA - Actuar/Satisfacción)
    if (process.sipoc?.outputs) {
      process.sipoc.outputs.forEach((output, index) => {
        questions.push({
          id: `q_${Date.now()}_out_${index}`,
          text: `¿La salida "${output.description}" cumple con los requisitos del cliente ${output.customer}?`,
          type: 'boolean',
          required_evidence: false,
          linked_norm_point: '8.2.1', // Requisitos del cliente
        });
      });
    }

    return {
      id: `audit_${Date.now()}_${process.id}`,
      process_id: process.id,
      generated_at: Timestamp.now().toDate(),
      title: `Auditoría Generada: ${process.nombre}`,
      questions,
      is_ai_generated: false, // Por ahora es determinístico
      status: 'draft',
    };
  }

  /**
   * (Placeholder) En el futuro, esto llamará a la API de OpenAI para generar preguntas más contextuales.
   */
  static async enrichChecklistWithAI(
    checklist: AuditChecklist
  ): Promise<AuditChecklist> {
    // Implementar en Fase 6.2 si se requiere
    return { ...checklist, is_ai_generated: true };
  }
}
