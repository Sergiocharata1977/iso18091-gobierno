import { getAdminFirestore } from '@/lib/firebase/admin';
import type { InternalNote, UnifiedThreadMetadata } from '@/types/messages';
import { FieldValue } from 'firebase-admin/firestore';

type FirestoreDateLike = Date | { toDate: () => Date } | string | number | null | undefined;

function toDate(value: FirestoreDateLike): Date {
  if (value instanceof Date) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date(0);
}

function getThreadDoc(orgId: string, unifiedId: string) {
  return getAdminFirestore()
    .collection('organizations')
    .doc(orgId)
    .collection('message_threads')
    .doc(unifiedId);
}

function mapThreadMetadata(
  unifiedId: string,
  organizationId: string,
  data: Record<string, unknown>
): UnifiedThreadMetadata {
  return {
    unifiedId: typeof data.unifiedId === 'string' ? data.unifiedId : unifiedId,
    organizationId:
      typeof data.organizationId === 'string'
        ? data.organizationId
        : organizationId,
    status: data.status as UnifiedThreadMetadata['status'],
    assignedUserId:
      typeof data.assignedUserId === 'string' ? data.assignedUserId : undefined,
    assignedUserName:
      typeof data.assignedUserName === 'string'
        ? data.assignedUserName
        : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined,
    updatedAt: toDate(data.updatedAt as FirestoreDateLike),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
  };
}

function mapInternalNote(
  id: string,
  unifiedId: string,
  organizationId: string,
  data: Record<string, unknown>
): InternalNote {
  return {
    id,
    unifiedId: typeof data.unifiedId === 'string' ? data.unifiedId : unifiedId,
    organizationId:
      typeof data.organizationId === 'string'
        ? data.organizationId
        : organizationId,
    content: typeof data.content === 'string' ? data.content : '',
    authorId: typeof data.authorId === 'string' ? data.authorId : '',
    authorName: typeof data.authorName === 'string' ? data.authorName : '',
    createdAt: toDate(data.createdAt as FirestoreDateLike),
  };
}

export class ThreadMetadataService {
  static async getThreadMetadata(
    orgId: string,
    unifiedId: string
  ): Promise<UnifiedThreadMetadata | null> {
    const snap = await getThreadDoc(orgId, unifiedId).get();
    if (!snap.exists) {
      return null;
    }

    return mapThreadMetadata(
      unifiedId,
      orgId,
      (snap.data() || {}) as Record<string, unknown>
    );
  }

  static async upsertThreadMetadata(
    orgId: string,
    unifiedId: string,
    data: Partial<
      Pick<
        UnifiedThreadMetadata,
        'status' | 'assignedUserId' | 'assignedUserName' | 'tags'
      >
    >,
    updatedBy: string
  ): Promise<UnifiedThreadMetadata> {
    const docRef = getThreadDoc(orgId, unifiedId);

    await docRef.set(
      {
        unifiedId,
        organizationId: orgId,
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy,
      },
      { merge: true }
    );

    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error('No se pudo persistir metadata del hilo');
    }

    return mapThreadMetadata(
      unifiedId,
      orgId,
      (snap.data() || {}) as Record<string, unknown>
    );
  }

  static async addInternalNote(
    orgId: string,
    unifiedId: string,
    content: string,
    authorId: string,
    authorName: string
  ): Promise<InternalNote> {
    const docRef = getThreadDoc(orgId, unifiedId).collection('notes').doc();

    await docRef.set({
      unifiedId,
      organizationId: orgId,
      content,
      authorId,
      authorName,
      createdAt: FieldValue.serverTimestamp(),
    });

    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error('No se pudo crear la nota interna');
    }

    return mapInternalNote(
      docRef.id,
      unifiedId,
      orgId,
      (snap.data() || {}) as Record<string, unknown>
    );
  }

  static async listInternalNotes(
    orgId: string,
    unifiedId: string
  ): Promise<InternalNote[]> {
    const snap = await getThreadDoc(orgId, unifiedId)
      .collection('notes')
      .orderBy('createdAt', 'asc')
      .get();

    return snap.docs.map((doc) =>
      mapInternalNote(
        doc.id,
        unifiedId,
        orgId,
        (doc.data() || {}) as Record<string, unknown>
      )
    );
  }
}
