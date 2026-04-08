import {
  isSeedExecutionBlockedInProduction,
  logSeedExecution,
  SEED_ALLOWED_ROLES,
} from '@/lib/api/seedSecurity';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthContext } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic
export const dynamic = 'force-dynamic';

async function configureSuperAdmins() {
  const db = getAdminFirestore();
  const authService = getAdminAuth();

  const email = 'superadmin@doncandidoia.com';
  const password = 'password123';
  const displayName = 'Super Admin';

  let uid;

  try {
    const existingUser = await authService.getUserByEmail(email);
    uid = existingUser.uid;
    await authService.updateUser(uid, {
      password,
      displayName,
      emailVerified: true,
    });
    console.log('User updated:', uid);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      const newUser = await authService.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      uid = newUser.uid;
      console.log('User created:', uid);
    } else {
      throw error;
    }
  }

  await authService.setCustomUserClaims(uid, { role: 'super_admin' });

  await db.collection('users').doc(uid).set(
    {
      email,
      displayName,
      rol: 'super_admin',
      activo: true,
      status: 'active',
      organization_id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const email2 = 'admin.ref@doncandidoia.com';
  const password2 = 'Ref2024!';
  let uid2;

  try {
    const existingUser2 = await authService.getUserByEmail(email2);
    uid2 = existingUser2.uid;
    await authService.updateUser(uid2, {
      password: password2,
      displayName: 'Admin Ref',
      emailVerified: true,
    });
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      const newUser2 = await authService.createUser({
        email: email2,
        password: password2,
        displayName: 'Admin Ref',
        emailVerified: true,
      });
      uid2 = newUser2.uid;
    } else {
      throw error;
    }
  }

  await authService.setCustomUserClaims(uid2, { role: 'super_admin' });
  await db.collection('users').doc(uid2).set(
    {
      email: email2,
      displayName: 'Admin Ref',
      rol: 'super_admin',
      activo: true,
      status: 'active',
      organization_id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return { email, email2, password2, uid, uid2 };
}

const runSeed = async (request: NextRequest, auth: AuthContext) => {
  if (isSeedExecutionBlockedInProduction()) {
    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/super-admin',
      method: request.method,
      status: 'blocked',
    });
    return NextResponse.json(
      { success: false, error: 'Endpoint de seed bloqueado en produccion' },
      { status: 403 }
    );
  }

  await logSeedExecution({
    request,
    auth,
    route: '/api/seed/super-admin',
    method: request.method,
    status: 'attempt',
  });

  try {
    const result = await configureSuperAdmins();
    const response = NextResponse.json({
      success: true,
      message: `Super Admins configured. 1) ${result.email} 2) ${result.email2} / ${result.password2}`,
      uids: [result.uid, result.uid2],
    });

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/super-admin',
      method: request.method,
      status: 'success',
      details: { status: response.status },
    });

    return response;
  } catch (error: any) {
    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/super-admin',
      method: request.method,
      status: 'error',
      details: { message: error?.message || 'Unknown error' },
    });

    console.error('Error seeding super admin:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
};

export const GET = withAuth(
  async (request, _context, auth) => runSeed(request, auth),
  { roles: SEED_ALLOWED_ROLES }
);

export const POST = withAuth(
  async (request, _context, auth) => runSeed(request, auth),
  { roles: SEED_ALLOWED_ROLES }
);
