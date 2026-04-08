import {
  publicSolicitudComercialSchema,
  publicSolicitudRepuestoSchema,
  publicSolicitudServicioSchema,
} from '@/lib/validations/dealer-solicitudes';

describe('dealer solicitudes public schemas', () => {
  it('accepts repuesto payload', () => {
    const result = publicSolicitudRepuestoSchema.parse({
      tipo: 'repuesto',
      nombre: 'Juan Perez',
      telefono: '+54 9 11 5555 5555',
      email: 'juan@cliente.com',
      cuit: '',
      maquina_tipo: 'Cosechadora',
      modelo: 'AX750',
      numero_serie: 'SER-123',
      descripcion_repuesto: 'Necesito un filtro hidraulico para la maquina.',
      website: '',
      form_started_at: Date.now() - 5000,
    });

    expect(result.tipo).toBe('repuesto');
  });

  it('accepts servicio payload', () => {
    const result = publicSolicitudServicioSchema.parse({
      tipo: 'servicio',
      nombre: 'Ana Gomez',
      telefono: '+54 9 3492 11 2233',
      email: 'ana@cliente.com',
      cuit: '',
      maquina_tipo: 'Tractor',
      modelo: 'T120',
      numero_serie: '',
      descripcion_problema:
        'La maquina pierde presion hidraulica luego de media hora.',
      localidad: 'Rafaela',
      provincia: 'Santa Fe',
      website: '',
      form_started_at: Date.now() - 5000,
    });

    expect(result.tipo).toBe('servicio');
  });

  it('requires comentarios for comercial payload', () => {
    expect(() =>
      publicSolicitudComercialSchema.parse({
        tipo: 'comercial',
        nombre: 'Lucia',
        telefono: '12345678',
        email: 'lucia@cliente.com',
        cuit: '',
        producto_interes: 'Sembradora',
        requiere_financiacion: true,
        comentarios: 'no',
        website: '',
        form_started_at: Date.now() - 5000,
      })
    ).toThrow();
  });
});
