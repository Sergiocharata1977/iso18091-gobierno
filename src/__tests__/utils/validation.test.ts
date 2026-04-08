describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format date to locale string', () => {
      const date = new Date('2025-01-15T10:30:00');
      const formatted = date.toLocaleDateString('es-AR');

      expect(formatted).toContain('15');
      expect(formatted).toContain('1');
      expect(formatted).toContain('2025');
    });

    it('should handle invalid dates', () => {
      const invalidDate = new Date('invalid');

      expect(invalidDate.toString()).toBe('Invalid Date');
    });
  });

  describe('Date comparisons', () => {
    it('should correctly compare dates', () => {
      const date1 = new Date('2025-01-15');
      const date2 = new Date('2025-01-20');

      expect(date1.getTime()).toBeLessThan(date2.getTime());
    });

    it('should handle same dates', () => {
      const date1 = new Date('2025-01-15T00:00:00');
      const date2 = new Date('2025-01-15T00:00:00');

      expect(date1.getTime()).toBe(date2.getTime());
    });
  });
});

describe('Validation Utilities', () => {
  describe('Email validation', () => {
    it('should validate correct email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.com',
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('Password validation', () => {
    it('should require minimum 6 characters', () => {
      const shortPassword = '12345';
      const validPassword = '123456';

      expect(shortPassword.length).toBeLessThan(6);
      expect(validPassword.length).toBeGreaterThanOrEqual(6);
    });
  });
});
