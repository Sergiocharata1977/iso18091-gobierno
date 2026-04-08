import {
  canExecuteAction,
  isSupervisorMode,
  requiresConfirmation,
} from '@/lib/voice/miPanelVoiceGuards';

describe('miPanelVoiceGuards', () => {
  describe('isSupervisorMode', () => {
    it('detects supervisor mode from window.location.search', () => {
      window.history.pushState({}, '', '/mi-panel?modo=supervisor');

      expect(isSupervisorMode()).toBe(true);
    });

    it('returns false when modo is not supervisor', () => {
      window.history.pushState({}, '', '/mi-panel?modo=operativo');

      expect(isSupervisorMode()).toBe(false);
    });

    it('accepts a custom search source and normalizes casing', () => {
      expect(isSupervisorMode('?modo=Supervisor')).toBe(true);
      expect(isSupervisorMode(new URLSearchParams('modo=SUPERVISOR'))).toBe(
        true
      );
      expect(isSupervisorMode({ search: '?foo=1&modo=consulta' })).toBe(false);
    });
  });

  describe('canExecuteAction', () => {
    it('allows create/update when supervisor mode is disabled', () => {
      expect(canExecuteAction('task.create', false)).toEqual({ allowed: true });
      expect(canExecuteAction('task.update', false)).toEqual({ allowed: true });
    });

    it('blocks create and update actions in supervisor mode', () => {
      expect(canExecuteAction('task.create', true)).toEqual({
        allowed: false,
        message: 'Modo supervisor: acciones create/update bloqueadas.',
      });

      expect(canExecuteAction({ intent: 'crm.customer.update' }, true)).toEqual(
        {
          allowed: false,
          message: 'Modo supervisor: acciones create/update bloqueadas.',
        }
      );
    });

    it('allows non-mutating actions in supervisor mode', () => {
      expect(canExecuteAction('task.read', true)).toEqual({ allowed: true });
      expect(canExecuteAction({ action: 'iso.consultation' }, true)).toEqual({
        allowed: true,
      });
    });
  });

  describe('requiresConfirmation', () => {
    it('forces confirmation for mutating actions', () => {
      expect(requiresConfirmation('task.create')).toBe(true);
      expect(requiresConfirmation({ intent: 'task.delete' })).toBe(true);
      expect(requiresConfirmation({ action: 'task.assign' })).toBe(true);
    });

    it('returns false for non-mutating suggestions', () => {
      expect(requiresConfirmation('iso.consultation')).toBe(false);
      expect(requiresConfirmation({ type: 'query' })).toBe(false);
    });

    it('respects explicit mutating flags and still forces mutating intents', () => {
      expect(
        requiresConfirmation({ mutates: true, intent: 'custom.action' })
      ).toBe(true);
      expect(
        requiresConfirmation({
          requiresConfirmation: false,
          intent: 'crm.record.update',
        })
      ).toBe(true);
      expect(
        requiresConfirmation({ requiresConfirmation: true, intent: 'query' })
      ).toBe(true);
    });
  });
});
