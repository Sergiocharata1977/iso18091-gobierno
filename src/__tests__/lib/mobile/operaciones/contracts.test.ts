import {
  extractOperationalNotes,
  toMobileCatalogoResumen,
  toMobileSolicitudDetalle,
} from '@/lib/mobile/operaciones/contracts';
import type { ProductoDealer } from '@/types/dealer-catalogo';
import type { Solicitud } from '@/types/solicitudes';
import type { SystemActivityLogEntry } from '@/types/system-activity-log';

function buildSolicitud(overrides: Partial<Solicitud> = {}): Solicitud {
  return {
    id: 'sol-1',
    numero: 'SOL-SER-202603-0001',
    organization_id: 'org-1',
    tipo: 'servicio',
    flujo: 'servicios',
    estado: 'gestionando',
    estado_operativo: 'programada',
    prioridad: 'alta',
    nombre: 'Juan Perez',
    telefono: '+5491112345678',
    email: 'juan@example.com',
    cuit: null,
    mensaje: 'No arranca',
    payload: {
      equipo_modelo: 'Puma 230',
      numero_serie: 'CASE-123',
      notas_operativas: [
        {
          id: 'note-1',
          texto: 'Se agenda visita tecnica',
          created_at: '2026-03-31T10:00:00.000Z',
          created_by: 'user-1',
          created_by_name: 'Tecnico 1',
          source: 'operaciones_android',
        },
      ],
    },
    origen: 'public_api',
    assigned_to: 'user-2',
    crm_cliente_id: null,
    crm_contacto_id: null,
    crm_oportunidad_id: null,
    crm_sync_status: 'not_applicable',
    crm_sync_at: null,
    crm_sync_error: null,
    created_at: new Date('2026-03-30T10:00:00.000Z'),
    updated_at: new Date('2026-03-31T12:00:00.000Z'),
    ...overrides,
  };
}

function buildHistoryEntry(): SystemActivityLogEntry {
  return {
    id: 'log-1',
    organization_id: 'org-1',
    occurred_at: new Date('2026-03-31T12:30:00.000Z'),
    recorded_at: new Date('2026-03-31T12:30:00.000Z'),
    source_module: 'mobile_operaciones',
    source_submodule: 'solicitudes',
    channel: 'api',
    actor_type: 'user',
    actor_user_id: 'user-2',
    actor_display_name: 'Tecnico 2',
    actor_role: 'operario',
    actor_department_id: null,
    actor_department_name: null,
    entity_type: 'solicitud',
    entity_id: 'sol-1',
    entity_code: 'SOL-SER-202603-0001',
    action_type: 'update',
    action_label: 'Solicitud actualizada desde mobile',
    description: 'Cambio de estado a programada',
    status: 'success',
    severity: 'info',
    related_entities: [],
    evidence_refs: [],
    correlation_id: 'req-1',
    metadata: {
      new_estado_operativo: 'programada',
    },
  };
}

function buildProducto(overrides: Partial<ProductoDealer> = {}): ProductoDealer {
  return {
    id: 'prod-1',
    organization_id: 'org-1',
    nombre: 'Tractor Puma',
    descripcion: 'Equipo principal',
    categoria: 'maquinaria',
    marca: 'CASE',
    modelo: 'Puma 230',
    precio_contado: 100000,
    precio_lista: 110000,
    stock: 3,
    imagenes: ['https://example.com/p1.jpg'],
    activo: true,
    destacado: true,
    created_at: new Date('2026-03-20T10:00:00.000Z'),
    updated_at: new Date('2026-03-31T12:00:00.000Z'),
    ...overrides,
  };
}

describe('mobile operaciones contracts', () => {
  it('normalizes operational notes from payload', () => {
    const notes = extractOperationalNotes(buildSolicitud().payload);

    expect(notes).toEqual([
      {
        id: 'note-1',
        texto: 'Se agenda visita tecnica',
        created_at: '2026-03-31T10:00:00.000Z',
        created_by: 'user-1',
        created_by_name: 'Tecnico 1',
        source: 'operaciones_android',
      },
    ]);
  });

  it('includes notes and history in solicitud detail payload', () => {
    const detail = toMobileSolicitudDetalle(buildSolicitud(), {
      history: [buildHistoryEntry()],
    }) as Record<string, unknown>;

    expect(detail.notas_operativas).toEqual([
      expect.objectContaining({
        id: 'note-1',
        texto: 'Se agenda visita tecnica',
      }),
    ]);
    expect(detail.historial).toEqual([
      expect.objectContaining({
        id: 'log-1',
        action_type: 'update',
        actor: expect.objectContaining({
          user_id: 'user-2',
          display_name: 'Tecnico 2',
        }),
      }),
    ]);
  });

  it('maps catalog product availability based on active status and stock', () => {
    const disponible = toMobileCatalogoResumen(buildProducto());
    const sinStock = toMobileCatalogoResumen(buildProducto({ stock: 0 }));
    const inactivo = toMobileCatalogoResumen(buildProducto({ activo: false }));

    expect(disponible).toEqual(
      expect.objectContaining({
        disponible: true,
        disponibilidad: expect.objectContaining({
          estado: 'disponible',
          stock: 3,
        }),
      })
    );

    expect(sinStock).toEqual(
      expect.objectContaining({
        disponible: false,
        disponibilidad: expect.objectContaining({
          estado: 'sin_stock',
          stock: 0,
        }),
      })
    );

    expect(inactivo).toEqual(
      expect.objectContaining({
        disponible: false,
        disponibilidad: expect.objectContaining({
          estado: 'inactivo',
        }),
      })
    );
  });
});
