import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const code = searchParams.get('code');
      const orgIdParam = searchParams.get('orgId');

      if (!code) {
        return NextResponse.json(
          { error: 'Se requiere el parametro "code"' },
          { status: 400 }
        );
      }

      const normalizedCode = code.toUpperCase().trim();
      if (!/^[A-Z]{2,4}$/.test(normalizedCode)) {
        return NextResponse.json(
          {
            available: false,
            error: 'El codigo debe tener entre 2 y 4 letras',
          },
          { status: 400 }
        );
      }

      const orgId =
        auth.role === 'super_admin'
          ? orgIdParam || auth.organizationId
          : auth.organizationId;
      const db = getAdminFirestore();

      let queryRef = db
        .collection('process_definitions')
        .where('process_code', '==', normalizedCode)
        .where('vigente', '==', true);

      if (orgId) {
        queryRef = queryRef.where('organization_id', '==', orgId);
      }

      const snapshot = await queryRef.limit(1).get();

      if (snapshot.empty) {
        return NextResponse.json({ available: true, code: normalizedCode });
      }

      const existingDoc = snapshot.docs[0];
      const existingData = existingDoc.data();

      return NextResponse.json({
        available: false,
        code: normalizedCode,
        existing: {
          id: existingDoc.id,
          nombre: existingData.nombre,
          codigo:
            existingData.codigo ||
            `${existingData.category_id}-${existingData.process_code}`,
        },
      });
    } catch (error) {
      console.error('Error en /api/process-definitions/check-code:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
