import {
  ProactiveHintsService,
  type OperationalSnapshot,
} from '@/features/chat/services/ProactiveHintsService';

function createSnapshot(
  overrides: Partial<OperationalSnapshot> = {}
): OperationalSnapshot {
  return {
    hallazgosAbiertos: 0,
    accionesPendientes: 0,
    accionesVencidas: 0,
    auditoriasPlaneadas: 0,
    capacitacionesPendientes: 0,
    directActionsPendientes: 0,
    diasSinAnalisisEstrategico: 0,
    faseActual: 3,
    porcentajeFaseActual: 0,
    nombreOrg: 'Org Test',
    nombreUsuario: 'Usuario Test',
    ...overrides,
  };
}

describe('ProactiveHintsService.getSuggestionsByOperationalSnapshot', () => {
  it('accionesVencidas: 3 -> primera sugerencia es alerta prioridad alta', () => {
    const suggestions = ProactiveHintsService.getSuggestionsByOperationalSnapshot(
      createSnapshot({ accionesVencidas: 3 })
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        id: 'overdue-actions-blocker',
        tipo: 'alerta',
        prioridad: 'alta',
      })
    );
  });

  it('directActionsPendientes: 2 -> sugerencia antes de recordatorios', () => {
    const suggestions = ProactiveHintsService.getSuggestionsByOperationalSnapshot(
      createSnapshot({
        directActionsPendientes: 2,
        diasSinAnalisisEstrategico: 45,
      })
    );

    const pendingDecisionIndex = suggestions.findIndex(
      suggestion => suggestion.id === 'pending-agentic-decisions'
    );
    const reminderIndex = suggestions.findIndex(
      suggestion => suggestion.id === 'stale-strategic-analysis'
    );

    expect(pendingDecisionIndex).toBeGreaterThanOrEqual(0);
    expect(reminderIndex).toBeGreaterThanOrEqual(0);
    expect(pendingDecisionIndex).toBeLessThan(reminderIndex);
  });

  it('diasSinAnalisisEstrategico: 45 -> retorna recordatorio de analisis', () => {
    const suggestions = ProactiveHintsService.getSuggestionsByOperationalSnapshot(
      createSnapshot({ diasSinAnalisisEstrategico: 45 })
    );

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'stale-strategic-analysis',
          tipo: 'recordatorio',
        }),
      ])
    );
  });

  it('snapshot con todo en 0 retorna al menos el siguiente paso del journey', () => {
    const suggestions = ProactiveHintsService.getSuggestionsByOperationalSnapshot(
      createSnapshot({
        faseActual: 3,
        porcentajeFaseActual: 0,
        diasSinAnalisisEstrategico: 0,
      })
    );

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: 'siguiente_paso',
        }),
      ])
    );
  });
});
