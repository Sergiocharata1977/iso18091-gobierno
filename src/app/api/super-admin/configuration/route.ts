import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { NextResponse } from 'next/server';

const COLLECTION = 'platform_settings';
const DOC_ID = 'global';

export const GET = withAuth(async () => {
  try {
    const db = getAdminFirestore();
    const ref = db.collection(COLLECTION).doc(DOC_ID);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({
        success: true,
        data: {
          platformName:
            process.env.NEXT_PUBLIC_APP_PLATFORM_NAME ||
            'Don Candido IA Platform',
          supportEmail: 'soporte@doncandidoia.com',
          defaultTrialDays: 30,
          maintenanceMode: false,
          allowPublicDemoRequests: true,
          updated_at: null,
        },
      });
    }

    return NextResponse.json({ success: true, data: snap.data() });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const PUT = withAuth(async request => {
  try {
    const payload = await request.json();
    const db = getAdminFirestore();
    const ref = db.collection(COLLECTION).doc(DOC_ID);

    const clean = {
      platformName:
        String(payload?.platformName || '').trim() || 'Don Candido IA Platform',
      supportEmail: String(payload?.supportEmail || '').trim(),
      defaultTrialDays: Number(payload?.defaultTrialDays || 30),
      maintenanceMode: Boolean(payload?.maintenanceMode),
      allowPublicDemoRequests: Boolean(payload?.allowPublicDemoRequests),
      updated_at: new Date(),
    };

    await ref.set(clean, { merge: true });
    return NextResponse.json({ success: true, data: clean });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
