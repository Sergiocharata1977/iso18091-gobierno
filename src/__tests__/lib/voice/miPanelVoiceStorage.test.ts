import {
  getGreetingMessage,
  markGreetingDone,
  shouldGreetToday,
} from '@/lib/voice/miPanelVoiceStorage';

describe('miPanelVoiceStorage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('shouldGreetToday / markGreetingDone', () => {
    it('returns true when there is no greeting stored for today', () => {
      jest.setSystemTime(new Date('2026-02-23T09:00:00'));

      expect(shouldGreetToday()).toBe(true);
    });

    it('returns false after marking greeting as done on the same day', () => {
      jest.setSystemTime(new Date('2026-02-23T09:00:00'));

      markGreetingDone();

      expect(localStorage.getItem('miPanelVoiceLastGreeting')).toBe(
        '2026-02-23'
      );
      expect(shouldGreetToday()).toBe(false);
    });

    it('returns true again on the next day', () => {
      jest.setSystemTime(new Date('2026-02-23T22:30:00'));
      markGreetingDone();
      expect(shouldGreetToday()).toBe(false);

      jest.setSystemTime(new Date('2026-02-24T08:00:00'));

      expect(shouldGreetToday()).toBe(true);
    });
  });

  describe('getGreetingMessage', () => {
    it('returns morning greeting between 05:00 and 11:59', () => {
      jest.setSystemTime(new Date('2026-02-23T05:00:00'));

      expect(getGreetingMessage('Ana')).toBe('Buenos dias, Ana');
    });

    it('returns afternoon greeting between 12:00 and 19:59', () => {
      jest.setSystemTime(new Date('2026-02-23T12:00:00'));

      expect(getGreetingMessage('Ana')).toBe('Buenas tardes, Ana');
    });

    it('returns night greeting between 20:00 and 04:59', () => {
      jest.setSystemTime(new Date('2026-02-23T20:00:00'));
      expect(getGreetingMessage('Ana')).toBe('Buenas noches, Ana');

      jest.setSystemTime(new Date('2026-02-23T04:59:00'));
      expect(getGreetingMessage('Ana')).toBe('Buenas noches, Ana');
    });

    it('omits the name when empty or missing', () => {
      jest.setSystemTime(new Date('2026-02-23T09:00:00'));

      expect(getGreetingMessage()).toBe('Buenos dias');
      expect(getGreetingMessage('   ')).toBe('Buenos dias');
    });
  });
});
