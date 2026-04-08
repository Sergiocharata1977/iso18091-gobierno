import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import type { SystemLogEntry } from '@/types/systemLog';
import { NextRequest, NextResponse } from 'next/server';

const VALID_LEVELS = new Set<SystemLogEntry['level']>(['error', 'warn', 'info']);
const PAGE_LIMIT = 50;

export const GET = withAuth(
  async (request: NextRequest, _context, _auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const level = searchParams.get('level') ?? undefined;
      const source = searchParams.get('source') ?? undefined;
      const cursor = searchParams.get('cursor') ?? undefined;

      if (level && !VALID_LEVELS.has(level as SystemLogEntry['level'])) {
        return NextResponse.json(
          { success: false, error: 'Nivel inválido' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      let query = db
        .collection('system_logs')
        .orderBy('created_at', 'desc')
        .limit(PAGE_LIMIT + 1);

      if (level) {
        query = query.where('level', '==', level);
      }

      if (source) {
        query = query.where('source', '==', source);
      }

      if (cursor) {
        const cursorDoc = await db.collection('system_logs').doc(cursor).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const docs = snapshot.docs;
      const hasMore = docs.length > PAGE_LIMIT;
      const items = docs.slice(0, PAGE_LIMIT);

      const logs: SystemLogEntry[] = items.map(doc => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          level: (data.level as SystemLogEntry['level']) ?? 'info',
          source: String(data.source ?? ''),
          message: String(data.message ?? ''),
          organization_id: data.organization_id
            ? String(data.organization_id)
            : null,
          user_id: data.user_id ? String(data.user_id) : null,
          path: data.path ? String(data.path) : undefined,
          status_code:
            typeof data.status_code === 'number' ? data.status_code : undefined,
          details:
            data.details && typeof data.details === 'object'
              ? (data.details as Record<string, unknown>)
              : undefined,
          created_at:
            typeof (data.created_at as { toDate?: () => Date })?.toDate ===
            'function'
              ? (data.created_at as { toDate: () => Date }).toDate()
              : undefined,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          logs,
          hasMore,
          nextCursor: hasMore ? items[items.length - 1].id : null,
        },
      });
    } catch (error) {
      console.error('[super-admin/system-logs][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron cargar los logs' },
        { status: 500 }
      );
    }
  },
  SUPER_ADMIN_AUTH_OPTIONS
);
