import type { AIMaturityBand } from '@/ai/types';

export function jsonOnlyInstruction(contractId: string): string {
  return [
    `SALIDA OBLIGATORIA: JSON válido UTF-8 para el contrato "${contractId}".`,
    'No incluyas texto fuera del JSON.',
    'No uses markdown, no uses ```json, no agregues comentarios.',
    'Si faltan datos, completa con supuestos explícitos en campos de "supuestos" o "datos_faltantes" según corresponda.',
  ].join('\n');
}

export function maturityExamplesInline(
  examples: Record<AIMaturityBand, string>
): string {
  return [
    'Ejemplos de salida esperada por nivel de madurez (B1/B2/B3):',
    `- B1: ${examples.B1}`,
    `- B2: ${examples.B2}`,
    `- B3: ${examples.B3}`,
  ].join('\n');
}

export function compactList(items: string[]): string {
  return items.map(item => `- ${item}`).join('\n');
}
