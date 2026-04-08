import { getDocsForRoute } from '@/lib/docs/mapping';

describe('docs route mapping', () => {
  it('resolves RRHH docs for current routes without the legacy dashboard prefix', () => {
    const docs = getDocsForRoute('/rrhh/departments');

    expect(docs.some(doc => doc.slug === 'rrhh/cadena-organizacional')).toBe(
      true
    );
  });

  it('resolves quality docs for renamed procesos routes', () => {
    const docs = getDocsForRoute('/procesos/objetivos');

    expect(
      docs.some(doc => doc.slug === 'procesos/indicadores-y-objetivos')
    ).toBe(true);
  });

  it('keeps contextual help available for nested CRM routes', () => {
    const docs = getDocsForRoute('/crm/clientes');

    expect(docs.some(doc => doc.slug === 'crm/vision-general')).toBe(true);
  });

  it('keeps contextual help available for mejoras dashboard routes', () => {
    const docs = getDocsForRoute('/mejoras');

    expect(docs.some(doc => doc.slug === 'hallazgos/modulo-mejoras')).toBe(
      true
    );
  });

  it('resolves declaraciones routes to their manual entry', () => {
    const docs = getDocsForRoute('/mejoras/declaraciones/nueva');

    expect(docs.some(doc => doc.slug === 'hallazgos/declaraciones')).toBe(
      true
    );
  });
});
