import type { AIMaturityBand, VersionedAIPromptDefinition } from '@/ai/types';

import {
  compactList,
  jsonOnlyInstruction,
  maturityExamplesInline,
} from './_shared';

export interface IsoActionRecommendationPromptInput {
  organizacion: string;
  origen: 'no_conformidad' | 'auditoria' | 'riesgo' | 'indicador' | 'mejora';
  contexto_resumen: string;
  problema_o_oportunidad: string;
  restricciones?: string[];
  clausulas_referenciales?: string[];
  nivel_madurez_objetivo?: AIMaturityBand;
}

export const isoActionRecommendationPromptV1: VersionedAIPromptDefinition<IsoActionRecommendationPromptInput> =
  {
    id: 'iso_action_recommendation_v1',
    version: 'v1',
    domain: 'iso_sgc',
    responseMode: 'json',
    objective:
      'Generar cartera priorizada de acciones correctivas/preventivas/mejora con criterios verificables.',
    buildPrompt:
      input => `Rol: Consultor ISO 9001 orientado a implementación y cierre efectivo de brechas.
Tarea: Proponer acciones recomendadas verificables para el contexto informado.

Contexto:
- Organización: ${input.organizacion}
- Origen: ${input.origen}
- Resumen de contexto: ${input.contexto_resumen}
- Problema/Oportunidad: ${input.problema_o_oportunidad}
- Nivel de madurez objetivo: ${input.nivel_madurez_objetivo || 'Inferir B1/B2/B3'}

Restricciones:
${input.restricciones?.length ? compactList(input.restricciones) : '- Sin restricciones informadas'}

Cláusulas referenciales:
${input.clausulas_referenciales?.length ? compactList(input.clausulas_referenciales) : '- No informadas (inferir si aplica)'}

Instrucciones:
- Recomienda acciones específicas, no genéricas.
- Incluye tipo de acción (corrección/correctiva/preventiva/mejora).
- Define prioridad, impacto, esfuerzo, responsable por rol y criterio de verificación.
- Incluye quick wins y secuencia de implementación.
- Evita tono conversacional; responde como entrega técnica.

Contrato esperado:
- contract_id = "iso_action_recommendation_v1"
- version = "v1"
- origen conforme al contexto
- acciones_recomendadas[] con clausulas_iso_relacionadas[] y criterio_verificacion
- quick_wins[] referenciando acciones de alto valor / baja complejidad

${maturityExamplesInline({
  B1: 'acciones simples de contención y estandarización básica.',
  B2: 'plan balanceado con responsables, plazos y seguimiento KPI.',
  B3: 'portafolio de acciones con dependencias, verificación y riesgos de implementación.',
})}

${jsonOnlyInstruction('iso_action_recommendation_v1')}`,
  };
