import type { AIMaturityBand, VersionedAIPromptDefinition } from '@/ai/types';

import {
  compactList,
  jsonOnlyInstruction,
  maturityExamplesInline,
} from './_shared';

export interface IsoIndicatorAnalysisPromptInput {
  organizacion: string;
  indicador_nombre: string;
  unidad: string;
  periodo_analizado: string;
  valor_actual: number;
  meta: number;
  historial_resumido?: string[];
  contexto_operativo?: string;
  nivel_madurez_objetivo?: AIMaturityBand;
}

export const isoIndicatorAnalysisPromptV1: VersionedAIPromptDefinition<IsoIndicatorAnalysisPromptInput> =
  {
    id: 'iso_indicator_analysis_v1',
    version: 'v1',
    domain: 'iso_sgc',
    responseMode: 'json',
    objective:
      'Analizar desempeño de indicadores de calidad y producir hallazgos/recomendaciones estructuradas.',
    buildPrompt:
      input => `Rol: Analista de desempeño de indicadores del SGC con criterio ISO 9001.
Tarea: Analizar el indicador informado y producir diagnóstico accionable para responsables de proceso.

Datos del indicador:
- Organización: ${input.organizacion}
- Indicador: ${input.indicador_nombre}
- Unidad: ${input.unidad}
- Período analizado: ${input.periodo_analizado}
- Valor actual: ${input.valor_actual}
- Meta: ${input.meta}
- Contexto operativo: ${input.contexto_operativo || 'No especificado'}
- Nivel de madurez objetivo: ${input.nivel_madurez_objetivo || 'Inferir B1/B2/B3'}

Historial resumido:
${input.historial_resumido?.length ? compactList(input.historial_resumido) : '- No informado'}

Instrucciones:
- Determina tendencia (mejora/estable/deterioro/sin_datos) y estado respecto a meta.
- Identifica causas probables con evidencia explícita o supuestos transparentes.
- Prioriza recomendaciones por impacto/plazo.
- No mezcles respuestas conversacionales.
- Mantén enfoque ISO/SGC y toma de decisiones.

Contrato esperado:
- contract_id = "iso_indicator_analysis_v1"
- version = "v1"
- indicador { valor_actual, meta, tendencia, estado_meta, desviaciones }
- causas_probables[] y recomendaciones[] obligatorias
- usa "datos_faltantes" cuando la información no alcance para una conclusión robusta

${maturityExamplesInline({
  B1: 'lectura simple de desvío vs meta y 1-2 acciones operativas inmediatas.',
  B2: 'análisis con tendencias, causas probables y alertas de control.',
  B3: 'análisis avanzado con sensibilidad al dato, consistencia y priorización multiimpacto.',
})}

${jsonOnlyInstruction('iso_indicator_analysis_v1')}`,
  };
