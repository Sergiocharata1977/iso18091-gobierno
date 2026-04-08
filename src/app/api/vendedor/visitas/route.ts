import { withAuth } from '@/lib/api/withAuth';
import { adminDb } from '@/firebase/admin';
import type { VisitaLocal } from '@/types/vendedor';
import * as admin from 'firebase-admin';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const visita: VisitaLocal = await request.json();

      if (!visita.organizationId || !visita.clienteId || !visita.vendedorId) {
        return NextResponse.json(
          { error: 'Faltan datos requeridos' },
          { status: 400 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        visita.organizationId !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const visitaRef = adminDb
        .collection('organizations')
        .doc(visita.organizationId)
        .collection('visitas_vendedor')
        .doc(visita.id || adminDb.collection('_').doc().id);

      const visitaData = {
        ...visita,
        fotosIds: visita.fotosIds || [],
        audiosIds: visita.audiosIds || [],
        checklist: visita.checklist || [],
        syncedAt: new Date().toISOString(),
        createdAt: visita.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await visitaRef.set(visitaData);

      const clienteRef = adminDb
        .collection('organizations')
        .doc(visita.organizationId)
        .collection('clientes')
        .doc(visita.clienteId);

      await clienteRef.update({
        ultimaVisita: visita.fecha,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        id: visitaRef.id,
        message: 'Visita registrada exitosamente',
      });
    } catch (error) {
      console.error('Error al crear visita:', error);
      return NextResponse.json(
        {
          error: 'Error al crear visita',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const vendedorId = searchParams.get('vendedorId');
      const requestedOrgId = searchParams.get('organizationId') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;
      const limit = parseInt(searchParams.get('limit') || '50');

      if (!vendedorId || !organizationId) {
        return NextResponse.json(
          { error: 'vendedorId y organizationId son requeridos' },
          { status: 400 }
        );
      }

      const visitasSnapshot = await adminDb
        .collection('organizations')
        .doc(organizationId)
        .collection('visitas_vendedor')
        .where('vendedorId', '==', vendedorId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const visitas = visitasSnapshot.docs.map(
        (doc: admin.firestore.QueryDocumentSnapshot) => ({
          id: doc.id,
          ...doc.data(),
        })
      );

      return NextResponse.json({
        success: true,
        visitas,
        count: visitas.length,
      });
    } catch (error) {
      console.error('Error al listar visitas:', error);
      return NextResponse.json(
        {
          error: 'Error al listar visitas',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
