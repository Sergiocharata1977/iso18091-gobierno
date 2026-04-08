import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AIChannel, AIUserProfile } from '@/types/ai-core';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const COLLECTION = 'ai_user_profiles';

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

export class AIUserProfileService {
  static async getByUserId(userId: string): Promise<AIUserProfile | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(userId).get();
    if (!doc.exists) return null;
    const data = doc.data() || {};
    return {
      userId: doc.id,
      organizationId: data.organizationId || '',
      preferredLanguage: data.preferredLanguage,
      preferredTone: data.preferredTone,
      lastGreetingAt: toDate(data.lastGreetingAt),
      lastInteractionAt: toDate(data.lastInteractionAt),
      lastChannel: data.lastChannel || null,
      drafts: Array.isArray(data.drafts)
        ? data.drafts.map((d: any) => ({
            type: String(d?.type || 'unknown'),
            data:
              d && typeof d.data === 'object' && d.data !== null ? d.data : {},
            createdAt: toDate(d?.createdAt) || new Date(),
          }))
        : [],
    };
  }

  static async touch(params: {
    userId: string;
    organizationId: string;
    channel: AIChannel;
  }): Promise<void> {
    const db = getAdminFirestore();
    const now = Timestamp.now();
    await db.collection(COLLECTION).doc(params.userId).set(
      {
        organizationId: params.organizationId,
        lastInteractionAt: now,
        lastChannel: params.channel,
        updatedAt: now,
        preferredLanguage: 'es',
        preferredTone: 'formal',
      },
      { merge: true }
    );
  }

  static async addDraft(params: {
    userId: string;
    organizationId: string;
    type: string;
    data: Record<string, unknown>;
  }): Promise<{ id: string; createdAt: Date }> {
    const db = getAdminFirestore();
    const now = new Date();
    const nowTs = Timestamp.fromDate(now);
    const draftId = `${params.type}_${Date.now()}`;

    await db
      .collection(COLLECTION)
      .doc(params.userId)
      .set(
        {
          organizationId: params.organizationId,
          drafts: FieldValue.arrayUnion({
            id: draftId,
            type: params.type,
            data: params.data,
            createdAt: nowTs,
          }),
          lastInteractionAt: nowTs,
          updatedAt: nowTs,
        },
        { merge: true }
      );

    return { id: draftId, createdAt: now };
  }
}
