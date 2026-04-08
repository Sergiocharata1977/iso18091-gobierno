/**
 * Servicio de Trazabilidad para Sugerencias IA
 *
 * Registra las sugerencias de IA aplicadas para:
 * - Auditoría ISO 9001 (evidencia de uso de herramientas)
 * - Análisis de efectividad de las sugerencias
 * - Debug y mejora continua
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface AISuggestionLog {
  id?: string;
  organizationId: string;
  userId: string;
  userName?: string;

  // Contexto de la sugerencia
  modulo: 'procesos' | 'documentos' | 'rrhh' | 'mejoras';
  tipo: string; // 'proceso', 'procedimiento', 'competencias', etc.
  entityId?: string; // ID del proceso/documento afectado
  entityName?: string;

  // Detalle de la sugerencia
  mode: 'name' | 'full' | 'section';
  inputContext?: Record<string, any>;
  outputPreview?: string; // Primeros 200 caracteres del output
  outputHash?: string;

  // Resultado
  camposAplicados: string[];
  aplicadoCompleto: boolean;

  // Metadata
  createdAt: Date;
  isoProcessDetected?: string; // Si se detectó un proceso ISO clásico
}

/**
 * Registra una sugerencia de IA aplicada
 */
export async function logAISuggestion(
  log: Omit<AISuggestionLog, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const db = getAdminFirestore();
    const logData = {
      ...log,
      createdAt: FieldValue.serverTimestamp(),
      outputPreview: log.outputPreview?.substring(0, 200),
    };

    const docRef = await db
      .collection('organizations')
      .doc(log.organizationId)
      .collection('ai_suggestion_logs')
      .add(logData);

    return docRef.id;
  } catch (error) {
    console.error('Error logging AI suggestion:', error);
    return '';
  }
}

/**
 * Obtiene el historial de sugerencias para una entidad específica
 */
export async function getEntitySuggestionHistory(
  organizationId: string,
  entityId: string,
  limit: number = 10
): Promise<AISuggestionLog[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('ai_suggestion_logs')
      .where('entityId', '==', entityId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as AISuggestionLog[];
  } catch (error) {
    console.error('Error getting suggestion history:', error);
    return [];
  }
}

/**
 * Obtiene estadísticas de uso de IA para una organización
 */
export async function getAISuggestionStats(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  total: number;
  porModulo: Record<string, number>;
  porTipo: Record<string, number>;
  tasaAplicacion: number;
}> {
  try {
    const db = getAdminFirestore();
    let query = db
      .collection('organizations')
      .doc(organizationId)
      .collection('ai_suggestion_logs')
      .orderBy('createdAt', 'desc');

    if (startDate) {
      query = query.where('createdAt', '>=', startDate);
    }
    if (endDate) {
      query = query.where('createdAt', '<=', endDate);
    }

    const snapshot = await query.limit(1000).get();
    const logs = snapshot.docs.map(doc => doc.data());

    const porModulo: Record<string, number> = {};
    const porTipo: Record<string, number> = {};
    let aplicadosCompleto = 0;

    logs.forEach(log => {
      porModulo[log.modulo] = (porModulo[log.modulo] || 0) + 1;
      porTipo[log.tipo] = (porTipo[log.tipo] || 0) + 1;
      if (log.aplicadoCompleto) aplicadosCompleto++;
    });

    return {
      total: logs.length,
      porModulo,
      porTipo,
      tasaAplicacion:
        logs.length > 0 ? (aplicadosCompleto / logs.length) * 100 : 0,
    };
  } catch (error) {
    console.error('Error getting AI stats:', error);
    return { total: 0, porModulo: {}, porTipo: {}, tasaAplicacion: 0 };
  }
}
