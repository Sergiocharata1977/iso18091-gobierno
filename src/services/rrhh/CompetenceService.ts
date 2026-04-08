import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  Competence,
  CompetenceFilters,
  CompetenceFormData,
  PaginatedResponse,
} from '@/types/rrhh';

// Get Firestore instance from Admin SDK (bypasses security rules)
const getDb = () => getAdminFirestore();

export class CompetenceService {
  private collectionName = 'competencias';

  async getAll(
    organizationId: string,
    categoria?: string | null,
    search?: string | null
  ): Promise<Competence[]> {
    try {
      const db = getDb();

      // Fetch all active competencias for the organization
      const snapshot = await db
        .collection(this.collectionName)
        .where('organization_id', '==', organizationId)
        .where('activo', '==', true)
        .get();

      let competences = snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Competence
      );

      // Filter by category if specified
      if (categoria && categoria !== 'all') {
        competences = competences.filter(c => c.categoria === categoria);
      }

      // Filter by search if exists
      if (search) {
        const searchLower = search.toLowerCase();
        competences = competences.filter(
          c =>
            c.nombre.toLowerCase().includes(searchLower) ||
            c.descripcion?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by name in memory
      competences.sort((a, b) =>
        (a.nombre || '').localeCompare(b.nombre || '')
      );

      return competences;
    } catch (error) {
      console.error('Error al obtener competencias:', error);
      throw new Error('No se pudieron cargar las competencias');
    }
  }

  async getById(id: string): Promise<Competence | null> {
    try {
      const db = getDb();
      const docSnap = await db.collection(this.collectionName).doc(id).get();

      if (docSnap.exists) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as Competence;
      }

      return null;
    } catch (error) {
      console.error('Error al obtener competencia:', error);
      throw error;
    }
  }

  async getPaginated(
    filters: CompetenceFilters,
    page: number = 1,
    limitCount: number = 10
  ): Promise<PaginatedResponse<Competence>> {
    try {
      const db = getDb();
      let queryRef: FirebaseFirestore.Query = db.collection(
        this.collectionName
      );

      // Aplicar filtros
      if (filters.organization_id) {
        queryRef = queryRef.where(
          'organization_id',
          '==',
          filters.organization_id
        );
      }

      if (filters.activo !== undefined) {
        queryRef = queryRef.where('activo', '==', filters.activo);
      }

      if (filters.categoria) {
        queryRef = queryRef.where('categoria', '==', filters.categoria);
      }

      // Ordenamiento
      queryRef = queryRef.orderBy('nombre', 'asc');

      // Paginación
      queryRef = queryRef.limit(limitCount);

      const snapshot = await queryRef.get();
      const data = snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Competence
      );

      // Para este ejemplo, calculamos total aproximado
      let totalQueryRef: FirebaseFirestore.Query = db.collection(
        this.collectionName
      );
      if (filters.organization_id) {
        totalQueryRef = totalQueryRef.where(
          'organization_id',
          '==',
          filters.organization_id
        );
      }
      const totalSnapshot = await totalQueryRef.get();

      return {
        data,
        pagination: {
          page,
          limit: limitCount,
          total: totalSnapshot.size,
          totalPages: Math.ceil(totalSnapshot.size / limitCount),
          hasNext: page * limitCount < totalSnapshot.size,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('Error al obtener competencias paginadas:', error);
      throw error;
    }
  }

  async getByCategory(
    organizationId: string,
    categoria: string
  ): Promise<Competence[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(this.collectionName)
        .where('organization_id', '==', organizationId)
        .where('categoria', '==', categoria)
        .where('activo', '==', true)
        .get();

      return snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Competence
      );
    } catch (error) {
      console.error('Error al obtener competencias por categoría:', error);
      throw error;
    }
  }

  async getByPuesto(puestoId: string): Promise<Competence[]> {
    try {
      const db = getDb();
      const positionDoc = await db.collection('positions').doc(puestoId).get();

      if (!positionDoc.exists) {
        throw new Error('Puesto no encontrado');
      }

      const position = positionDoc.data();
      const competenceIds = position?.competenciasRequeridas || [];

      if (competenceIds.length === 0) {
        return [];
      }

      // Obtenemos las competencias
      const competencePromises = competenceIds.map((id: string) =>
        this.getById(id)
      );
      const competences = await Promise.all(competencePromises);

      return competences.filter((comp): comp is Competence => comp !== null);
    } catch (error) {
      console.error('Error al obtener competencias por puesto:', error);
      throw error;
    }
  }

  async create(data: CompetenceFormData): Promise<Competence> {
    try {
      // Validar que venga organization_id (multi-tenant)
      if (!data.organization_id) {
        throw new Error('organization_id es requerido');
      }

      const db = getDb();
      const competenceData = {
        ...data,
        activo: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const docRef = await db
        .collection(this.collectionName)
        .add(competenceData);

      return {
        id: docRef.id,
        ...competenceData,
      } as Competence;
    } catch (error) {
      console.error('Error al crear competencia:', error);
      throw new Error('No se pudo crear la competencia');
    }
  }

  async update(id: string, data: Partial<CompetenceFormData>): Promise<void> {
    try {
      const db = getDb();
      const updateData = {
        ...data,
        updated_at: new Date(),
      };

      await db.collection(this.collectionName).doc(id).update(updateData);
    } catch (error) {
      console.error('Error al actualizar competencia:', error);
      throw new Error('No se pudo actualizar la competencia');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const canDelete = await this.validateCanDelete(id);

      if (!canDelete) {
        throw new Error(
          'No se puede eliminar: la competencia está asignada a uno o más puestos'
        );
      }

      const db = getDb();
      await db.collection(this.collectionName).doc(id).delete();
    } catch (error) {
      console.error('Error al eliminar competencia:', error);
      throw error;
    }
  }

  async validateCanDelete(competenceId: string): Promise<boolean> {
    try {
      const db = getDb();
      // Verificar si está asignada a algún puesto
      const snapshot = await db
        .collection('positions')
        .where('competenciasRequeridas', 'array-contains', competenceId)
        .get();

      return snapshot.empty; // true si NO está asignada
    } catch (error) {
      console.error('Error al validar eliminación:', error);
      return false;
    }
  }
}

export const competenceService = new CompetenceService();
