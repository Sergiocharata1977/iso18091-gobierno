import { parseVoiceIntent } from '@/lib/voice/miPanelIntentParser';

describe('miPanelIntentParser', () => {
  const suggestions = [
    { id: 's1', label: 'Ver procesos' },
    { id: 's2', label: 'Ver mediciones' },
    { id: 's3', label: 'Explicarme el panel' },
  ];

  describe('select_option', () => {
    it.each([
      ['uno', 1],
      ['opcion uno', 1],
      ['opción 1', 1],
      ['primero', 1],
      ['dos', 2],
      ['segunda opcion', 2],
      ['2', 2],
      ['tres', 3],
      ['opción tres', 3],
      ['tercera', 3],
    ])('detects "%s" as option %i', (transcript, expectedIndex) => {
      const intent = parseVoiceIntent(transcript, suggestions);

      expect(intent.type).toBe('select_option');
      if (intent.type !== 'select_option') {
        throw new Error('Expected select_option');
      }

      expect(intent.optionIndex).toBe(expectedIndex);
      expect(intent.optionLabel).toBe(suggestions[expectedIndex - 1].label);
    });
  });

  describe('navigate', () => {
    it.each([
      ['ver procesos', 'procesos', '/procesos'],
      ['abrir procesos', 'procesos', '/procesos'],
      ['ir a mediciones', 'mediciones', '/procesos/mediciones'],
      ['mostrar mediciones', 'mediciones', '/procesos/mediciones'],
      ['mediciones', 'mediciones', '/procesos/mediciones'],
    ])(
      'detects "%s" as navigate %s',
      (transcript, expectedTarget, expectedPath) => {
        const intent = parseVoiceIntent(transcript, suggestions);

        expect(intent.type).toBe('navigate');
        if (intent.type !== 'navigate') {
          throw new Error('Expected navigate');
        }

        expect(intent.target).toBe(expectedTarget);
        expect(intent.path).toBe(expectedPath);
      }
    );
  });

  describe('explain', () => {
    it.each([
      'explicame',
      'explícame la opción uno',
      'quiero mas info',
      'dame detalles',
      'que significa esto',
      'ayuda',
    ])('detects "%s" as explain', transcript => {
      const intent = parseVoiceIntent(transcript, suggestions);
      expect(intent.type).toBe('explain');
    });
  });

  describe('confirm', () => {
    it.each(['si', 'sí', 'dale', 'ok', 'de acuerdo', 'listo'])(
      'detects "%s" as confirm',
      transcript => {
        const intent = parseVoiceIntent(transcript, suggestions);
        expect(intent.type).toBe('confirm');
      }
    );
  });

  describe('cancel', () => {
    it.each(['no', 'nada', 'cancelar', 'salir', 'parar', 'no gracias'])(
      'detects "%s" as cancel',
      transcript => {
        const intent = parseVoiceIntent(transcript, suggestions);
        expect(intent.type).toBe('cancel');
      }
    );

    it('does not confuse "no conformidades" with cancel', () => {
      const intent = parseVoiceIntent(
        'ver no conformidades pendientes',
        suggestions
      );
      expect(intent.type).toBe('unknown');
    });
  });

  describe('unknown', () => {
    it.each(['', '   ', 'banana', 'revisa pendientes'])(
      'returns unknown for "%s"',
      transcript => {
        const intent = parseVoiceIntent(transcript, suggestions);
        expect(intent.type).toBe('unknown');
      }
    );
  });
});
