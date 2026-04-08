import { db } from '@/firebase/config';
import type { Audit } from '@/types/audits';
import type { Finding } from '@/types/findings';
import { doc, getDoc, runTransaction } from 'firebase/firestore';

/**
 * TraceabilityService
 *
 * Servicio compartido para gestionar la trazabilidad numérica y las cadenas
 * de trazabilidad entre Auditorías, Hallazgos y Acciones.
 */
export class TraceabilityService {
  /**
   * Genera un número secuencial único para una entidad
   * Formato: PREFIX-YYYY-XXX (ej: AUD-2024-001, HAL-2024-001, ACC-2024-001)
   * Los contadores son segregados por organización para multi-tenancy
   *
   * @param prefix - Prefijo del número (AUD, HAL, ACC)
   * @param year - Año para el número
   * @param organizationId - ID de la organización (opcional para compatibilidad)
   * @returns Número único generado
   */
  static async generateNumber(
    prefix: string,
    year: number,
    organizationId?: string
  ): Promise<string> {
    // Si se proporciona organizationId, usar contador por organización
    // Si no, usar contador global (compatibilidad hacia atrás)
    const counterKey = organizationId
      ? `${organizationId}-${prefix}-${year}`
      : `${prefix}-${year}`;
    const counterRef = doc(db, 'counters', counterKey);

    try {
      const number = await runTransaction(db, async transaction => {
        const counterDoc = await transaction.get(counterRef);

        let currentCount = 0;
        if (counterDoc.exists()) {
          currentCount = counterDoc.data().count || 0;
        }

        const newCount = currentCount + 1;

        transaction.set(
          counterRef,
          {
            count: newCount,
            prefix,
            year,
            organization_id: organizationId || null,
            lastUpdated: new Date(),
          },
          { merge: true }
        );

        return newCount;
      });

      // Format: PREFIX-YYYY-XXX (pad with zeros to 3 digits)
      const paddedNumber = String(number).padStart(3, '0');
      return `${prefix}-${year}-${paddedNumber}`;
    } catch (error) {
      console.error('Error generating number:', error);
      throw new Error(`Failed to generate ${prefix} number`);
    }
  }

  /**
   * Construye una cadena de trazabilidad agregando un nuevo ID
   *
   * @param sourceChain - Cadena de trazabilidad del origen
   * @param newId - Nuevo ID a agregar
   * @returns Nueva cadena de trazabilidad
   */
  static buildTraceabilityChain(
    sourceChain: string[],
    newId: string
  ): string[] {
    return [...sourceChain, newId];
  }

  /**
   * Obtiene la auditoría origen desde una acción
   * Navega: Acción → Hallazgo → Auditoría
   *
   * @param actionId - ID de la acción
   * @returns Auditoría origen o null si no existe
   */
  static async getAuditFromAction(actionId: string): Promise<Audit | null> {
    try {
      // Get action
      const actionRef = doc(db, 'actions', actionId);
      const actionDoc = await getDoc(actionRef);

      if (!actionDoc.exists()) {
        return null;
      }

      const action = actionDoc.data();
      const findingId = action.findingId;

      if (!findingId) {
        return null;
      }

      // Get finding
      const findingRef = doc(db, 'findings', findingId);
      const findingDoc = await getDoc(findingRef);

      if (!findingDoc.exists()) {
        return null;
      }

      const finding = findingDoc.data();

      // Check if finding came from an audit
      if (finding.source !== 'audit') {
        return null;
      }

      const auditId = finding.sourceId;

      // Get audit
      const auditRef = doc(db, 'audits', auditId);
      const auditDoc = await getDoc(auditRef);

      if (!auditDoc.exists()) {
        return null;
      }

      return {
        id: auditDoc.id,
        ...auditDoc.data(),
      } as Audit;
    } catch (error) {
      console.error('Error getting audit from action:', error);
      return null;
    }
  }

  /**
   * Obtiene el hallazgo origen desde una acción
   *
   * @param actionId - ID de la acción
   * @returns Hallazgo origen o null si no existe
   */
  static async getFindingFromAction(actionId: string): Promise<Finding | null> {
    try {
      // Get action
      const actionRef = doc(db, 'actions', actionId);
      const actionDoc = await getDoc(actionRef);

      if (!actionDoc.exists()) {
        return null;
      }

      const action = actionDoc.data();
      const findingId = action.findingId;

      if (!findingId) {
        return null;
      }

      // Get finding
      const findingRef = doc(db, 'findings', findingId);
      const findingDoc = await getDoc(findingRef);

      if (!findingDoc.exists()) {
        return null;
      }

      return {
        id: findingDoc.id,
        ...findingDoc.data(),
      } as Finding;
    } catch (error) {
      console.error('Error getting finding from action:', error);
      return null;
    }
  }

  /**
   * Obtiene la auditoría origen desde un hallazgo
   *
   * @param findingId - ID del hallazgo
   * @returns Auditoría origen o null si no existe o no vino de auditoría
   */
  static async getAuditFromFinding(findingId: string): Promise<Audit | null> {
    try {
      // Get finding
      const findingRef = doc(db, 'findings', findingId);
      const findingDoc = await getDoc(findingRef);

      if (!findingDoc.exists()) {
        return null;
      }

      const finding = findingDoc.data();

      // Check if finding came from an audit
      if (finding.source !== 'audit') {
        return null;
      }

      const auditId = finding.sourceId;

      // Get audit
      const auditRef = doc(db, 'audits', auditId);
      const auditDoc = await getDoc(auditRef);

      if (!auditDoc.exists()) {
        return null;
      }

      return {
        id: auditDoc.id,
        ...auditDoc.data(),
      } as Audit;
    } catch (error) {
      console.error('Error getting audit from finding:', error);
      return null;
    }
  }

  /**
   * Valida que la cadena de trazabilidad de una entidad sea correcta
   *
   * @param entityType - Tipo de entidad (audit, finding, action)
   * @param entityId - ID de la entidad
   * @returns true si la trazabilidad es válida
   */
  static async validateTraceability(
    entityType: 'audit' | 'finding' | 'action',
    entityId: string
  ): Promise<boolean> {
    try {
      const entityRef = doc(db, `${entityType}s`, entityId);
      const entityDoc = await getDoc(entityRef);

      if (!entityDoc.exists()) {
        return false;
      }

      const entity = entityDoc.data();
      const chain = entity.traceabilityChain || [];

      // Validate that all IDs in the chain exist
      for (const id of chain) {
        // Try to find the document in any collection
        const collections = ['audits', 'findings', 'actions'];
        let found = false;

        for (const coll of collections) {
          const ref = doc(db, coll, id);
          const docSnap = await getDoc(ref);
          if (docSnap.exists()) {
            found = true;
            break;
          }
        }

        if (!found) {
          console.warn(`Traceability validation failed: ID ${id} not found`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating traceability:', error);
      return false;
    }
  }
}
