import type { AIMaturityBand, VersionedAIPromptDefinition } from '@/ai/types';

import {
  compactList,
  jsonOnlyInstruction,
  maturityExamplesInline,
} from './_shared';

export interface IsoGapEvaluationPromptInput {
  organizacion: string;
  proceso_o_area: string;
  alcance_evaluacion: string;
  evidencias_disponibles: string[];
  hallazgos_previos?: string[];
  nivel_madurez_objetivo?: AIMaturityBand;
}

export const isoGapEvaluationPromptV1: VersionedAIPromptDefinition<IsoGapEvaluationPromptInput> =
  {
    id: 'iso_gap_evaluation_v1',
    version: 'v1',
    domain: 'iso_sgc',
    responseMode: 'json',
    objective:
      'Evaluar brechas de cumplimiento ISO 9001 y priorizar acciones de 90 días con salida estructurada.',
    buildPrompt: input => {
      const hallazgosPrevios =
        input.hallazgos_previos && input.hallazgos_previos.length > 0
          ? compactList(input.hallazgos_previos)
          : '- Sin hallazgos previos informados';

      return `Rol: Analista senior ISO 9001:2015 especializado en diagnósticos de brechas del SGC.
Tarea: Evaluar cumplimiento y brechas del proceso/área indicado con enfoque práctico para implementación.

Contexto:
- Organización: ${input.organizacion}
- Proceso/Área: ${input.proceso_o_area}
- Alcance de evaluación: ${input.alcance_evaluacion}
- Nivel de madurez objetivo (si aplica): ${input.nivel_madurez_objetivo || 'No especificado (inferir B1/B2/B3)'}

Evidencias disponibles:
${compactList(input.evidencias_disponibles)}

Hallazgos previos:
${hallazgosPrevios}

Instrucciones de análisis:
- Evalúa contra ISO 9001:2015 con foco en cumplimiento, riesgo y priorización.
- Diferencia evidencia observada vs inferencia.
- Usa español profesional orientado a SGC.
- No respondas de forma conversacional.
- Incluye al menos 1 fortaleza real y 1 hallazgo con cláusula ISO.

Contrato esperado:
- contract_id = "iso_gap_evaluation_v1"
- version = "v1"
- idioma = "es"
- nivel_madurez = B1 | B2 | B3
- puntaje_cumplimiento entre 0 y 100
- hallazgos[] con clausula_iso {codigo, titulo, relevancia}
- prioridades_90_dias[] con plazo_dias <= 90

${maturityExamplesInline({
  B1: 'diagnóstico básico, brechas evidentes, acciones simples de formalización documental.',
  B2: 'evaluación intermedia, análisis de consistencia operativa y control de seguimiento.',
  B3: 'evaluación avanzada, enfoque en eficacia, evidencia objetiva y mejora sistémica.',
})}

${jsonOnlyInstruction('iso_gap_evaluation_v1')}`;
    },
  };
