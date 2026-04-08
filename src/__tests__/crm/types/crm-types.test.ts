import { CategoriaRiesgo, TipoCliente, type ClienteCRM } from '@/types/crm';

type IsRequired<T, K extends keyof T> = undefined extends T[K] ? false : true;

describe('CRM Types', () => {
  describe('TipoCliente', () => {
    it('should have exactly 3 values', () => {
      expect(Object.values(TipoCliente)).toHaveLength(3);
    });

    it('should include expected enum members', () => {
      expect(TipoCliente.POSIBLE_CLIENTE).toBe('posible_cliente');
      expect(TipoCliente.CLIENTE_FRECUENTE).toBe('cliente_frecuente');
      expect(TipoCliente.CLIENTE_ANTIGUO).toBe('cliente_antiguo');
    });
  });

  describe('CategoriaRiesgo', () => {
    it('should have exactly 5 categories A-E', () => {
      expect(Object.values(CategoriaRiesgo)).toHaveLength(5);
      expect(CategoriaRiesgo.A).toBe('A');
      expect(CategoriaRiesgo.E).toBe('E');
    });
  });

  describe('ClienteCRM required fields', () => {
    it('should keep key fields as required at type level', () => {
      const idIsRequired: IsRequired<ClienteCRM, 'id'> = true;
      const razonSocialIsRequired: IsRequired<ClienteCRM, 'razon_social'> =
        true;
      const cuitIsRequired: IsRequired<ClienteCRM, 'cuit_cuil'> = true;
      const tipoClienteIsRequired: IsRequired<ClienteCRM, 'tipo_cliente'> =
        true;
      const createdAtIsRequired: IsRequired<ClienteCRM, 'created_at'> = true;

      expect(idIsRequired).toBe(true);
      expect(razonSocialIsRequired).toBe(true);
      expect(cuitIsRequired).toBe(true);
      expect(tipoClienteIsRequired).toBe(true);
      expect(createdAtIsRequired).toBe(true);
    });
  });
});
