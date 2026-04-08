import { AIPolicyEngine } from '@/services/ai-core/policyEngine';

describe('AIPolicyEngine', () => {
  it('blocks document approval for operario', () => {
    const result = AIPolicyEngine.checkPermission({
      userId: 'u1',
      organizationId: 'org1',
      role: 'operario',
      channel: 'chat',
      action: 'converse',
      inputText: 'Aprobame este documento por favor',
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('FORBIDDEN_ACTION');
  });

  it('allows document approval for jefe', () => {
    const result = AIPolicyEngine.checkPermission({
      userId: 'u1',
      organizationId: 'org1',
      role: 'jefe',
      channel: 'chat',
      action: 'converse',
      inputText: 'Aprobame este documento por favor',
    });

    expect(result.allowed).toBe(true);
  });
});
