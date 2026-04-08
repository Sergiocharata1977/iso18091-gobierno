import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { analyzeDemoRequestSpam } from '@/lib/super-admin/demoRequestsSpam';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('demo_requests')
      .orderBy('created_at', 'desc')
      .get();

    const data = snapshot.docs.map(doc => {
      const raw = { id: doc.id, ...doc.data() } as Record<string, unknown>;
      const spam = analyzeDemoRequestSpam(raw);
      return {
        ...raw,
        spamScore: spam.spamScore,
        spamReasons: spam.reasons,
        isLikelySpam: spam.isLikelySpam,
      };
    });

    const spamCount = data.filter(item => item.isLikelySpam).length;

    return NextResponse.json({
      success: true,
      data,
      meta: {
        total: data.length,
        spamCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const DELETE = withAuth(async request => {
  try {
    const db = getAdminFirestore();
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';

    const snapshot = await db
      .collection('demo_requests')
      .orderBy('created_at', 'desc')
      .get();

    const candidates = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .map(item => ({
        ...item,
        spam: analyzeDemoRequestSpam(item as Record<string, unknown>),
      }))
      .filter(item => item.spam.isLikelySpam)
      .filter(item => (item as { status?: string }).status !== 'activated');

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        spamDetected: candidates.length,
        ids: candidates.map(item => item.id),
      });
    }

    let deleted = 0;
    let batch = db.batch();
    let operations = 0;

    for (const item of candidates) {
      batch.delete(db.collection('demo_requests').doc(String(item.id)));
      operations += 1;
      deleted += 1;

      if (operations === 400) {
        await batch.commit();
        batch = db.batch();
        operations = 0;
      }
    }

    if (operations > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      deleted,
      skippedActivated: snapshot.docs.length - candidates.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
