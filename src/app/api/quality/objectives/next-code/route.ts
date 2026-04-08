import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const processId = searchParams.get('process_id');

      if (!processId) {
        return NextResponse.json(
          { error: 'process_id is required' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      let query = db
        .collection('quality_objectives')
        .where('process_definition_id', '==', processId) as any;
      if (auth.role !== 'super_admin') {
        query = query.where('organization_id', '==', auth.organizationId);
      }

      const snapshot = await query.get();
      const existingNumbers: number[] = [];
      snapshot.forEach((doc: any) => {
        const code = doc.data().code;
        if (code) {
          const match = code.match(/-(\d+)$/);
          if (match) existingNumbers.push(parseInt(match[1], 10));
        }
      });

      const nextNumber =
        existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      return NextResponse.json({ nextNumber });
    } catch (error: any) {
      console.error('Error getting next code:', error);
      return NextResponse.json(
        { error: error.message || 'Error getting next code' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
