import { getAdminFirestore } from '@/lib/firebase/admin';
import type { SystemLogCreateInput } from '@/types/systemLog';

const SYSTEM_LOGS_COLLECTION = 'system_logs';

/**
 * Escribe un log de sistema en Firestore.
 * Silencia errores para no romper el flujo principal si falla.
 */
export async function writeSystemLog(input: SystemLogCreateInput): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db.collection(SYSTEM_LOGS_COLLECTION).add({
      ...input,
      organization_id: input.organization_id ?? null,
      user_id: input.user_id ?? null,
      details: input.details ?? {},
      created_at: new Date(),
    });
  } catch {
    // Silencioso: los logs no deben interrumpir el flujo principal
  }
}
