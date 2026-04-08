import { db } from '@/firebase/config';
import { withAuth } from '@/lib/api/withAuth';
import type { Organigrama } from '@/types/organigramas';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

type EstructuraNode = {
  id: string;
  parentId: string | null;
  nombre: string;
  tipo: string;
  responsable: string | null;
  nivel: number;
  orden: number;
  descripcion: string | null;
};

function normalizeOrganizationId(auth: {
  role?: string;
  organizationId?: string | null;
}) {
  if (auth.role === 'super_admin') {
    return auth.organizationId || 'default-org';
  }

  return auth.organizationId;
}

async function getCurrentOrganigrama(organizationId: string) {
  const organigramasRef = collection(db, 'organigramas');

  const vigenteQuery = query(
    organigramasRef,
    where('isActive', '==', true),
    where('organization_id', '==', organizationId),
    where('estado', '==', 'vigente'),
    orderBy('fecha_vigencia_desde', 'desc'),
    limit(1)
  );

  const vigenteSnapshot = await getDocs(vigenteQuery);
  if (!vigenteSnapshot.empty) {
    const item = vigenteSnapshot.docs[0];
    return { id: item.id, ...(item.data() as Omit<Organigrama, 'id'>) };
  }

  const fallbackQuery = query(
    organigramasRef,
    where('isActive', '==', true),
    where('organization_id', '==', organizationId),
    orderBy('fecha_vigencia_desde', 'desc'),
    limit(1)
  );

  const fallbackSnapshot = await getDocs(fallbackQuery);
  if (fallbackSnapshot.empty) {
    return null;
  }

  const item = fallbackSnapshot.docs[0];
  return { id: item.id, ...(item.data() as Omit<Organigrama, 'id'>) };
}

function mapNode(
  node: Organigrama['estructura'][number],
  fallbackName: string
): EstructuraNode {
  const metadata = node.metadata || {};

  return {
    id: node.nodo_id,
    parentId: node.padre_id || null,
    nombre:
      node.referencia_nombre ||
      metadata.descripcion_cargo ||
      fallbackName ||
      'Area sin nombre',
    tipo: node.tipo,
    responsable:
      typeof (metadata as Record<string, unknown>).responsable === 'string'
        ? ((metadata as Record<string, unknown>).responsable as string)
        : null,
    nivel: node.nivel,
    orden: node.orden,
    descripcion: metadata.descripcion_cargo || null,
  };
}

export const GET = withAuth(
  async (_request, _context, auth) => {
    try {
      const organizationId = normalizeOrganizationId(auth);
      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      const organigrama = await getCurrentOrganigrama(organizationId);

      if (!organigrama) {
        return NextResponse.json({
          success: true,
          data: {
            organigramaId: null,
            nombre: 'Estructura municipal',
            estado: 'sin_datos',
            updatedAt: null,
            nodes: [] satisfies EstructuraNode[],
          },
        });
      }

      const nodes = (organigrama.estructura || [])
        .map((node, index) => mapNode(node, `Area ${index + 1}`))
        .sort((a, b) => {
          if (a.nivel !== b.nivel) {
            return a.nivel - b.nivel;
          }

          return a.orden - b.orden;
        });

      return NextResponse.json({
        success: true,
        data: {
          organigramaId: organigrama.id,
          nombre: organigrama.nombre,
          estado: organigrama.estado,
          updatedAt: organigrama.updatedAt || null,
          nodes,
        },
      });
    } catch (error) {
      console.error('[municipio/estructura][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la estructura municipal' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const organizationId = normalizeOrganizationId(auth);
      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      const body = (await request.json()) as {
        nombre?: string;
        tipo?: string;
        responsable?: string;
        parentId?: string | null;
        descripcion?: string;
      };

      const nombre = body.nombre?.trim();
      const tipo = body.tipo?.trim() || 'departamento';
      const responsable = body.responsable?.trim() || null;
      const descripcion = body.descripcion?.trim() || null;
      const parentId = body.parentId?.trim() || null;

      if (!nombre) {
        return NextResponse.json(
          { success: false, error: 'El nombre del area es obligatorio' },
          { status: 400 }
        );
      }

      const current = await getCurrentOrganigrama(organizationId);
      const now = new Date().toISOString();

      if (!current) {
        const initialNode: Organigrama['estructura'][number] = {
          nodo_id: `nodo-${Date.now()}`,
          tipo: tipo as Organigrama['estructura'][number]['tipo'],
          referencia_nombre: nombre,
          padre_id: undefined,
          nivel: 0,
          orden: 0,
          metadata: {
            descripcion_cargo: descripcion || undefined,
            responsabilidades: [],
            ...(responsable ? { responsable } : {}),
          } as Organigrama['estructura'][number]['metadata'] & {
            responsable?: string;
          },
        };

        const docRef = await addDoc(collection(db, 'organigramas'), {
          organization_id: organizationId,
          codigo: `ORG-MUN-${Date.now()}`,
          nombre: 'Estructura municipal',
          descripcion: 'Organigrama municipal operativo',
          version: 1,
          fecha_vigencia_desde: now.split('T')[0],
          estado: 'vigente',
          estructura: [initialNode],
          configuracion_visual: {
            orientacion: 'vertical',
            estilo: 'moderno',
            mostrar_fotos: false,
          },
          createdAt: now,
          updatedAt: now,
          created_by: auth.uid,
          isActive: true,
        });

        return NextResponse.json(
          {
            success: true,
            data: { organigramaId: docRef.id, created: true },
          },
          { status: 201 }
        );
      }

      const parentNode = current.estructura.find(node => node.nodo_id === parentId);
      const siblingCount = current.estructura.filter(
        node => (node.padre_id || null) === parentId
      ).length;

      const nextNode: Organigrama['estructura'][number] = {
        nodo_id: `nodo-${Date.now()}`,
        tipo: tipo as Organigrama['estructura'][number]['tipo'],
        referencia_nombre: nombre,
        padre_id: parentId || undefined,
        nivel: parentNode ? parentNode.nivel + 1 : 0,
        orden: siblingCount,
        metadata: {
          descripcion_cargo: descripcion || undefined,
          responsabilidades: [],
          ...(responsable ? { responsable } : {}),
        } as Organigrama['estructura'][number]['metadata'] & {
          responsable?: string;
        },
      };

      await updateDoc(doc(db, 'organigramas', current.id), {
        estructura: [...(current.estructura || []), nextNode],
        updatedAt: now,
        updated_by: auth.uid,
      });

      return NextResponse.json({
        success: true,
        data: { organigramaId: current.id, created: false },
      });
    } catch (error) {
      console.error('[municipio/estructura][POST] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo agregar el area' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
