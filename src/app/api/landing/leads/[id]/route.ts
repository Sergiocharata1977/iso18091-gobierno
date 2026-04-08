// API para gestionar un lead individual
import { withAuth } from '@/lib/api/withAuth';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const READ_ROLES = ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'];
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'];

function denyByOrg(
  auth: { role: string; organizationId: string },
  leadOrgId: string | null | undefined
) {
  if (auth.role === 'super_admin') return false;
  if (!auth.organizationId) return true;
  if (!leadOrgId) return true;
  return leadOrgId !== auth.organizationId;
}

// GET - Obtener lead por ID
export const GET = withAuth(
  async (
    _request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
    auth
  ) => {
    try {
      const { id } = await params;
      const docRef = db.collection('landing_leads').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Lead no encontrado' },
          { status: 404 }
        );
      }

      const orgId = (doc.data()?.organization_id as string | undefined) || null;
      if (denyByOrg(auth, orgId)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const leadData = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()?.createdAt?.toDate(),
        updatedAt: doc.data()?.updatedAt?.toDate(),
        lastMessageAt: doc.data()?.lastMessageAt?.toDate(),
        chatHistory:
          doc.data()?.chatHistory?.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp?.toDate(),
          })) || [],
      };

      return NextResponse.json({
        success: true,
        data: leadData,
      });
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { roles: READ_ROLES as any }
);

// PATCH - Actualizar lead (cambiar estado, agregar notas, etc.)
export const PATCH = withAuth(
  async (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
    auth
  ) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const docRef = db.collection('landing_leads').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Lead no encontrado' },
          { status: 404 }
        );
      }

      const orgId = (doc.data()?.organization_id as string | undefined) || null;
      if (denyByOrg(auth, orgId)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await docRef.update({
        ...body,
        updatedBy: auth.uid,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Lead actualizado correctamente',
      });
    } catch (error: any) {
      console.error('Error updating lead:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { roles: WRITE_ROLES as any }
);

// DELETE - Eliminar lead
export const DELETE = withAuth(
  async (
    _request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
    auth
  ) => {
    try {
      const { id } = await params;
      const docRef = db.collection('landing_leads').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Lead no encontrado' },
          { status: 404 }
        );
      }

      const orgId = (doc.data()?.organization_id as string | undefined) || null;
      if (denyByOrg(auth, orgId)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await docRef.delete();

      return NextResponse.json({
        success: true,
        message: 'Lead eliminado correctamente',
      });
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { roles: WRITE_ROLES as any }
);
