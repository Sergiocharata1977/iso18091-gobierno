import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AIChannel } from '@/types/ai-core';
import type { ResolvedIdentity } from '@/types/ai-security';

const COLLECTION = 'channel_identity_links';

function normalizeExternalId(channel: AIChannel, externalId: string): string {
  const raw = externalId.trim();
  if (channel === 'whatsapp') {
    return raw.replace(/^whatsapp:/i, '').replace(/\s+/g, '');
  }
  return raw;
}

export class ChannelIdentityResolver {
  static fromAuthenticatedWeb(params: {
    channel: Extract<AIChannel, 'chat' | 'voice'>;
    userId: string;
    organizationId: string;
  }): ResolvedIdentity {
    return {
      channel: params.channel,
      userId: params.userId,
      organizationId: params.organizationId,
      source: 'auth',
    };
  }

  static async resolveByExternalId(params: {
    channel: AIChannel;
    externalId: string;
  }): Promise<ResolvedIdentity | null> {
    const db = getAdminFirestore();
    const normalized = normalizeExternalId(params.channel, params.externalId);
    const snapshot = await db
      .collection(COLLECTION)
      .where('channel', '==', params.channel)
      .where('externalId', '==', normalized)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data() || {};
    if (!data.userId || !data.organizationId) return null;

    return {
      channel: params.channel,
      userId: data.userId,
      organizationId: data.organizationId,
      source: 'channel_link',
      externalId: normalized,
    };
  }
}
