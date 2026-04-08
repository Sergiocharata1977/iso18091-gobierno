import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  Document,
  DocumentCreateData,
  DocumentFilters,
  PaginatedResponse,
  PaginationParams,
} from '@/types/documents';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'documents';

function getRecordOrganizationId(data: Record<string, unknown>): string | null {
  const snake = data.organization_id;
  if (typeof snake === 'string' && snake.length > 0) return snake;

  const camel = data.organizationId;
  if (typeof camel === 'string' && camel.length > 0) return camel;

  return null;
}

function toSafeDate(value: unknown): Date | null {
  if (!value) return null;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export class DocumentServiceAdmin {
  static async getPaginated(
    filters: DocumentFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Document>> {
    try {
      const db = getAdminFirestore();
      let allDocs: Document[] = [];
      if (filters.organization_id) {
        const [snakeSnapshot, camelSnapshot] = await Promise.all([
          db
            .collection(COLLECTION_NAME)
            .where('organization_id', '==', filters.organization_id)
            .get(),
          db
            .collection(COLLECTION_NAME)
            .where('organizationId', '==', filters.organization_id)
            .get(),
        ]);

        const mergedDocs = new Map<string, Document>();
        for (const doc of snakeSnapshot.docs) {
          const data = doc.data();
          mergedDocs.set(doc.id, {
            id: doc.id,
            ...data,
            effective_date: toSafeDate(data.effective_date),
            review_date: toSafeDate(data.review_date),
            approved_at: toSafeDate(data.approved_at),
            created_at: toSafeDate(data.created_at) || new Date(),
            updated_at: toSafeDate(data.updated_at) || new Date(),
          } as Document);
        }
        for (const doc of camelSnapshot.docs) {
          if (mergedDocs.has(doc.id)) continue;
          const data = doc.data();
          mergedDocs.set(doc.id, {
            id: doc.id,
            ...data,
            effective_date: toSafeDate(data.effective_date),
            review_date: toSafeDate(data.review_date),
            approved_at: toSafeDate(data.approved_at),
            created_at: toSafeDate(data.created_at) || new Date(),
            updated_at: toSafeDate(data.updated_at) || new Date(),
          } as Document);
        }
        allDocs = Array.from(mergedDocs.values());
      } else {
        const snapshot = await db.collection(COLLECTION_NAME).get();
        allDocs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            effective_date: toSafeDate(data.effective_date),
            review_date: toSafeDate(data.review_date),
            approved_at: toSafeDate(data.approved_at),
            created_at: toSafeDate(data.created_at) || new Date(),
            updated_at: toSafeDate(data.updated_at) || new Date(),
          };
        }) as Document[];
      }

      // Filter in memory
      allDocs = allDocs.filter(doc => {
        // Default: exclude archived
        if (filters.is_archived !== undefined) {
          if (doc.is_archived !== filters.is_archived) return false;
        } else {
          if (doc.is_archived) return false;
        }

        // Additional filters
        if (filters.organization_id) {
          const docOrgId = getRecordOrganizationId(
            doc as unknown as Record<string, unknown>
          );
          if (docOrgId !== filters.organization_id) return false;
        }
        if (filters.type && doc.type !== filters.type) return false;
        if (filters.status && doc.status !== filters.status) return false;
        if (
          filters.responsible_user_id &&
          doc.responsible_user_id !== filters.responsible_user_id
        )
          return false;
        if (filters.process_id && doc.process_id !== filters.process_id)
          return false;

        return true;
      });

      // Sort
      const sortField = pagination.sort || 'created_at';
      const sortOrder = pagination.order === 'asc' ? 'asc' : 'desc';

      allDocs.sort((a, b) => {
        const aVal = (a as any)[sortField];
        const bVal = (b as any)[sortField];

        if (aVal instanceof Date && bVal instanceof Date) {
          return sortOrder === 'asc'
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return 0;
      });

      const total = allDocs.length;
      const offset = (pagination.page - 1) * pagination.limit;
      const data = allDocs.slice(offset, offset + pagination.limit);

      return {
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
          hasNext: offset + pagination.limit < total,
          hasPrev: pagination.page > 1,
        },
      };
    } catch (error) {
      console.error('Error getting paginated documents (Admin):', error);
      throw new Error('Error al obtener documentos paginados');
    }
  }

  static async create(data: DocumentCreateData): Promise<Document> {
    try {
      const db = getAdminFirestore();

      // Calculate code (simple version for admin service)
      const code = `DOC-${Date.now().toString().slice(-6)}`;

      const now = Timestamp.now();

      const docData = {
        ...data,
        code, // Simplified code generation
        download_count: 0,
        is_archived: false,
        effective_date: data.effective_date
          ? Timestamp.fromDate(data.effective_date)
          : null,
        review_date: data.review_date
          ? Timestamp.fromDate(data.review_date)
          : null,
        approved_at: data.approved_at
          ? Timestamp.fromDate(data.approved_at)
          : null,
        created_at: now,
        updated_at: now,
      };

      const docRef = await db.collection(COLLECTION_NAME).add(docData);

      return {
        id: docRef.id,
        ...data,
        code,
        download_count: 0,
        is_archived: false,
        reference_count: 0,
        is_orphan: true,
        created_at: now.toDate(),
        updated_at: now.toDate(),
      };
    } catch (error) {
      console.error('Error creating document (Admin):', error);
      throw new Error('Error al crear documento');
    }
  }
}
