// src/services/processRecords/ProcessDefinitionServiceAdmin.ts
// Admin SDK version for server-side operations (API routes)

import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  createEmptySIPOC,
  ProcessDefinition,
  ProcessDefinitionFormData,
  ProcessSIPOC,
} from '@/types/processes-unified';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'processDefinitions';

export class ProcessDefinitionServiceAdmin {
  /**
   * Generate auto code for new process definition
   */
  private static async generateAutoCode(): Promise<string> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db.collection(COLLECTION_NAME).get();
      const nextNumber = snapshot.size + 1;
      return `PROC-${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating auto code:', error);
      // Fallback to timestamp-based code
      return `PROC-${Date.now().toString(36).toUpperCase()}`;
    }
  }

  /**
   * Create a new process definition
   * Solo nombre es requerido, todo lo demás tiene valores por defecto
   */
  static async create(data: ProcessDefinitionFormData): Promise<string> {
    try {
      const db = getAdminFirestore();

      // Generar código automático si no se proporciona
      const processCode = data.process_code || (await this.generateAutoCode());

      const now = Timestamp.now();
      const legacyData = data as any;

      // Establecer valores por defecto para campos opcionales
      const docData: Omit<ProcessDefinition, 'id'> = {
        // Campos ISO 9001
        category_id: data.category_id || 3, // Por defecto Operativo (3)
        // categoria: 'operativo', // Eliminado en tipo unificado, usar category_id
        process_code: processCode,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        objetivo: data.objetivo || '',
        alcance: data.alcance || '',
        funciones_involucradas: data.funciones_involucradas || [],
        related_norm_points: data.related_norm_points || [],

        // SIPOC (Nuevo)
        sipoc:
          data.sipoc && typeof data.sipoc === 'object'
            ? (data.sipoc as any)
            : createEmptySIPOC(),
        descripcion_detallada: data.descripcion_detallada || '',

        // Responsables
        documento_origen_id: data.documento_origen_id || null,
        // puesto_responsable_id: data.puesto_responsable_id || null, // legacy mapped to owner_position_id?
        owner_position_id:
          data.owner_position_id || legacyData.puesto_responsable_id || null,
        jefe_proceso_id: data.jefe_proceso_id || null,
        jefe_proceso_nombre: legacyData.jefe_proceso_nombre || null,
        departamento_responsable_id: data.departamento_responsable_id || null,
        departamento_responsable_nombre:
          data.departamento_responsable_nombre || null,

        etapas_default: data.etapas_default || [
          'Planificación',
          'Ejecución',
          'Verificación',
          'Cierre',
        ],

        status: data.status || 'draft',
        activo: data.activo ?? true,
        organization_id: data.organization_id || '',

        // Campos de versionado - primera versión
        version: '1.0',
        version_number: 1,
        vigente: true,
        version_anterior_id: null,

        // Campos de documentos y registros
        documentos_ids: [],
        tipo_registros: data.tipo_registros || 'crear',
        modulo_vinculado: data.modulo_vinculado || null,

        created_by: 'system', // TODO: get from auth context if needed
        created_at: now.toDate(),
        updated_by: 'system',
        updated_at: now.toDate(),
      };

      const docRef = await db.collection(COLLECTION_NAME).add(docData);

      console.log('[ProcessDefinitionServiceAdmin] Created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating process definition (Admin):', error);
      throw new Error('Failed to create process definition');
    }
  }

  /**
   * Get all active process definitions
   */
  static async getAllActive(
    organizationId?: string
  ): Promise<ProcessDefinition[]> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db.collection(COLLECTION_NAME).get();

      const allDefs = snapshot.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          // Campos ISO 9001
          category_id: data.category_id || 3,
          process_code: data.process_code || data.codigo || '',
          nombre: data.nombre || data.name || '',
          descripcion: data.descripcion || data.description || '',
          objetivo: data.objetivo || data.objective || '',
          alcance: data.alcance || data.scope || '',
          funciones_involucradas: data.funciones_involucradas || [],
          related_norm_points: data.related_norm_points || [],

          sipoc: data.sipoc || createEmptySIPOC(),
          descripcion_detallada: data.descripcion_detallada || '',

          etapas_default: data.etapas_default || [],
          activo:
            data.activo === true ||
            data.status === 'activo' ||
            data.activo === undefined,
          status: data.status || (data.activo ? 'active' : 'draft'),

          documento_origen_id: data.documento_origen_id || null,
          owner_position_id:
            data.owner_position_id || data.puesto_responsable_id || null,
          jefe_proceso_id: data.jefe_proceso_id || null,
          jefe_proceso_nombre: data.jefe_proceso_nombre || null,
          departamento_responsable_id:
            data.departamento_responsable_id || null,
          departamento_responsable_nombre:
            data.departamento_responsable_nombre || null,
          organization_id: data.organization_id || '',

          // Campos de versionado
          version: data.version?.toString() || '1.0',
          version_number: typeof data.version === 'number' ? data.version : 1,
          vigente: data.vigente ?? true,
          version_anterior_id: data.version_anterior_id || null,

          // Campos de documentos y registros
          documentos_ids: data.documentos_ids || [],
          tipo_registros: data.tipo_registros || 'crear',
          modulo_vinculado: data.modulo_vinculado || null,

          created_at: data.created_at?.toDate?.() || new Date(),
          updated_at: data.updated_at?.toDate?.() || new Date(),
          created_by: data.created_by || 'system',
          updated_by: data.updated_by || 'system',
        } as ProcessDefinition;
      });

      // Filter active, vigente and by organization if provided
      return allDefs
        .filter(def => def.activo === true) // Check base activo flag
        .filter(def => def.vigente !== false) // Include vigente=true or undefined
        .filter(def => def.nombre)
        .filter(
          def => !organizationId || def.organization_id === organizationId
        )
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch (error) {
      console.error('Error getting process definitions (Admin):', error);
      throw new Error('Failed to get process definitions');
    }
  }

  /**
   * Get process definition by ID with relationships
   */
  static async getByIdWithRelations(
    id: string
  ): Promise<ProcessDefinition | null> {
    try {
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      const data = docSnap.data()!;
      return {
        id: docSnap.id,
        // Campos ISO 9001
        category_id: data.category_id || 3,
        process_code: data.process_code || data.codigo || '',
        nombre: data.nombre || '',
        descripcion: data.descripcion || '',
        objetivo: data.objetivo || '',
        alcance: data.alcance || '',
        funciones_involucradas: data.funciones_involucradas || [],
        related_norm_points: data.related_norm_points || [],

        sipoc: data.sipoc || createEmptySIPOC(),
        descripcion_detallada: data.descripcion_detallada || '',

        etapas_default: data.etapas_default || [],

        status: data.status || 'draft',
        activo: data.activo ?? true,

        documento_origen_id: data.documento_origen_id || null,
        owner_position_id:
          data.owner_position_id || data.puesto_responsable_id || null,
        jefe_proceso_id: data.jefe_proceso_id || null,
        jefe_proceso_nombre: data.jefe_proceso_nombre || null,
        departamento_responsable_id: data.departamento_responsable_id || null,
        departamento_responsable_nombre:
          data.departamento_responsable_nombre || null,
        organization_id: data.organization_id || '',

        // Campos de versionado
        version: data.version?.toString() || '1.0',
        version_number: typeof data.version === 'number' ? data.version : 1,
        vigente: data.vigente ?? true,
        version_anterior_id: data.version_anterior_id || null,

        // Campos de documentos y registros
        documentos_ids: data.documentos_ids || [],
        tipo_registros: data.tipo_registros || 'crear',
        modulo_vinculado: data.modulo_vinculado || null,

        created_at: data.created_at?.toDate?.() || new Date(),
        updated_at: data.updated_at?.toDate?.() || new Date(),
        created_by: data.created_by || 'system',
        updated_by: data.updated_by || 'system',
      } as ProcessDefinition;
    } catch (error) {
      console.error('Error getting process definition by ID (Admin):', error);
      throw new Error('Failed to get process definition');
    }
  }

  /**
   * Update process definition
   * Auto-generates codigo when category_id or process_code are updated
   */
  static async update(
    id: string,
    data: Partial<ProcessDefinitionFormData>
  ): Promise<void> {
    try {
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(id);

      // Si se actualizan los campos ISO, regenerar el código
      const updateData: Record<string, unknown> = { ...data };

      if (data.category_id || data.process_code) {
        // Obtener valores actuales si no se proporcionan
        const currentDoc = await docRef.get();
        const currentData = currentDoc.data() || {};

        const categoryId = data.category_id || currentData.category_id;
        const processCode = data.process_code || currentData.process_code;

        // updateData.codigo = ... (Deprecated, use process_code directly)
      }

      // Clean up legacy keys if they creep in from data "any" casting
      delete (updateData as any).codigo;
      delete (updateData as any).categoria;

      await docRef.update({
        ...updateData,
        updated_at: Timestamp.now(),
      });

      console.log('[ProcessDefinitionServiceAdmin] Updated:', id);
    } catch (error) {
      console.error('Error updating process definition (Admin):', error);
      throw new Error('Failed to update process definition');
    }
  }

  /**
   * Publicar nueva versión del proceso
   * Crea una copia del proceso actual como nueva versión vigente
   * Marca la versión anterior como no vigente
   */
  static async publicarNuevaVersion(
    id: string,
    cambios: Partial<ProcessDefinitionFormData>
  ): Promise<string> {
    try {
      const db = getAdminFirestore();
      const now = Timestamp.now();

      // Obtener el proceso actual
      const currentDoc = await this.getByIdWithRelations(id);
      if (!currentDoc) {
        throw new Error('Proceso no encontrado');
      }

      // Marcar versión actual como no vigente
      await db.collection(COLLECTION_NAME).doc(id).update({
        vigente: false,
        updated_at: now,
      });

      // Crear nueva versión con los cambios
      // Manejar el incremento de versión
      const nextVersionNumber = (currentDoc.version_number || 1) + 1;
      const nextVersionString = `${nextVersionNumber}.0`;

      const legacyCambios = cambios as any;

      const newDocData: Omit<ProcessDefinition, 'id'> = {
        // Campos ISO 9001
        category_id: cambios.category_id || currentDoc.category_id,
        process_code: cambios.process_code || currentDoc.process_code,
        // codigo: ... (Deprecated)

        nombre: cambios.nombre || currentDoc.nombre,
        descripcion: cambios.descripcion ?? currentDoc.descripcion,
        objetivo: cambios.objetivo ?? currentDoc.objetivo,
        alcance: cambios.alcance ?? currentDoc.alcance,
        funciones_involucradas:
          cambios.funciones_involucradas || currentDoc.funciones_involucradas,
        related_norm_points:
          cambios.related_norm_points || currentDoc.related_norm_points || [],

        // SIPOC
        sipoc: cambios.sipoc
          ? ({
              ...createEmptySIPOC(),
              ...(currentDoc.sipoc || {}),
              ...cambios.sipoc,
            } as ProcessSIPOC)
          : currentDoc.sipoc || createEmptySIPOC(),
        descripcion_detallada:
          cambios.descripcion_detallada ?? currentDoc.descripcion_detallada,

        etapas_default: cambios.etapas_default || currentDoc.etapas_default,

        status: cambios.status || currentDoc.status,
        activo: cambios.activo ?? currentDoc.activo,
        organization_id: currentDoc.organization_id, // Organization ID shouldn't change

        // Responsables
        documento_origen_id:
          cambios.documento_origen_id ?? currentDoc.documento_origen_id,
        owner_position_id:
          cambios.owner_position_id ||
          legacyCambios.puesto_responsable_id ||
          currentDoc.owner_position_id,
        // Legacy responsibles mapped to null if not present in FormData
        jefe_proceso_id:
          cambios.jefe_proceso_id ?? currentDoc.jefe_proceso_id ?? null,
        jefe_proceso_nombre:
          legacyCambios.jefe_proceso_nombre ??
          currentDoc.jefe_proceso_nombre ??
          null,
        departamento_responsable_id:
          cambios.departamento_responsable_id ??
          currentDoc.departamento_responsable_id ??
          null,
        departamento_responsable_nombre:
          cambios.departamento_responsable_nombre ??
          currentDoc.departamento_responsable_nombre ??
          null,

        // Versionado
        version: nextVersionString,
        version_number: nextVersionNumber,
        vigente: true,
        version_anterior_id: id,

        // Documentos y registros
        documentos_ids: currentDoc.documentos_ids || [], // FormData doesn't have docs
        tipo_registros:
          cambios.tipo_registros || currentDoc.tipo_registros || 'crear',
        modulo_vinculado:
          cambios.modulo_vinculado ?? currentDoc.modulo_vinculado,

        created_by: 'system',
        created_at: now.toDate(),
        updated_by: 'system',
        updated_at: now.toDate(),
      };

      const newDocRef = await db.collection(COLLECTION_NAME).add(newDocData);

      console.log(
        `[ProcessDefinitionServiceAdmin] Nueva versión ${nextVersionString} creada:`,
        newDocRef.id
      );
      return newDocRef.id;
    } catch (error) {
      console.error('Error publicando nueva versión (Admin):', error);
      throw new Error('Failed to publish new version');
    }
  }

  /**
   * Obtener historial de versiones de un proceso
   */
  static async getVersionHistory(
    procesoId: string
  ): Promise<ProcessDefinition[]> {
    try {
      const db = getAdminFirestore();
      const versions: ProcessDefinition[] = [];

      // Start with the given process
      let currentId: string | null = procesoId;

      // Get current process
      const current = await this.getByIdWithRelations(procesoId);
      if (current) {
        versions.push(current);

        // Follow version_anterior_id chain
        currentId = current.version_anterior_id || null;

        while (currentId) {
          const prevVersion = await this.getByIdWithRelations(currentId);
          if (prevVersion) {
            versions.push(prevVersion);
            currentId = prevVersion.version_anterior_id || null;
          } else {
            break;
          }
        }
      }

      return versions.sort(
        (a, b) => (b.version_number || 0) - (a.version_number || 0)
      );
    } catch (error) {
      console.error('Error getting version history (Admin):', error);
      throw new Error('Failed to get version history');
    }
  }
}
