import { withAuth } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, _context, auth) => {
  return NextResponse.json({
    ok: true,
    sso_version: 'v1',
    user: {
      uid: auth.uid,
      email: auth.email,
      role: auth.role,
      organization_id: auth.organizationId || null,
    },
    issued_at: new Date().toISOString(),
  });
});
