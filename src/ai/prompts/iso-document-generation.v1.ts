import type { AIMaturityBand, VersionedAIPromptDefinition } from '@/ai/types';

import {
  compactList,
  jsonOnlyInstruction,
  maturityExamplesInline,
} from './_shared';

export interface IsoDocumentGenerationPromptInput {
  organizacion: string;
  tipo_documento:
    | 'politica'
    | 'procedimiento'
    | 'instructivo'
    | 'formato'
    | 'manual'
    | 'plan'
    | 'registro';
  tema: string;
  objetivo_documento: string;
  audiencia: string;
  clausulas_iso_relacionadas?: string[];
  datos_disponibles?: string[];
  nivel_madurez_objetivo?: AIMaturityBand;
}

export const isoDocumentGenerationPromptV1: VersionedAIPromptDefinition<IsoDocumentGenerationPromptInput> =
  {
    id: 'iso_document_generation_v1',
    version: 'v1',
    domain: 'iso_sgc',
    responseMode: 'json',
    objective:
      'Diseñar la estructura de un documento ISO/SGC con insumos requeridos y criterios de calidad antes de generar texto final.',
    buildPrompt:
      input => `Rol: Arquitecto documental del SGC experto en ISO 9001:2015.
Tarea: Diseñar una estructura de documento reutilizable (outline + requisitos) para posterior generación de texto final.

Contexto documental:
- Organización: ${input.organizacion}
- Tipo de documento: ${input.tipo_documento}
- Tema: ${input.tema}
- Objetivo del documento: ${input.objetivo_documento}
- Audiencia: ${input.audiencia}
- Nivel de madurez objetivo: ${input.nivel_madurez_objetivo || 'Inferir B1/B2/B3'}

Cláusulas ISO relacionadas:
${input.clausulas_iso_relacionadas?.length ? compactList(input.clausulas_iso_relacionadas) : '- A definir por el analista'}

Datos ya disponibles:
${input.datos_disponibles?.length ? compactList(input.datos_disponibles) : '- No informados'}

Instrucciones:
- NO redactes el documento final completo.
- Entrega una estructura JSON para orquestar generación posterior de texto.
- Define secciones, puntos clave, evidencia sugerida y requisitos de entrada faltantes.
- Mantén lenguaje profesional ISO/SGC.
- Señala la modalidad recomendada de salida final (texto_documento / mixto / json_estructura).

Contrato esperado:
- contract_id = "iso_document_generation_v1"
- version = "v1"
- estructura[] con orden, objetivo de sección, puntos clave y longitud sugerida
- requisitos_entrada[] para completar información antes de redactar

${maturityExamplesInline({
  B1: 'estructura simple con secciones mínimas obligatorias y requisitos básicos.',
  B2: 'estructura operativa con evidencias sugeridas y controles documentales.',
  B3: 'estructura avanzada con criterios de calidad, trazabilidad y guía de redacción.',
})}

${jsonOnlyInstruction('iso_document_generation_v1')}`,
  };
