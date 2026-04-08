import { withAuth } from '@/lib/api/withAuth';
import { NormPointService } from '@/services/normPoints/NormPointService';
import { NextRequest, NextResponse } from 'next/server';
import {
  ensureOrganization,
  filterRecordsByOrg,
  READ_ROLES,
} from '../../_auth';

// GET /api/norm-points/chapter/[chapter] - Get norm points by chapter
export const GET = withAuth(
  async (
    _request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
    auth
  ) => {
    try {
      const orgGuard = ensureOrganization(auth);
      if (orgGuard) return orgGuard;

      const { chapter: chapterStr } = await params;
      const chapter = parseInt(chapterStr);

      if (isNaN(chapter) || chapter < 4 || chapter > 10) {
        return NextResponse.json(
          { error: 'Capítulo inválido. Debe estar entre 4 y 10' },
          { status: 400 }
        );
      }

      const normPoints = await NormPointService.getByChapter(chapter);
      return NextResponse.json(
        filterRecordsByOrg(normPoints, auth.organizationId)
      );
    } catch (error) {
      console.error('Error getting norm points by chapter:', error);
      return NextResponse.json(
        { error: 'Error al obtener puntos de norma por capítulo' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
