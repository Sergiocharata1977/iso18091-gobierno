/**
 * Document Integration Service
 * Servicio centralizado para manejo documental en todos los módulos
 *
 * @version 2.1 - Refactorizado para usar SDK cliente correctamente
 *
 * NOTA: Este servicio fue simplificado temporalmente.
 * Las funciones de transacciones atómicas serán reimplementadas
 * cuando se configure Firebase Admin SDK correctamente.
 */

import { db } from '@/lib/firebase';
import {
  DocumentLinkContext,
  DocumentLinkType,
  DocumentModule,
  DocumentReference,
} from '@/types/documents';
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

const REFERENCES_COLLECTION = 'document_references';

/**
 * Servicio de Integración Documental
 * Actúa como "enchufe" para todos los módulos del sistema
 */
export class DocumentIntegrationService {
  // ============================================
  // CONSULTAR DOCUMENTOS
  // ============================================

  /**
   * Obtiene todos los documentos vinculados a una entidad
   */
  static async getDocumentsByRecord(
    module: DocumentModule,
    recordId: string,
    linkType?: DocumentLinkType
  ): Promise<DocumentReference[]> {
    try {
      let q = query(
        collection(db, REFERENCES_COLLECTION),
        where('source_module', '==', module),
        where('linked_record_id', '==', recordId)
      );

      if (linkType) {
        q = query(q, where('link_type', '==', linkType));
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
        locked_at: doc.data().locked_at?.toDate(),
      })) as DocumentReference[];
    } catch (error) {
      console.error(
        '[DocumentIntegrationService] Error en getDocumentsByRecord:',
        error
      );
      throw new Error('Error al obtener documentos');
    }
  }

  /**
   * Obtiene todas las entidades vinculadas a un documento
   */
  static async getLinkedRecords(
    documentId: string
  ): Promise<DocumentLinkContext[]> {
    try {
      const q = query(
        collection(db, REFERENCES_COLLECTION),
        where('document_id', '==', documentId)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          module: data.source_module,
          recordId: data.linked_record_id,
          linkType: data.link_type,
          tag: data.tag,
          metadata: data.metadata,
        } as DocumentLinkContext;
      });
    } catch (error) {
      console.error(
        '[DocumentIntegrationService] Error en getLinkedRecords:',
        error
      );
      throw new Error('Error al obtener registros vinculados');
    }
  }

  // ============================================
  // BLOQUEO ISO 9001
  // ============================================

  /**
   * Bloquea todas las referencias de una entidad
   */
  static async lockReferences(
    module: DocumentModule,
    recordId: string,
    reason: string,
    userId: string
  ): Promise<number> {
    try {
      const refsQuery = query(
        collection(db, REFERENCES_COLLECTION),
        where('source_module', '==', module),
        where('linked_record_id', '==', recordId)
      );

      const refs = await getDocs(refsQuery);
      const batch = writeBatch(db);

      refs.forEach(refDoc => {
        batch.update(refDoc.ref, {
          is_locked: true,
          lock_reason: reason,
          locked_at: Timestamp.now(),
          locked_by: userId,
        });
      });

      await batch.commit();

      console.log(
        `[DocumentIntegrationService] ${refs.size} referencias bloqueadas`
      );
      return refs.size;
    } catch (error) {
      console.error(
        '[DocumentIntegrationService] Error en lockReferences:',
        error
      );
      throw new Error('Error al bloquear referencias');
    }
  }

  /**
   * Desbloquea todas las referencias de una entidad
   */
  static async unlockReferences(
    module: DocumentModule,
    recordId: string,
    userId: string
  ): Promise<number> {
    try {
      const refsQuery = query(
        collection(db, REFERENCES_COLLECTION),
        where('source_module', '==', module),
        where('linked_record_id', '==', recordId),
        where('is_locked', '==', true)
      );

      const refs = await getDocs(refsQuery);
      const batch = writeBatch(db);

      refs.forEach(refDoc => {
        batch.update(refDoc.ref, {
          is_locked: false,
          lock_reason: null,
          locked_at: null,
          locked_by: null,
        });
      });

      await batch.commit();

      console.log(
        `[DocumentIntegrationService] ${refs.size} referencias desbloqueadas`
      );
      return refs.size;
    } catch (error) {
      console.error(
        '[DocumentIntegrationService] Error en unlockReferences:',
        error
      );
      throw new Error('Error al desbloquear referencias');
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Genera un path de Storage estandarizado
   */
  static buildStoragePath(
    organizationId: string,
    module: DocumentModule,
    recordId: string,
    linkType?: DocumentLinkType
  ): string {
    const base = `organizations/${organizationId}`;

    const moduleMap: Record<DocumentModule, string> = {
      audits: 'audits',
      findings: 'findings',
      actions: 'actions',
      rrhh: 'rrhh',
      crm: 'crm/clientes',
      processes: 'processes',
      quality: 'quality',
      mcp: 'mcp/executions',
      vendedor: 'vendedor/visitas',
      documents: 'documents/standalone',
      other: 'other',
    };

    const linkTypeMap: Record<DocumentLinkType, string> = {
      evidence: 'evidence',
      report: 'reports',
      attachment: 'attachments',
      certificate: 'certificates',
      contract: 'contracts',
      invoice: 'invoices',
      photo: 'photos',
      audio: 'audios',
      video: 'videos',
      other: 'other',
    };

    const modulePath = moduleMap[module];
    const linkPath = linkType ? linkTypeMap[linkType] : 'files';

    return `${base}/${modulePath}/${recordId}/${linkPath}`;
  }
}
