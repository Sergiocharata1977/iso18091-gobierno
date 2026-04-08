import { withAuth } from '@/lib/api/withAuth';
import { db } from '@/firebase/config';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_ROLES,
  ensureOrganization,
  getRequestedOrgId,
  isRecordAllowedByOrg,
  validateRequestedOrg,
} from '../_auth';

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const orgGuard = ensureOrganization(auth);
      if (orgGuard) return orgGuard;

      const orgValidation = validateRequestedOrg(
        getRequestedOrgId(request.nextUrl.searchParams),
        auth
      );
      if (orgValidation) return orgValidation;

      const normPointsRef = collection(db, 'normPoints');

      // Obtener puntos de la organizacion autenticada
      const snapshot = await getDocs(normPointsRef);
      const scopedDocs = snapshot.docs.filter(docSnap =>
        isRecordAllowedByOrg(
          { organization_id: docSnap.data().organization_id },
          auth.organizationId
        )
      );

      // Agrupar por código
      const pointsByCode = new Map<string, string[]>();

      scopedDocs.forEach(docSnap => {
        const code = docSnap.data().code;
        if (!pointsByCode.has(code)) {
          pointsByCode.set(code, []);
        }
        pointsByCode.get(code)!.push(docSnap.id);
      });

      // Eliminar duplicados (mantener solo el primero)
      let deletedCount = 0;
      const batch = writeBatch(db);

      pointsByCode.forEach(ids => {
        if (ids.length > 1) {
          // Mantener el primero, eliminar el resto
          ids.slice(1).forEach(id => {
            batch.delete(doc(db, 'normPoints', id));
            deletedCount++;
          });
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
      }

      return NextResponse.json({
        message: 'Duplicados eliminados exitosamente',
        deletedCount,
        uniquePoints: pointsByCode.size,
      });
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      return NextResponse.json(
        {
          error: 'Error al eliminar duplicados',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...ADMIN_ROLES] }
);
