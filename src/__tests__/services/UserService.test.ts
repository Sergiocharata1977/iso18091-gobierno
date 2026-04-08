import { UserService } from '@/services/auth/UserService';
import { TIPO_PERSONAL_TO_ROL } from '@/types/auth';

// Mock Firestore
jest.mock('@/firebase/config');

describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with default role operario', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
      };

      const result = await UserService.createUser(mockUser);

      expect(result).toMatchObject({
        id: 'test-uid-123',
        email: 'test@example.com',
        rol: 'operario',
        activo: true,
      });
      expect(result.personnel_id).toBe('');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should use provided uid as document id', async () => {
      const mockUser = {
        uid: 'custom-uid-456',
        email: 'user@test.com',
      };

      const result = await UserService.createUser(mockUser);

      expect(result.id).toBe('custom-uid-456');
    });
  });

  describe('TIPO_PERSONAL_TO_ROL mapping', () => {
    it('should map gerencial to gerente', () => {
      expect(TIPO_PERSONAL_TO_ROL['gerencial']).toBe('gerente');
    });

    it('should map supervisor to jefe', () => {
      expect(TIPO_PERSONAL_TO_ROL['supervisor']).toBe('jefe');
    });

    it('should map administrativo to jefe', () => {
      expect(TIPO_PERSONAL_TO_ROL['administrativo']).toBe('jefe');
    });

    it('should map técnico to operario', () => {
      expect(TIPO_PERSONAL_TO_ROL['técnico']).toBe('operario');
    });

    it('should map ventas to operario', () => {
      expect(TIPO_PERSONAL_TO_ROL['ventas']).toBe('operario');
    });
  });
});
