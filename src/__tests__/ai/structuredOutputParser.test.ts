import { isoGapEvaluationSchemaV1 } from '@/ai/schemas';
import {
  parseStructuredOutput,
  parseStructuredOutputByContract,
} from '@/ai/utils/structuredOutputParser';

const validGapPayload = {
  contract_id: 'iso_gap_evaluation_v1',
  version: 'v1',
  idioma: 'es',
  nivel_madurez: 'B1',
  confianza_modelo: 0.8,
  resumen_ejecutivo:
    'El proceso tiene ejecución operativa, pero presenta brechas de control documental y seguimiento.',
  puntaje_cumplimiento: 55,
  estado_general: 'parcial',
  fortalezas: ['Compromiso del líder de proceso'],
  hallazgos: [
    {
      id: 'H-1',
      severidad: 'alta',
      clausula_iso: {
        codigo: '7.5',
        titulo: 'Información documentada',
        relevancia: 'Sustenta consistencia del proceso.',
      },
      descripcion: 'No existe método formal de control de versiones.',
      evidencia_observada: 'Se observan copias sin fecha de vigencia.',
      brecha: 'No se asegura uso de documentos vigentes.',
      riesgo_asociado: 'Errores por uso de instrucciones obsoletas.',
      accion_inmediata_sugerida:
        'Retirar copias obsoletas y publicar versión vigente.',
    },
  ],
  prioridades_90_dias: [
    {
      prioridad: 'alta',
      accion: 'Definir matriz maestra documental',
      clausula_iso: '7.5',
      responsable_sugerido: 'Coordinador de Calidad',
      plazo_dias: 30,
    },
  ],
  supuestos: [],
  advertencias: [],
};

describe('structuredOutputParser (A2)', () => {
  it('parses valid JSON output', () => {
    const result = parseStructuredOutput(
      JSON.stringify(validGapPayload),
      isoGapEvaluationSchemaV1
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.contract_id).toBe('iso_gap_evaluation_v1');
    }
  });

  it('extracts JSON from fenced markdown', () => {
    const raw = `Respuesta:\n\`\`\`json\n${JSON.stringify(validGapPayload, null, 2)}\n\`\`\``;
    const result = parseStructuredOutputByContract(
      'iso_gap_evaluation_v1',
      raw
    );

    expect(result.ok).toBe(true);
  });

  it('returns invalid_json for malformed JSON', () => {
    const result = parseStructuredOutputByContract(
      'iso_gap_evaluation_v1',
      '{"contract_id": "iso_gap_evaluation_v1",'
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_json');
    }
  });

  it('returns missing_fields when required fields are absent', () => {
    const incomplete = {
      contract_id: 'iso_gap_evaluation_v1',
      version: 'v1',
      idioma: 'es',
      nivel_madurez: 'B1',
      confianza_modelo: 0.8,
      resumen_ejecutivo: 'Texto suficientemente largo para pasar mínimo.',
    };

    const result = parseStructuredOutputByContract(
      'iso_gap_evaluation_v1',
      JSON.stringify(incomplete)
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('missing_fields');
      expect(result.missingFields).toContain('puntaje_cumplimiento');
    }
  });

  it('returns schema_validation when types are invalid but fields exist', () => {
    const wrongType = {
      ...validGapPayload,
      puntaje_cumplimiento: '55',
    };

    const result = parseStructuredOutputByContract(
      'iso_gap_evaluation_v1',
      JSON.stringify(wrongType)
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('schema_validation');
    }
  });
});
