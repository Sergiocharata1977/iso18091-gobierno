/**
 * Utilidades para sincronizar roles de usuarios basados en tipo_personal
 */

import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { tipoPersonalToUserRole } from '@/lib/utils/personnel-role-mapping';

/**
 * Mapeo legacy exportado por compatibilidad (evitar usar en código nuevo)
 */
export const TIPO_PERSONAL_TO_ROL = {
  Gerente: 'gerente',
  Directivo: 'gerente',
  Gerencial: 'gerente',
  gerencial: 'gerente',
  Supervisor: 'jefe',
  supervisor: 'jefe',
  Jefe: 'jefe',
  administrativo: 'jefe',
  Administrativo: 'jefe',
  Operativo: 'operario',
  Operario: 'operario',
  técnico: 'operario',
  Tecnico: 'operario',
  Técnico: 'operario',
  ventas: 'operario',
  Ventas: 'operario',
} as const;

/**
 * Obtiene el rol correspondiente a un tipo de personal
 */
export function getRolFromTipoPersonal(tipoPersonal: string): string {
  return tipoPersonalToUserRole(tipoPersonal);
}

/**
 * Sincroniza el rol del usuario vinculado cuando cambia el tipo_personal
 * @param personnelId - ID del personal
 * @param tipoPersonal - Nuevo tipo de personal
 * @returns Promise<void>
 */
export async function syncUserRoleFromPersonnel(
  personnelId: string,
  tipoPersonal: string
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const auth = getAdminAuth();

    console.log(
      '[syncUserRole] Iniciando sincronización para personnel:',
      personnelId,
      'tipo:',
      tipoPersonal
    );

    // Buscar usuario vinculado a este personal
    const usersSnapshot = await db
      .collection('users')
      .where('personnel_id', '==', personnelId)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log('[syncUserRole] No hay usuario vinculado a este personal');
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const currentUserData = userDoc.data();

    // Calcular nuevo rol
    const newRole = getRolFromTipoPersonal(tipoPersonal);
    const currentRole = currentUserData.role || currentUserData.rol;

    console.log(
      '[syncUserRole] Usuario encontrado:',
      userId,
      'rol actual:',
      currentRole,
      'nuevo rol:',
      newRole
    );

    // Si el rol no cambió, no hacer nada
    if (currentRole === newRole) {
      console.log(
        '[syncUserRole] El rol no cambió, no se requiere actualización'
      );
      return;
    }

    // Actualizar rol en Firestore
    await db.collection('users').doc(userId).update({
      role: newRole,
      rol: newRole,
      updated_at: new Date(),
    });

    console.log('[syncUserRole] Rol actualizado en Firestore');

    // Actualizar customClaims en Firebase Auth
    try {
      const user = await auth.getUser(userId);
      const currentClaims = user.customClaims || {};

      await auth.setCustomUserClaims(userId, {
        ...currentClaims,
        role: newRole,
      });

      console.log('[syncUserRole] CustomClaims actualizados en Firebase Auth');
    } catch (authError) {
      console.error(
        '[syncUserRole] Error actualizando customClaims:',
        authError
      );
      // No lanzar error, la actualización en Firestore ya se hizo
    }

    console.log(
      '[syncUserRole] ✅ Sincronización completada:',
      currentRole,
      '→',
      newRole
    );
  } catch (error) {
    console.error('[syncUserRole] Error en sincronización:', error);
    // No lanzar error para no bloquear la actualización del personal
  }
}
