import { db } from '@/firebase/config';
import {
  ProcessDefinition,
  ProcessDefinitionFormData,
} from '@/types/processRecords';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

const COLLECTION_NAME = 'processDefinitions';

export class ProcessDefinitionService {
  /**
   * Generate auto code for new process definition
   * Uses simple count query to avoid index requirements
   */
  private static async generateAutoCode(): Promise<string> {
    try {
      // Simple query without orderBy to avoid index requirement
      const q = query(collection(db, COLLECTION_NAME));
      const snapshot = await getDocs(q);
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
      // Generar código automático si no se proporciona
      const codigo = data.codigo || (await this.generateAutoCode());

      // Establecer valores por defecto para campos opcionales
      const docData = {
        codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        objetivo: data.objetivo || '',
        alcance: data.alcance || '',
        funciones_involucradas: data.funciones_involucradas || [],
        categoria: data.categoria || 'calidad',
        documento_origen_id: data.documento_origen_id || null,
        puesto_responsable_id: data.puesto_responsable_id || null,
        jefe_proceso_id: data.jefe_proceso_id || null,
        jefe_proceso_nombre: data.jefe_proceso_nombre || null,
        etapas_default: data.etapas_default || [
          'Planificación',
          'Ejecución',
          'Verificación',
          'Cierre',
        ],
        activo: data.activo ?? true,
        organization_id: data.organization_id || null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

      return docRef.id;
    } catch (error) {
      console.error('Error creating process definition:', error);
      throw new Error('Failed to create process definition');
    }
  }

  /**
   * Get process definition by ID
   */
  static async getById(id: string): Promise<ProcessDefinition | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
      } as ProcessDefinition;
    } catch (error) {
      console.error('Error getting process definition:', error);
      throw new Error('Failed to get process definition');
    }
  }

  /**
   * Get process definition by ID with document and position relations
   */
  static async getByIdWithDocument(id: string): Promise<
    | (ProcessDefinition & {
        documento?: { id: string; [key: string]: unknown };
        puesto?: { id: string; [key: string]: unknown };
      })
    | null
  > {
    const definition = await this.getById(id);
    if (!definition) return null;

    const result: ProcessDefinition & {
      documento?: { id: string; [key: string]: unknown };
      puesto?: { id: string; [key: string]: unknown };
    } = { ...definition };

    // Load document if exists
    if (definition.documento_origen_id) {
      const docRef = doc(db, 'documents', definition.documento_origen_id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        result.documento = { id: docSnap.id, ...docSnap.data() };
      }
    }

    // Load position if exists
    if (definition.puesto_responsable_id) {
      const posRef = doc(db, 'positions', definition.puesto_responsable_id);
      const posSnap = await getDoc(posRef);
      if (posSnap.exists()) {
        result.puesto = { id: posSnap.id, ...posSnap.data() };
      }
    }

    return result;
  }

  /**
   * Get all active process definitions
   */
  static async getAllActive(): Promise<ProcessDefinition[]> {
    try {
      // Get all and filter in memory to avoid index requirement
      const q = query(collection(db, COLLECTION_NAME));
      const querySnapshot = await getDocs(q);

      const allDefs = querySnapshot.docs.map(doc => {
        const data = doc.data();

        // Map fields - support both Spanish and English field names
        const mapped = {
          id: doc.id,
          codigo: data.codigo || data.code || '',
          nombre: data.nombre || data.name || '',
          descripcion: data.descripcion || data.description || '',
          objetivo: data.objetivo || data.objective || '',
          alcance: data.alcance || data.scope || '',
          funciones_involucradas: data.funciones_involucradas || [],
          categoria: data.categoria || data.category || '',
          etapas_default: data.etapas_default || [],
          activo: data.activo === true || data.status === 'activo',
          documento_origen_id: data.documento_origen_id || null,
          puesto_responsable_id: data.puesto_responsable_id || null,
          jefe_proceso_id: data.jefe_proceso_id || null,
          jefe_proceso_nombre: data.jefe_proceso_nombre || null,
          created_at:
            data.created_at?.toDate?.() ||
            data.createdAt?.toDate?.() ||
            new Date(),
          updated_at:
            data.updated_at?.toDate?.() ||
            data.updatedAt?.toDate?.() ||
            new Date(),
        } as ProcessDefinition;

        return mapped;
      });

      // Filter active and sort by name
      return allDefs
        .filter(def => def.activo === true)
        .filter(def => def.nombre) // Ensure nombre exists
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch (error) {
      console.error('Error getting process definitions:', error);
      throw new Error('Failed to get process definitions');
    }
  }

  /**
   * Get all process definitions
   */
  static async getAll(): Promise<ProcessDefinition[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('nombre', 'asc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as ProcessDefinition;
      });
    } catch (error) {
      console.error('Error getting all process definitions:', error);
      throw new Error('Failed to get process definitions');
    }
  }

  /**
   * Update process definition
   */
  static async update(
    id: string,
    data: Partial<ProcessDefinitionFormData>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating process definition:', error);
      throw new Error('Failed to update process definition');
    }
  }

  /**
   * Delete process definition
   */
  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting process definition:', error);
      throw new Error('Failed to delete process definition');
    }
  }

  /**
   * Seed default process definitions
   */
  static async seedDefaults(): Promise<void> {
    try {
      const defaults: ProcessDefinitionFormData[] = [
        {
          codigo: 'PROC-001',
          nombre: 'Gestión de Calidad',
          descripcion: 'Proceso estándar de gestión de calidad ISO 9001',
          objetivo:
            'Asegurar la calidad de productos y servicios mediante procesos estandarizados',
          alcance:
            'Todos los procesos de la organización relacionados con la calidad',
          funciones_involucradas: [
            'Dirección',
            'Gestión de Calidad',
            'Operaciones',
          ],
          categoria: 'calidad',
          etapas_default: [
            'Planificación',
            'Ejecución',
            'Verificación',
            'Cierre',
          ],
          activo: true,
        },
        {
          codigo: 'PROC-002',
          nombre: 'Auditoría Interna',
          descripcion: 'Proceso de auditoría interna del sistema de gestión',
          objetivo:
            'Verificar el cumplimiento del sistema de gestión de calidad',
          alcance: 'Todos los procesos y áreas de la organización',
          funciones_involucradas: ['Auditoría', 'Gestión de Calidad'],
          categoria: 'auditoria',
          etapas_default: [
            'Preparación',
            'Ejecución',
            'Informe',
            'Seguimiento',
          ],
          activo: true,
        },
        {
          codigo: 'PROC-003',
          nombre: 'Mejora Continua',
          descripcion: 'Proceso de mejora continua del sistema',
          objetivo: 'Implementar mejoras continuas en todos los procesos',
          alcance: 'Todos los procesos identificados en el sistema de gestión',
          funciones_involucradas: [
            'Dirección',
            'Gestión de Calidad',
            'Operaciones',
          ],
          categoria: 'mejora',
          etapas_default: [
            'Identificación',
            'Análisis',
            'Implementación',
            'Evaluación',
          ],
          activo: true,
        },
      ];

      for (const def of defaults) {
        await this.create(def);
      }
    } catch (error) {
      console.error('Error seeding defaults:', error);
      throw new Error('Failed to seed defaults');
    }
  }
}
