import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  CreateCriterioSchema,
  UpdateCriterioSchema,
  type CreateCriterioInput,
  type UpdateCriterioInput,
} from '@/lib/schemas/crm-clasificacion-schemas';
import type {
  CriterioClasificacion,
  OpcionClasificacion,
} from '@/types/crm-clasificacion';
import type { DocumentData } from 'firebase-admin/firestore';

const COLLECTION = 'crm_clasificacion_criterios';

function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildDefaultOptions(labels: string[]): OpcionClasificacion[] {
  return labels.map((label, index) => ({
    id: `${normalizeSlug(label)}_${index + 1}`,
    label,
    slug: normalizeSlug(label),
    orden: index,
  }));
}

export const CRITERIOS_DEFAULT: CreateCriterioInput[] = [
  {
    nombre: 'Zona',
    slug: 'zona',
    tipo: 'select',
    aplica_a_clientes: true,
    aplica_a_oportunidades: true,
    opciones: buildDefaultOptions([
      'Norte',
      'Sur',
      'Este',
      'Oeste',
      'Centro',
      'Chaco',
      'Córdoba',
      'Santa Fe',
      'Buenos Aires',
      'Otra',
    ]),
  },
  {
    nombre: 'Nivel cliente',
    slug: 'nivel_cliente',
    tipo: 'select',
    aplica_a_clientes: true,
    aplica_a_oportunidades: true,
    opciones: buildDefaultOptions([
      'A - Premium',
      'B - Activo',
      'C - Potencial',
      'D - Inactivo',
    ]),
  },
];

function mapDocToCriterio(
  id: string,
  data: DocumentData
): CriterioClasificacion {
  return {
    id,
    ...data,
  } as CriterioClasificacion;
}

async function getNextOrden(organizationId: string): Promise<number> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .where('organization_id', '==', organizationId)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const maxOrden = snapshot.docs.reduce((currentMax, doc) => {
    const orden = doc.data().orden;
    return typeof orden === 'number' && orden > currentMax ? orden : currentMax;
  }, -1);

  return maxOrden + 1;
}

async function createDefaultsIfEmpty(
  organizationId: string
): Promise<CriterioClasificacion[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .where('organization_id', '==', organizationId)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs
      .map(doc => mapDocToCriterio(doc.id, doc.data()))
      .sort((a, b) => a.orden - b.orden);
  }

  const now = new Date().toISOString();
  const batch = db.batch();
  const created: CriterioClasificacion[] = [];

  CRITERIOS_DEFAULT.forEach((criterioDefault, index) => {
    const parsed = CreateCriterioSchema.parse(criterioDefault);
    const docRef = db.collection(COLLECTION).doc();
    const criterioData = {
      ...parsed,
      organization_id: organizationId,
      activo: true,
      orden: index,
      created_at: now,
      updated_at: now,
      created_by: 'system',
      updated_by: 'system',
    };

    batch.set(docRef, criterioData);
    created.push({
      id: docRef.id,
      ...criterioData,
    });
  });

  await batch.commit();
  return created.sort((a, b) => a.orden - b.orden);
}

export async function listCriterios(
  organizationId: string
): Promise<CriterioClasificacion[]> {
  try {
    const criterios = await createDefaultsIfEmpty(organizationId);

    return criterios
      .filter(criterio => criterio.activo)
      .sort((a, b) => a.orden - b.orden);
  } catch (error) {
    console.error('Error listing active criterios:', error);
    throw new Error('Failed to list criterios');
  }
}

export async function listAllCriterios(
  organizationId: string
): Promise<CriterioClasificacion[]> {
  try {
    const criterios = await createDefaultsIfEmpty(organizationId);
    return criterios.sort((a, b) => a.orden - b.orden);
  } catch (error) {
    console.error('Error listing all criterios:', error);
    throw new Error('Failed to list all criterios');
  }
}

export async function getCriterio(
  organizationId: string,
  criterioId: string
): Promise<CriterioClasificacion | null> {
  try {
    const db = getAdminFirestore();
    const docSnap = await db.collection(COLLECTION).doc(criterioId).get();

    if (!docSnap.exists) {
      return null;
    }

    const criterio = mapDocToCriterio(docSnap.id, docSnap.data() ?? {});
    if (criterio.organization_id !== organizationId) {
      return null;
    }

    return criterio;
  } catch (error) {
    console.error('Error getting criterio:', error);
    throw new Error('Failed to get criterio');
  }
}

export async function createCriterio(
  organizationId: string,
  data: CreateCriterioInput,
  userId: string
): Promise<CriterioClasificacion> {
  try {
    const db = getAdminFirestore();
    const parsed = CreateCriterioSchema.parse(data);
    const now = new Date().toISOString();
    const orden = await getNextOrden(organizationId);

    const criterioData = {
      ...parsed,
      organization_id: organizationId,
      activo: true,
      orden,
      created_at: now,
      updated_at: now,
      created_by: userId,
      updated_by: userId,
    };

    const docRef = await db.collection(COLLECTION).add(criterioData);

    return {
      id: docRef.id,
      ...criterioData,
    };
  } catch (error) {
    console.error('Error creating criterio:', error);
    throw new Error('Failed to create criterio');
  }
}

export async function updateCriterio(
  organizationId: string,
  criterioId: string,
  data: UpdateCriterioInput
): Promise<CriterioClasificacion> {
  try {
    const criterioActual = await getCriterio(organizationId, criterioId);
    if (!criterioActual) {
      throw new Error('Criterio no encontrado');
    }

    const db = getAdminFirestore();
    const parsed = UpdateCriterioSchema.parse(data);
    const updateData = {
      ...parsed,
      updated_at: new Date().toISOString(),
    };

    await db.collection(COLLECTION).doc(criterioId).update(updateData);

    return {
      ...criterioActual,
      ...updateData,
    };
  } catch (error) {
    console.error('Error updating criterio:', error);
    throw new Error('Failed to update criterio');
  }
}

export async function deactivateCriterio(
  organizationId: string,
  criterioId: string
): Promise<void> {
  try {
    const criterioActual = await getCriterio(organizationId, criterioId);
    if (!criterioActual) {
      throw new Error('Criterio no encontrado');
    }

    const db = getAdminFirestore();
    await db.collection(COLLECTION).doc(criterioId).update({
      activo: false,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deactivating criterio:', error);
    throw new Error('Failed to deactivate criterio');
  }
}
