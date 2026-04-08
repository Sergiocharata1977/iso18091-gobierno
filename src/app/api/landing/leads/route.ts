// API para gestionar leads de landing page
import { withAuth } from '@/lib/api/withAuth';
import type { LandingLead } from '@/types/landing-lead';
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

// GET - Listar leads
export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      if (!auth.organizationId && auth.role !== 'super_admin') {
        return NextResponse.json(
          { success: false, error: 'Sin organizacion' },
          { status: 403 }
        );
      }

      const { searchParams } = new URL(request.url);
      const priority = searchParams.get('priority'); // 'alta', 'media', 'baja'
      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') || '50');
      const requestedOrgId =
        searchParams.get('organization_id') ||
        searchParams.get('organizationId') ||
        undefined;

      if (
        requestedOrgId &&
        auth.role !== 'super_admin' &&
        requestedOrgId !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const orgId =
        auth.role === 'super_admin'
          ? requestedOrgId || undefined
          : auth.organizationId;

      let query = db.collection('landing_leads').orderBy('createdAt', 'desc');

      if (orgId) {
        query = query.where('organization_id', '==', orgId) as any;
      }

      if (priority) {
        query = query.where('qualification.priority', '==', priority) as any;
      }

      if (status) {
        query = query.where('status', '==', status) as any;
      }

      const snapshot = await query.limit(limit).get();

      const leads: LandingLead[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastMessageAt: doc.data().lastMessageAt?.toDate(),
        chatHistory:
          doc.data().chatHistory?.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp?.toDate(),
          })) || [],
      })) as LandingLead[];

      return NextResponse.json({
        success: true,
        data: leads,
        count: leads.length,
      });
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { roles: READ_ROLES as any }
);

// POST - Crear lead manualmente (opcional, normalmente se crea desde el chat)
export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      if (!auth.organizationId && auth.role !== 'super_admin') {
        return NextResponse.json(
          { success: false, error: 'Sin organizacion' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const requestedOrgId =
        body?.organization_id || body?.organizationId || undefined;

      if (
        requestedOrgId &&
        auth.role !== 'super_admin' &&
        requestedOrgId !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const orgId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId || undefined
          : auth.organizationId;

      const leadData = {
        ...body,
        organization_id: orgId,
        status: body.status || 'new',
        source: body.source || 'chat',
        createdBy: auth.uid,
        updatedBy: auth.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
      };

      const docRef = await db.collection('landing_leads').add(leadData);

      return NextResponse.json({
        success: true,
        leadId: docRef.id,
      });
    } catch (error: any) {
      console.error('Error creating lead:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  },
  { roles: WRITE_ROLES as any }
);
