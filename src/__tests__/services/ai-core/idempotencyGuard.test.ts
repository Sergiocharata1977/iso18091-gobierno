jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

import { AIIdempotencyGuard } from '@/services/ai-core/idempotencyGuard';

describe('AIIdempotencyGuard', () => {
  it('builds deterministic key with same inputs', () => {
    const a = AIIdempotencyGuard.buildKey({
      channel: 'chat',
      userId: 'u1',
      organizationId: 'org1',
      clientMessageId: 'm1',
      contentPreview: 'Hola mundo',
    });
    const b = AIIdempotencyGuard.buildKey({
      channel: 'chat',
      userId: 'u1',
      organizationId: 'org1',
      clientMessageId: 'm1',
      contentPreview: 'Hola mundo',
    });

    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });

  it('returns null when no message identifiers are provided', () => {
    const key = AIIdempotencyGuard.buildKey({
      channel: 'chat',
      userId: 'u1',
      organizationId: 'org1',
      contentPreview: 'hola',
    });

    expect(key).toBeNull();
  });
});
