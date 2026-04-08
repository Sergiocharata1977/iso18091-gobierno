import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { ImplementationMaturity, MaturityLevel } from '@/types/maturity';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
  try {
    const adminDb = getAdminFirestore();
    const orgsSnapshot = await adminDb.collection('organizations').get();
    const results = [];

    for (const orgDoc of orgsSnapshot.docs) {
      const orgData = orgDoc.data();
      const maturityDoc = await adminDb
        .collection('organizations')
        .doc(orgDoc.id)
        .collection('maturity')
        .doc('current')
        .get();

      let maturityData: Partial<ImplementationMaturity> | null = null;
      if (maturityDoc.exists) {
        maturityData = maturityDoc.data() as ImplementationMaturity;
      }

      results.push({
        organizationId: orgDoc.id,
        name: orgData.name || 'Sin Nombre',
        plan: orgData.plan || 'Free',
        maturityLevel: maturityData?.globalLevel || MaturityLevel.INICIAL,
        maturityScore: maturityData?.globalScore || 0,
        lastUpdated: maturityData?.updatedAt
          ? (maturityData.updatedAt as any).toDate()
          : null,
        companySize: maturityData?.companySize || 'Unknown',
      });
    }

    results.sort((a, b) => b.maturityScore - a.maturityScore);
    return NextResponse.json({ organizations: results });
  } catch (error) {
    console.error('Error fetching maturity stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
