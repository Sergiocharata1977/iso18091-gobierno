const mockGetAdminFirestore = jest.fn();
const mockTimestampFromDate = jest.fn((date: Date) => ({
  __timestamp: date.toISOString(),
  toDate: () => date,
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => mockGetAdminFirestore(),
}));

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    fromDate: (date: Date) => mockTimestampFromDate(date),
  },
}));

import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';
import type { SystemActivityLogWriteInput } from '@/types/system-activity-log';

function asFirestoreDate(date: Date) {
  return {
    toDate: () => date,
  };
}

function createBaseInput(
  overrides: Partial<SystemActivityLogWriteInput> = {}
): SystemActivityLogWriteInput {
  return {
    organization_id: 'org-1',
    actor_type: 'user',
    actor_user_id: 'user-1',
    actor_display_name: 'Usuario Test',
    actor_role: 'admin',
    actor_department_id: 'dep-1',
    actor_department_name: 'Calidad',
    occurred_at: new Date('2026-03-30T10:00:00.000Z'),
    source_module: 'audits',
    source_submodule: 'close',
    channel: 'web',
    entity_type: 'audit',
    entity_id: 'AUD-1',
    entity_code: 'AUD-1',
    action_type: 'update',
    action_label: 'Audit Updated',
    description: 'Audit updated from tests.',
    status: 'success',
    severity: 'info',
    related_entities: [],
    evidence_refs: [],
    correlation_id: 'corr-1',
    metadata: { source: 'test' },
    ...overrides,
  };
}

function createQueryMock(snapshot: { docs: Array<{ id: string; data: () => any }> }) {
  const state = {
    whereCalls: [] as Array<[string, string, unknown]>,
    orderByCalls: [] as Array<[string, string]>,
    limitCalls: [] as number[],
  };

  const query = {
    where: jest.fn((field: string, operator: string, value: unknown) => {
      state.whereCalls.push([field, operator, value]);
      return query;
    }),
    orderBy: jest.fn((field: string, direction: string) => {
      state.orderByCalls.push([field, direction]);
      return query;
    }),
    limit: jest.fn((value: number) => {
      state.limitCalls.push(value);
      return query;
    }),
    get: jest.fn().mockResolvedValue(snapshot),
  };

  return { query, state };
}

describe('SystemActivityLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('valida el payload minimo antes de escribir', async () => {
    const add = jest.fn();
    const collection = jest.fn(() => ({ add }));
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    mockGetAdminFirestore.mockReturnValue({ collection });

    const result = await SystemActivityLogService.log({
      ...createBaseInput(),
      organization_id: '',
    });

    expect(result).toBe('');
    expect(collection).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('escribe en la coleccion correcta y normaliza campos opcionales', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'activity-1' });
    const collection = jest.fn(() => ({ add }));

    mockGetAdminFirestore.mockReturnValue({ collection });

    const result = await SystemActivityLogService.logUserAction({
      organization_id: 'org-1',
      actor_user_id: 'user-1',
      occurred_at: new Date('2026-03-30T10:00:00.000Z'),
      source_module: 'direct_actions',
      source_submodule: null,
      channel: 'web',
      entity_type: 'audit',
      entity_id: 'AUD-1',
      entity_code: null,
      action_type: 'ai_action_requested',
      action_label: 'Accion IA propuesta',
      description: 'Se propuso una accion.',
      status: 'pending',
      severity: 'info',
      correlation_id: null,
      metadata: { test: true },
    });

    expect(result).toBe('activity-1');
    expect(collection).toHaveBeenCalledWith('system_activity_log');
    expect(add).toHaveBeenCalledTimes(1);

    const payload = add.mock.calls[0][0];
    expect(payload.actor_type).toBe('user');
    expect(payload.actor_display_name).toBeNull();
    expect(payload.actor_role).toBeNull();
    expect(payload.actor_department_id).toBeNull();
    expect(payload.actor_department_name).toBeNull();
    expect(payload.related_entities).toEqual([]);
    expect(payload.evidence_refs).toEqual([]);
    expect(payload.occurred_at).toEqual(
      expect.objectContaining({
        __timestamp: '2026-03-30T10:00:00.000Z',
      })
    );
    expect(payload.recorded_at).toEqual(
      expect.objectContaining({
        __timestamp: expect.any(String),
      })
    );
  });

  it('filtra por organizacion y entidad en getByOrganization', async () => {
    const recordedAt = new Date('2026-03-30T11:00:00.000Z');
    const occurredAt = new Date('2026-03-30T10:00:00.000Z');
    const outsideOccurredAt = new Date('2026-03-31T10:00:00.000Z');
    const { query, state } = createQueryMock({
      docs: [
        {
          id: 'activity-1',
          data: () => ({
            ...createBaseInput(),
            occurred_at: asFirestoreDate(occurredAt),
            recorded_at: asFirestoreDate(recordedAt),
          }),
        },
        {
          id: 'activity-2',
          data: () => ({
            ...createBaseInput({
              entity_id: 'AUD-2',
            }),
            occurred_at: asFirestoreDate(outsideOccurredAt),
            recorded_at: asFirestoreDate(recordedAt),
          }),
        },
      ],
    });

    mockGetAdminFirestore.mockReturnValue({
      collection: jest.fn(() => query),
    });

    const result = await SystemActivityLogService.getByOrganization('org-1', {
      entity_type: 'audit',
      entity_id: 'AUD-1',
      actor_user_id: 'user-1',
      occurred_to: new Date('2026-03-30T23:59:59.999Z'),
      limit: 25,
    });

    expect(state.whereCalls).toEqual(
      expect.arrayContaining([
        ['organization_id', '==', 'org-1'],
        ['actor_user_id', '==', 'user-1'],
        ['entity_type', '==', 'audit'],
        ['entity_id', '==', 'AUD-1'],
      ])
    );
    expect(state.orderByCalls).toEqual([['occurred_at', 'desc']]);
    expect(state.limitCalls).toEqual([25]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('activity-1');
    expect(result[0].organization_id).toBe('org-1');
    expect(result[0].entity_id).toBe('AUD-1');
  });

  it('filtra por organizacion y entidad en getByEntity', async () => {
    const { query, state } = createQueryMock({
      docs: [
        {
          id: 'activity-1',
          data: () => ({
            ...createBaseInput(),
            occurred_at: asFirestoreDate(new Date('2026-03-30T10:00:00.000Z')),
            recorded_at: asFirestoreDate(new Date('2026-03-30T11:00:00.000Z')),
          }),
        },
      ],
    });

    mockGetAdminFirestore.mockReturnValue({
      collection: jest.fn(() => query),
    });

    const result = await SystemActivityLogService.getByEntity(
      'org-1',
      'audit',
      'AUD-1'
    );

    expect(state.whereCalls).toEqual([
      ['organization_id', '==', 'org-1'],
      ['entity_type', '==', 'audit'],
      ['entity_id', '==', 'AUD-1'],
    ]);
    expect(state.orderByCalls).toEqual([['occurred_at', 'desc']]);
    expect(state.limitCalls).toEqual([100]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('activity-1');
  });
});
