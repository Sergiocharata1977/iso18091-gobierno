import {
  buildVoiceSuggestions,
  inferVoiceRoleLevel,
  type MiPanelVoiceDashboardData,
} from '@/lib/voice/miPanelVoicePlanner';

describe('miPanelVoicePlanner', () => {
  it('prioritizes onboarding suggestions when there is no puesto and no process assigned', () => {
    const data: MiPanelVoiceDashboardData = {
      procesosAsignados: 0,
      registrosVencidos: 0,
      medicionesPendientes: 0,
      accionesAbiertas: 0,
      eventosProximos: 0,
    };

    const suggestions = buildVoiceSuggestions(data, false);
    expect(suggestions.map(s => s.id)).toEqual([
      'solicitar-puesto',
      'solicitar-proceso',
    ]);
  });

  it('prioritizes overdue records first and returns max 3 suggestions', () => {
    const data: MiPanelVoiceDashboardData = {
      procesosAsignados: 3,
      puesto: 'Analista de Calidad',
      registrosVencidos: 2,
      medicionesPendientes: 5,
      accionesAbiertas: 8,
      eventosProximos: 3,
    };

    const suggestions = buildVoiceSuggestions(data, false);

    expect(suggestions).toHaveLength(3);
    expect(suggestions.map(s => s.id)).toEqual([
      'registros-vencidos',
      'mediciones-pendientes',
      'acciones-abiertas',
    ]);
    expect(suggestions[0]?.titulo).toMatch(/vencidos/i);
  });

  it('includes events when there are no critical pending items', () => {
    const data: MiPanelVoiceDashboardData = {
      procesosAsignados: 2,
      puesto: 'Supervisor de Calidad',
      registrosVencidos: 0,
      medicionesPendientes: 0,
      accionesAbiertas: 0,
      eventosProximos: 2,
    };

    const suggestions = buildVoiceSuggestions(data, false);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.id).toBe('eventos-proximos');
    expect(suggestions[0]?.route).toBe('/calendario');
  });

  it('supports supervisor mode with navigate-only actions', () => {
    const data: MiPanelVoiceDashboardData = {
      procesosAsignados: 1,
      puesto: 'Gerente Comercial',
      tareasVencidas: 4,
      medicionesPendientes: 1,
      accionesAbiertas: 1,
      eventosProximos: 1,
    };

    const suggestions = buildVoiceSuggestions(data, true);

    expect(suggestions).toHaveLength(3);
    expect(suggestions.every(s => s.actionType === 'navigate')).toBe(true);
    expect(suggestions[0]?.id).toBe('registros-vencidos');
  });

  it('infers simple role levels from puesto', () => {
    expect(inferVoiceRoleLevel({ puesto: 'Gerente Comercial' })).toBe(
      'gerencial'
    );
    expect(inferVoiceRoleLevel({ puesto: 'Supervisor de Calidad' })).toBe(
      'supervision'
    );
    expect(inferVoiceRoleLevel({ puesto: 'Operario de Produccion' })).toBe(
      'operativo'
    );
    expect(inferVoiceRoleLevel({})).toBe('sin_puesto');
  });
});
