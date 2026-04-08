import { hash } from '@/lib/crypto';
import { getAdminFirestore } from '@/lib/firebase/admin';
import type { ConverseResponse } from '@/types/ai-core';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION = 'ai_idempotency_keys';
const DEFAULT_TTL_SECONDS = 5 * 60;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as Timestamp).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

export class AIIdempotencyGuard {
  static buildKey(input: {
    channel: string;
    userId: string;
    organizationId: string;
    clientMessageId?: string;
    externalMessageId?: string;
    contentPreview?: string;
  }): string | null {
    const token =
      input.clientMessageId?.trim() || input.externalMessageId?.trim() || '';
    if (!token) return null;
    return hash(
      [
        input.channel,
        input.userId,
        input.organizationId,
        token,
        (input.contentPreview || '').slice(0, 200).trim().toLowerCase(),
      ].join('|')
    );
  }

  static async get(key: string): Promise<ConverseResponse | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(key).get();
    if (!doc.exists) return null;
    const data = doc.data() || {};
    const expiresAt = toDate(data.expiresAt);
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return null;
    }
    return (data.response as ConverseResponse) || null;
  }

  static async set(params: {
    key: string;
    conversationId?: string;
    response: ConverseResponse;
    ttlSeconds?: number;
  }): Promise<void> {
    const db = getAdminFirestore();
    const ttl = params.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    await db
      .collection(COLLECTION)
      .doc(params.key)
      .set(
        {
          conversationId: params.conversationId || null,
          response: params.response,
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(expiresAt),
        },
        { merge: true }
      );
  }
}
