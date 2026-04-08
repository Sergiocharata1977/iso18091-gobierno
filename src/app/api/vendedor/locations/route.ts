import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

function resolveOrg(auth: any, requested?: string | null) {
  return auth.role === 'super_admin'
    ? requested || auth.organizationId
    : auth.organizationId;
}

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const { organization_id, vendedor_id, lat, lng, accuracy, timestamp } =
        body;
      const orgId = resolveOrg(auth, organization_id);

      if (!orgId || !vendedor_id || !lat || !lng) {
        return NextResponse.json(
          { error: 'Datos incompletos' },
          { status: 400 }
        );
      }

      const { Timestamp } = await import('firebase-admin/firestore');
      const db = getAdminFirestore();

      await db
        .collection('organizations')
        .doc(orgId)
        .collection('seller_locations')
        .doc(vendedor_id)
        .collection('history')
        .add({
          lat,
          lng,
          accuracy,
          timestamp: timestamp
            ? Timestamp.fromDate(new Date(timestamp))
            : Timestamp.now(),
          created_at: Timestamp.now(),
        });

      await db
        .collection('organizations')
        .doc(orgId)
        .collection('seller_locations')
        .doc(vendedor_id)
        .set(
          {
            last_location: {
              lat,
              lng,
              accuracy,
              timestamp: timestamp
                ? Timestamp.fromDate(new Date(timestamp))
                : Timestamp.now(),
            },
            updated_at: Timestamp.now(),
          },
          { merge: true }
        );

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('[LocationAPI] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Error interno' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id');
      const organization_id = resolveOrg(auth, requestedOrgId);
      const vendedor_id = searchParams.get('vendedor_id');

      if (!organization_id) {
        return NextResponse.json(
          { error: 'Falta organization_id' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();

      if (!vendedor_id) {
        const snapshot = await db
          .collection('organizations')
          .doc(organization_id)
          .collection('seller_locations')
          .get();

        const locations = snapshot.docs.map(doc => ({
          vendedor_id: doc.id,
          ...doc.data().last_location,
        }));
        return NextResponse.json({ locations });
      }

      const snapshot = await db
        .collection('organizations')
        .doc(organization_id)
        .collection('seller_locations')
        .doc(vendedor_id)
        .collection('history')
        .orderBy('timestamp', 'desc')
        .limit(500)
        .get();

      const route = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          lat: data.lat,
          lng: data.lng,
          timestamp: data.timestamp.toDate().toISOString(),
        };
      });

      return NextResponse.json({ route });
    } catch (error: any) {
      console.error('[LocationAPI] GET Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
