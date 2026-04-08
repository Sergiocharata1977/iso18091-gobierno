/**
 * Servicio de Planificación
 *
 * Maneja las operaciones CRUD para las colecciones plan_*
 * e integración con la colección documents
 */

import { db } from '@/lib/firebase';
import {
  getDefaultPlanData,
  PLAN_COLLECTIONS,
  PLAN_TITULOS,
  PlanBase,
  PlanCollectionType,
} from '@/types/planificacion';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

/**
 * Limpia campos undefined para Firestore
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanData(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = value;
      } else {
        cleaned[key] = '';
      }
    }
  }
  return cleaned;
}

/**
 * Obtiene el registro vigente de un tipo de planificación
 */
export async function getPlanVigente<T extends PlanBase>(
  tipo: PlanCollectionType,
  organizationId: string
): Promise<T | null> {
  const collectionName = PLAN_COLLECTIONS[tipo];

  const q = query(
    collection(db, collectionName),
    where('organization_id', '==', organizationId),
    where('estado', '==', 'vigente')
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  return {
    id: snap.docs[0].id,
    ...snap.docs[0].data(),
  } as T;
}

/**
 * Obtiene el borrador actual o null si no existe
 */
export async function getPlanBorrador<T extends PlanBase>(
  tipo: PlanCollectionType,
  organizationId: string
): Promise<T | null> {
  const collectionName = PLAN_COLLECTIONS[tipo];

  const q = query(
    collection(db, collectionName),
    where('organization_id', '==', organizationId),
    where('estado', '==', 'borrador'),
    orderBy('created_at', 'desc')
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  return {
    id: snap.docs[0].id,
    ...snap.docs[0].data(),
  } as T;
}

/**
 * Crea un nuevo borrador (copiando el vigente si existe)
 */
export async function crearBorrador<T extends PlanBase>(
  tipo: PlanCollectionType,
  organizationId: string,
  userEmail: string
): Promise<T> {
  const collectionName = PLAN_COLLECTIONS[tipo];

  // Buscar vigente actual para copiar datos
  const vigente = await getPlanVigente<T>(tipo, organizationId);

  // Crear nuevo borrador
  const nuevoData = vigente
    ? {
        ...vigente,
        id: undefined, // Se genera automáticamente
        estado: 'borrador' as const,
        version_numero: (vigente.version_numero || 1) + 1,
        created_at: new Date().toISOString(),
        created_by: userEmail,
        updated_at: undefined,
        updated_by: undefined,
      }
    : getDefaultPlanData<T>(tipo, organizationId, userEmail);

  const docRef = await addDoc(
    collection(db, collectionName),
    cleanData(nuevoData as any)
  );

  return {
    id: docRef.id,
    ...nuevoData,
  } as T;
}

/**
 * Guarda cambios en un borrador existente
 */
export async function guardarBorrador<T extends PlanBase>(
  tipo: PlanCollectionType,
  data: T,
  userEmail: string
): Promise<void> {
  const collectionName = PLAN_COLLECTIONS[tipo];

  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
    updated_by: userEmail,
  };

  await setDoc(doc(db, collectionName, data.id), cleanData(updateData as any));
}

/**
 * Marca un borrador como vigente y genera documento oficial
 */
export async function marcarVigente<T extends PlanBase>(
  tipo: PlanCollectionType,
  data: T,
  userEmail: string
): Promise<void> {
  const collectionName = PLAN_COLLECTIONS[tipo];

  // 1. Marcar el anterior vigente como histórico
  const vigenteActual = await getPlanVigente<T>(tipo, data.organization_id);
  if (vigenteActual && vigenteActual.id !== data.id) {
    await setDoc(doc(db, collectionName, vigenteActual.id), {
      ...vigenteActual,
      estado: 'historico',
      updated_at: new Date().toISOString(),
      updated_by: userEmail,
    });
  }

  // 2. Marcar el actual como vigente
  const updateData = {
    ...data,
    estado: 'vigente' as const,
    fecha_vigencia: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: userEmail,
  };

  await setDoc(doc(db, collectionName, data.id), cleanData(updateData as any));

  // 3. Generar documento oficial en la colección documents
  await crearDocumentoOficial(
    tipo,
    updateData,
    data.organization_id,
    userEmail
  );
}

/**
 * Crea un documento oficial en la colección documents
 */
async function crearDocumentoOficial<T extends PlanBase>(
  tipo: PlanCollectionType,
  data: T,
  organizationId: string,
  userEmail: string
): Promise<void> {
  const titulo = PLAN_TITULOS[tipo];

  // Construir contenido legible
  const contenido = Object.entries(data)
    .filter(
      ([key]) =>
        ![
          'id',
          'organization_id',
          'estado',
          'version_numero',
          'created_at',
          'created_by',
          'updated_at',
          'updated_by',
          'reunion_id',
          'reunion_nombre',
          'fecha_vigencia',
        ].includes(key)
    )
    .map(
      ([key, value]) =>
        `**${key.replace(/_/g, ' ').toUpperCase()}:**\n${value || '(No definido)'}`
    )
    .join('\n\n');

  const docData = {
    organization_id: organizationId,
    title: `${titulo} - v${data.version_numero}`,
    type: 'planificacion',
    sub_type: tipo,
    content: contenido,
    status: 'publicado',
    version: data.version_numero,
    source_collection: PLAN_COLLECTIONS[tipo],
    source_id: data.id,
    created_at: new Date().toISOString(),
    created_by: userEmail,
    // Campos adicionales para ISO
    is_controlled: true,
    requires_approval: false,
    approved: true,
    approved_at: new Date().toISOString(),
    approved_by: userEmail,
  };

  await addDoc(collection(db, 'documents'), cleanData(docData));
}

/**
 * Obtiene el historial de versiones de un tipo
 */
export async function getHistorial<T extends PlanBase>(
  tipo: PlanCollectionType,
  organizationId: string
): Promise<T[]> {
  const collectionName = PLAN_COLLECTIONS[tipo];

  const q = query(
    collection(db, collectionName),
    where('organization_id', '==', organizationId),
    orderBy('version_numero', 'desc')
  );

  const snap = await getDocs(q);

  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  })) as T[];
}

/**
 * Obtiene un registro específico por ID
 */
export async function getPlanById<T extends PlanBase>(
  tipo: PlanCollectionType,
  id: string
): Promise<T | null> {
  const collectionName = PLAN_COLLECTIONS[tipo];
  const docSnap = await getDoc(doc(db, collectionName, id));

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as T;
}
