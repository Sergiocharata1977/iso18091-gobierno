import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    if (!auth.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID missing' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orgIdQuery = searchParams.get('organization_id');
    const limitParam = searchParams.get('limit');
    if (
      orgIdQuery &&
      orgIdQuery !== auth.organizationId &&
      auth.role !== 'super_admin'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden organization' },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();
    let query = db
      .collection('mcp_executions')
      .where('organization_id', '==', auth.organizationId)
      .orderBy('created_at', 'desc');

    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit)) {
        query = query.limit(limit);
      }
    } else {
      query = query.limit(50); // Default safety limit
    }

    const snapshot = await query.get();

    // Transform data to Serialized format (timestamps to Dates/Strings)
    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        // Convert Timestamps to ISO strings for easier client handling logic if needed,
        // but our client component handles {seconds, nanoseconds} object too.
        // We'll leave it as is to preserve fidelity, next.js json() handles it.
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching MCP executions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
