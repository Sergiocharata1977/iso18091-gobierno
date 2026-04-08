import { evaluateStrategyCompleteness } from '@/lib/onboarding/strategyCompleteness';

describe('strategyCompleteness', () => {
  it('returns pending checklist and missing requirements when input is empty', () => {
    const result = evaluateStrategyCompleteness({});

    expect(result.percent).toBe(0);
    expect(result.canGenerateDrafts).toBe(false);
    expect(result.items).toHaveLength(5);
    expect(result.items.every(item => item.status === 'pending')).toBe(true);
    expect(result.missingRequired).toHaveLength(12);
  });

  it('enables draft generation when all MVP sections are complete', () => {
    const result = evaluateStrategyCompleteness({
      identidad: {
        mision: 'Proveer servicios de calibracion confiables.',
        vision: 'Ser referencia regional.',
        valores: 'Integridad, servicio, mejora continua.',
        objetivos_estrategicos:
          'Reducir tiempos de entrega y elevar satisfaccion.',
      },
      alcance: {
        alcance_sgc:
          'Prestacion de servicios de calibracion para instrumentos.',
        productos_servicios:
          'Calibracion de balanzas\nCalibracion de termometros',
        ubicaciones: 'Sede principal',
      },
      contexto: {
        contexto_interno: 'Equipo tecnico especializado.',
        contexto_externo: 'Mayor exigencia regulatoria del mercado.',
        partes_interesadas: 'Clientes, entes reguladores y proveedores.',
      },
      estructura: {
        organigrama_upload_url: 'https://example.com/organigrama.png',
      },
      politicas: {
        estado: 'borrador',
        politica_calidad: 'Cumplir requisitos y mejorar continuamente el SGC.',
      },
    });

    expect(result.percent).toBe(100);
    expect(result.canGenerateDrafts).toBe(true);
    expect(result.missingRequired).toHaveLength(0);
    expect(result.items.every(item => item.status === 'complete')).toBe(true);
  });

  it('accepts ubicaciones_no_aplica but blocks historical quality policy', () => {
    const result = evaluateStrategyCompleteness({
      identidad: {
        mision: 'x',
        vision: 'x',
        valores: 'x',
        objetivos_estrategicos: 'x',
      },
      alcance: {
        alcance_sgc: 'x',
        productos_servicios: 'Servicio A',
        ubicaciones_no_aplica: true,
      },
      contexto: {
        contexto_interno: 'x',
        contexto_externo: 'x',
        partes_interesadas: 'x',
      },
      estructura: {
        descripcion_breve: 'Roles y responsables definidos.',
      },
      politicas: {
        estado: 'historico',
        politica_calidad: 'Texto historico',
      },
    });

    expect(result.canGenerateDrafts).toBe(false);
    expect(result.missingRequired).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'politicas.politica_calidad' }),
      ])
    );

    const alcance = result.items.find(item => item.key === 'alcance');
    expect(alcance?.status).toBe('complete');
  });
});
