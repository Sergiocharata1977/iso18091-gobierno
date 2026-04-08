import { isoContractsDocumentation } from '@/ai/contracts';
import { aiStructuredOutputSchemas } from '@/ai/schemas';

describe('AI structured output schemas (A2)', () => {
  it('validates B1/B2/B3 examples for every contract', () => {
    for (const contract of isoContractsDocumentation) {
      const schema = aiStructuredOutputSchemas[contract.id];

      (['B1', 'B2', 'B3'] as const).forEach(level => {
        const example = contract.examplesByMaturity[level];
        const result = schema.safeParse(example);

        if (!result.success) {
          throw new Error(
            `Schema failed for ${contract.id} ${level}: ${JSON.stringify(result.error.issues)}`
          );
        }
      });
    }
  });

  it('rejects an invalid gap evaluation payload with missing required fields', () => {
    const schema = aiStructuredOutputSchemas.iso_gap_evaluation_v1;
    const invalid = {
      contract_id: 'iso_gap_evaluation_v1',
      version: 'v1',
      idioma: 'es',
      nivel_madurez: 'B1',
      confianza_modelo: 0.5,
      resumen_ejecutivo: 'Resumen corto de prueba para validar esquema.',
    };

    const result = schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
