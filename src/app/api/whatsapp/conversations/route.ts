import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { WhatsAppConversationV2 } from '@/types/whatsapp';

export const dynamic = 'force-dynamic';

const ALL_ROLES = ['admin', 'super_admin', 'gerente', 'jefe', 'operario', 'auditor'] as const;

const createConvSchema = z.object({
  phone_e164: z.string().min(10).max(15),
  contact_name: z.string().optional(),
  client_id: z.string().optional(),
  assigned_user_id: z.string().optional(),
  type: z.enum(['crm', 'iso', 'support', 'dealer']).default('crm'),
});

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const sp = request.nextUrl.searchParams;
      const organizationIdParam = sp.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const orgId = scope.organizationId;

      // Parse filters
      const statusParam = sp.get('status') || 'all';
      const typeParam = sp.get('type') || 'all';
      const sourceParam = sp.get('source') || 'all';
      const assignedUserId = sp.get('assigned_user_id');
      const clientId = sp.get('client_id');
      const isSimulationParam = sp.get('is_simulation');
      const unreadOnly = sp.get('unread_only') === 'true';
      const search = sp.get('search') || '';
      const limitRaw = parseInt(sp.get('limit') || '50', 10);
      const limit = Math.min(isNaN(limitRaw) ? 50 : limitRaw, 100);

      const db = getAdminFirestore();
      let query = db
        .collection('organizations')
        .doc(orgId)
        .collection('whatsapp_conversations')
        .orderBy('updated_at', 'desc') as FirebaseFirestore.Query;

      // Apply Firestore-level filters where possible
      if (statusParam !== 'all') {
        query = query.where('status', '==', statusParam);
      }
      if (typeParam !== 'all') {
        query = query.where('type', '==', typeParam);
      }
      if (assignedUserId) {
        query = query.where('assigned_user_id', '==', assignedUserId);
      }
      if (clientId) {
        query = query.where('client_id', '==', clientId);
      }
      if (isSimulationParam === 'true') {
        query = query.where('is_simulation', '==', true);
      } else if (isSimulationParam === 'false') {
        query = query.where('is_simulation', '==', false);
      }
      if (sourceParam !== 'all') {
        query = query.where('source', '==', sourceParam);
      }

      // Fetch with a larger limit to allow in-memory filtering
      const fetchLimit = unreadOnly || search ? Math.min(limit * 4, 400) : limit;
      const snap = await query.limit(fetchLimit).get();

      let docs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as WhatsAppConversationV2[];

      // In-memory filter: unread_only (Firestore doesn't support "> 0" without composite index)
      if (unreadOnly) {
        docs = docs.filter(d => (d.unread_count ?? 0) > 0);
      }

      // In-memory filter: search on contact_name or phone_e164
      if (search) {
        const lower = search.toLowerCase();
        docs = docs.filter(
          d =>
            d.phone_e164?.toLowerCase().includes(lower) ||
            d.contact_name?.toLowerCase().includes(lower)
        );
      }

      // Trim to requested limit after in-memory filters
      const total = docs.length;
      docs = docs.slice(0, limit);

      return NextResponse.json({ success: true, data: docs, total });
    } catch (error) {
      console.error('[whatsapp/conversations][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener las conversaciones' },
        { status: 500 }
      );
    }
  },
  { roles: [...ALL_ROLES] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = createConvSchema.parse(await request.json());
      const organizationIdParam =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const orgId = scope.organizationId;

      const db = getAdminFirestore();
      const colRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('whatsapp_conversations');

      // Check if an open conversation already exists for this phone
      const existingSnap = await colRef
        .where('phone_e164', '==', body.phone_e164)
        .where('status', '!=', 'archivada')
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        return NextResponse.json({
          success: true,
          data: { id: existingDoc.id, ...existingDoc.data() },
          already_existed: true,
        });
      }

      // Create new conversation
      const newRef = colRef.doc();
      const now = FieldValue.serverTimestamp();
      const newData = {
        phone_e164: body.phone_e164,
        contact_name: body.contact_name ?? null,
        client_id: body.client_id ?? null,
        assigned_user_id: body.assigned_user_id ?? null,
        type: body.type,
        channel: 'meta',
        source: 'manual',
        status: 'abierta',
        unread_count: 0,
        is_simulation: false,
        ai_enabled: false,
        organization_id: orgId,
        created_at: now,
        updated_at: now,
      };

      await newRef.set(newData);

      return NextResponse.json(
        {
          success: true,
          data: { id: newRef.id, ...newData },
          already_existed: false,
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[whatsapp/conversations][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear la conversación' },
        { status: 500 }
      );
    }
  },
  { roles: [...ALL_ROLES] }
);
