import type { AuthContext } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextRequest } from 'next/server';

const SEED_AUDIT_COLLECTION = 'seed_execution_audit';

export const SEED_ALLOWED_ROLES: AuthContext['role'][] = [
  'admin',
  'super_admin',
];

export function isSeedExecutionBlockedInProduction(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_PROD_SEED_ENDPOINTS !== 'true'
  );
}

type SeedAuditStatus = 'attempt' | 'success' | 'blocked' | 'error';

interface SeedAuditParams {
  request: NextRequest;
  auth: AuthContext;
  route: string;
  method: string;
  status: SeedAuditStatus;
  details?: Record<string, unknown>;
}

export async function logSeedExecution({
  request,
  auth,
  route,
  method,
  status,
  details,
}: SeedAuditParams): Promise<void> {
  const payload = {
    route,
    method,
    status,
    user_id: auth.uid,
    user_email: auth.email || null,
    role: auth.role,
    organization_id: auth.organizationId || null,
    node_env: process.env.NODE_ENV || 'unknown',
    ip:
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    details: details ?? null,
    executed_at: new Date().toISOString(),
  };

  try {
    const db = getAdminFirestore();
    await db.collection(SEED_AUDIT_COLLECTION).add(payload);
  } catch (error) {
    console.error('[seedSecurity] No se pudo guardar auditoria seed:', error);
    console.log('[seedSecurity] payload fallback:', payload);
  }
}
