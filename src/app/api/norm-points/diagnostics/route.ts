import { withAuth } from '@/lib/api/withAuth';
import { db } from '@/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { NextResponse } from 'next/server';
import {
  ADMIN_ROLES,
  ensureOrganization,
  getRequestedOrgId,
  isRecordAllowedByOrg,
  validateRequestedOrg,
} from '../_auth';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const orgGuard = ensureOrganization(auth);
      if (orgGuard) return orgGuard;

      const orgValidation = validateRequestedOrg(
        getRequestedOrgId(request.nextUrl.searchParams),
        auth
      );
      if (orgValidation) return orgValidation;

      const querySnapshot = await getDocs(collection(db, 'normPoints'));

      const points = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          code: doc.data().code,
          chapter: doc.data().chapter,
          chapterType: typeof doc.data().chapter,
          title: doc.data().title,
          organization_id: doc.data().organization_id,
        }))
        .filter(point => isRecordAllowedByOrg(point, auth.organizationId));

      // Agrupar por capítulo
      const byChapter: Record<string, number> = {};
      points.forEach(point => {
        const chapter = String(point.chapter || 'sin_capitulo');
        byChapter[chapter] = (byChapter[chapter] || 0) + 1;
      });

      return NextResponse.json({
        total: points.length,
        byChapter,
        sample: points.slice(0, 10),
        allCodes: points.map(point => point.code).sort(),
      });
    } catch (error) {
      console.error('Error in diagnostics:', error);
      return NextResponse.json(
        { error: 'Error en diagnóstico' },
        { status: 500 }
      );
    }
  },
  { roles: [...ADMIN_ROLES] }
);
