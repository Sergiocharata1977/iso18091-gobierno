jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

import { ChannelIdentityResolver } from '@/services/ai-core/channelIdentityResolver';

describe('ChannelIdentityResolver', () => {
  it('resolves authenticated web identity for chat', () => {
    const identity = ChannelIdentityResolver.fromAuthenticatedWeb({
      channel: 'chat',
      userId: 'u1',
      organizationId: 'org1',
    });

    expect(identity).toEqual({
      channel: 'chat',
      userId: 'u1',
      organizationId: 'org1',
      source: 'auth',
    });
  });

  it('resolves authenticated web identity for voice', () => {
    const identity = ChannelIdentityResolver.fromAuthenticatedWeb({
      channel: 'voice',
      userId: 'u2',
      organizationId: 'org2',
    });

    expect(identity.channel).toBe('voice');
    expect(identity.userId).toBe('u2');
    expect(identity.organizationId).toBe('org2');
    expect(identity.source).toBe('auth');
  });
});
