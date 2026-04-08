import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { VectorDocument, VectorStore } from './VectorStore';

type FirestoreVectorDoc = {
  text: string;
  metadata: Record<string, any>;
  embedding?: number[];
  normalized_text: string;
  text_tokens: string[];
  organization_id: string | null;
  is_deleted: boolean;
  created_at: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updated_at: FirebaseFirestore.FieldValue;
  deleted_at?: FirebaseFirestore.FieldValue;
};

export class FirestoreVectorStore implements VectorStore {
  private readonly collectionName: string;
  private readonly candidateLimit: number;

  constructor(collectionName: string = 'agent_memory', candidateLimit = 120) {
    this.collectionName = collectionName;
    this.candidateLimit = candidateLimit;
  }

  async search(
    query: string,
    limit: number = 5,
    filter?: Record<string, any>
  ): Promise<VectorDocument[]> {
    const safeLimit = Math.max(1, Math.min(limit, 20));
    const tokens = this.extractTokens(query);
    const organizationId = this.getOrganizationId(filter);
    const db = getAdminFirestore();

    let snapshots: FirebaseFirestore.QuerySnapshot[] = [];

    // Attempt token-based pre-filter first. If index constraints fail, fallback to broad query.
    try {
      let tokenQuery: FirebaseFirestore.Query = db
        .collection(this.collectionName)
        .where('is_deleted', '==', false);

      if (organizationId) {
        tokenQuery = tokenQuery.where('organization_id', '==', organizationId);
      }

      if (tokens.length > 0) {
        tokenQuery = tokenQuery.where(
          'text_tokens',
          'array-contains-any',
          tokens.slice(0, 10)
        );
      }

      snapshots.push(await tokenQuery.limit(this.candidateLimit).get());
    } catch (error) {
      console.warn(
        '[FirestoreVectorStore] Token query failed, falling back to broad query:',
        error
      );
    }

    if (snapshots.length === 0) {
      let broadQuery: FirebaseFirestore.Query = db
        .collection(this.collectionName)
        .where('is_deleted', '==', false);

      if (organizationId) {
        broadQuery = broadQuery.where('organization_id', '==', organizationId);
      }

      snapshots = [await broadQuery.limit(this.candidateLimit).get()];
    }

    const filterEntries = this.normalizeFilterEntries(filter);
    const candidates = new Map<string, VectorDocument>();

    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) {
        const data = doc.data() as FirestoreVectorDoc;
        if (!this.matchesFilter(data.metadata, filterEntries)) continue;

        const score = this.computeTextScore(query, tokens, data);
        if (score <= 0) continue;

        candidates.set(doc.id, {
          id: doc.id,
          text: data.text,
          metadata: data.metadata || {},
          embedding: Array.isArray(data.embedding) ? data.embedding : undefined,
          score,
        });
      }
    }

    return Array.from(candidates.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, safeLimit);
  }

  async addDocuments(documents: VectorDocument[]): Promise<void> {
    if (!documents.length) return;

    const db = getAdminFirestore();
    const batch = db.batch();

    for (const document of documents) {
      const normalizedText = this.normalizeText(document.text || '');
      const metadata = document.metadata || {};
      const docRef = db.collection(this.collectionName).doc(document.id);
      const organizationId =
        typeof metadata.organizationId === 'string'
          ? metadata.organizationId
          : typeof metadata.organization_id === 'string'
            ? metadata.organization_id
            : null;

      const payload: FirestoreVectorDoc = {
        text: document.text,
        metadata,
        embedding: document.embedding,
        normalized_text: normalizedText,
        text_tokens: this.extractTokens(normalizedText).slice(0, 60),
        organization_id: organizationId,
        is_deleted: false,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      batch.set(docRef, payload, { merge: true });
    }

    await batch.commit();
    console.log(
      `[FirestoreVectorStore] Added/updated ${documents.length} docs in ${this.collectionName}.`
    );
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    if (!ids.length) return;

    const db = getAdminFirestore();
    const batch = db.batch();

    for (const id of ids) {
      const docRef = db.collection(this.collectionName).doc(id);
      batch.set(
        docRef,
        {
          is_deleted: true,
          deleted_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
  }

  private computeTextScore(
    rawQuery: string,
    queryTokens: string[],
    data: FirestoreVectorDoc
  ): number {
    const normalizedQuery = this.normalizeText(rawQuery);
    const normalizedText =
      data.normalized_text || this.normalizeText(data.text);
    const tokenSet = new Set(
      Array.isArray(data.text_tokens) ? data.text_tokens : []
    );

    let tokenHits = 0;
    for (const token of queryTokens) {
      if (tokenSet.has(token)) tokenHits++;
    }

    const tokenScore =
      queryTokens.length > 0 ? tokenHits / queryTokens.length : 0;
    const exactScore =
      normalizedQuery.length > 0 && normalizedText.includes(normalizedQuery)
        ? 0.35
        : 0;

    return Number(Math.min(0.99, tokenScore * 0.75 + exactScore).toFixed(4));
  }

  private getOrganizationId(filter?: Record<string, any>): string | null {
    if (!filter) return null;
    const raw = filter.organizationId ?? filter.organization_id;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }

  private normalizeFilterEntries(
    filter?: Record<string, any>
  ): Array<[string, any]> {
    if (!filter) return [];

    return Object.entries(filter).filter(([key]) => {
      return key !== 'organizationId' && key !== 'organization_id';
    });
  }

  private matchesFilter(
    metadata: Record<string, any>,
    filterEntries: Array<[string, any]>
  ): boolean {
    if (!filterEntries.length) return true;
    if (!metadata) return false;

    return filterEntries.every(([key, value]) => metadata[key] === value);
  }

  private normalizeText(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTokens(input: string): string[] {
    const normalized = this.normalizeText(input);
    if (!normalized) return [];

    const uniqueTokens = Array.from(
      new Set(normalized.split(' ').filter(token => token.length >= 2))
    );

    return uniqueTokens.slice(0, 30);
  }
}
