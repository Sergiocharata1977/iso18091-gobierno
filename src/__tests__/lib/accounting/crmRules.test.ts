/** @jest-environment node */

const mockSet = jest.fn();
const mockCommit = jest.fn();

const mockDb = {
  batch: jest.fn(() => ({
    set: mockSet,
    commit: mockCommit,
  })),
  collection: jest.fn((name: string) => ({
    doc: jest.fn((id: string) => ({
      id,
      _collection: name,
    })),
  })),
};

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => mockDb,
}));

import { ensureCrmAccountingRules } from '@/lib/accounting/rules/crmRules';

describe('ensureCrmAccountingRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCommit.mockResolvedValue(undefined);
  });

  it('siembra las reglas minimas de CRM en acc_rules', async () => {
    const rules = await ensureCrmAccountingRules({
      organizationId: 'org-1',
      userId: 'user-1',
    });

    expect(rules.map(rule => rule.operation_type)).toEqual([
      'crm_factura',
      'crm_cobro',
      'crm_credito_otorgado',
      'crm_cuota_cobrada',
    ]);
    expect(mockSet).toHaveBeenCalledTimes(4);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'crm:crm_factura', _collection: 'acc_rules' }),
      expect.objectContaining({
        organization_id: 'org-1',
        plugin_id: 'crm',
        operation_type: 'crm_factura',
      }),
      { merge: true }
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});
