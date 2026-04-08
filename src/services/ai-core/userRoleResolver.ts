import { getAdminFirestore } from '@/lib/firebase/admin';

export type ResolvedUserRole =
  | 'super_admin'
  | 'admin'
  | 'gerente'
  | 'jefe'
  | 'operario'
  | 'auditor';

function normalizeRole(role?: string | null): ResolvedUserRole {
  const r = (role || '').toLowerCase().trim();
  switch (r) {
    case 'supervisor':
      return 'jefe';
    case 'administrador':
    case 'administrator':
      return 'admin';
    case 'manager':
      return 'gerente';
    case 'empleado':
    case 'employee':
      return 'operario';
    case 'super_admin':
    case 'admin':
    case 'gerente':
    case 'jefe':
    case 'operario':
    case 'auditor':
      return r;
    default:
      return 'operario';
  }
}

export class UserRoleResolver {
  static async resolve(userId: string): Promise<ResolvedUserRole> {
    try {
      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return 'operario';
      const data = (userDoc.data() || {}) as Record<string, unknown>;
      const rawRole =
        typeof data.rol === 'string'
          ? data.rol
          : typeof data.role === 'string'
            ? data.role
            : null;
      return normalizeRole(rawRole);
    } catch (error) {
      console.warn('[UserRoleResolver] Falling back to operario:', error);
      return 'operario';
    }
  }
}
