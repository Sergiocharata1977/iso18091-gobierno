import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VALID_INTENTS = new Set(['task.assign', 'task.reminder']);
const VALID_STATUS = new Set(['pending', 'processing', 'completed', 'failed']);

type NormalizedStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface JobResponseContext {
  message: string;
  detected_intent: string;
  created_at: string | null;
}

interface WhatsAppJobListItem {
  id: string;
  intent: string;
  status: NormalizedStatus;
  raw_status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: unknown;
  created_at: string | null;
  started_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  employee_phone: string | null;
  employee_name: string | null;
  message_sent: string | null;
  conversation_id: string | null;
  employee_response: JobResponseContext | null;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'object' && value !== null) {
    if ('toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
      try {
        const converted = (value as { toDate: () => Date }).toDate();
        return converted instanceof Date ? converted : null;
      } catch {
        return null;
      }
    }

    if ('seconds' in value && typeof (value as { seconds?: unknown }).seconds === 'number') {
      return new Date((value as { seconds: number }).seconds * 1000);
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function toIso(value: unknown): string | null {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeStatus(status: string): NormalizedStatus | null {
  if (status === 'pending' || status === 'queued') return 'pending';
  if (status === 'processing' || status === 'running') return 'processing';
  if (status === 'completed') return 'completed';
  if (status === 'failed' || status === 'cancelled') return 'failed';
  return null;
}

function detectResponseIntent(text: string): string {
  const normalized = text.toLowerCase();
  if (/(^|\s)(ok|listo|hecho|completado|done|terminado)(\s|$)/.test(normalized)) {
    return 'confirm_task';
  }
  if (/(no puedo|imposible|rechazo|rechazado)/.test(normalized)) {
    return 'reject_task';
  }
  if (/(problema|error|fallo|no funciona|roto|issue)/.test(normalized)) {
    return 'report_issue';
  }
  if (/(cuando|cu[aá]ndo|fecha l[ií]mite|deadline|\?)/.test(normalized)) {
    return 'ask_question';
  }
  return 'unknown';
}

function getPhoneFromPayload(payload: Record<string, unknown>): string | null {
  return (
    asString(payload.responsable_phone) ||
    asString(payload.vendedor_phone) ||
    asString(payload.phone) ||
    asString(payload.phone_e164) ||
    asString(payload.to)
  );
}

function getEmployeeNameFromPayload(payload: Record<string, unknown>): string | null {
  return (
    asString(payload.responsable_nombre) ||
    asString(payload.vendedor_nombre) ||
    asString(payload.employee_name)
  );
}

function getMessageFromPayload(payload: Record<string, unknown>): string | null {
  return (
    asString(payload.message) ||
    asString(payload.message_text) ||
    asString(payload.body) ||
    asString(payload.task_titulo) ||
    asString(payload.titulo)
  );
}

async function getLatestEmployeeResponse(
  orgId: string,
  conversationId: string | null,
  createdAt: Date | null
): Promise<JobResponseContext | null> {
  if (!conversationId) return null;

  const db = getAdminFirestore();

  let docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  try {
    const snap = await db
      .collection('whatsapp_messages')
      .where('organization_id', '==', orgId)
      .where('conversation_id', '==', conversationId)
      .where('direction', '==', 'INBOUND')
      .orderBy('created_at', 'desc')
      .limit(15)
      .get();
    docs = snap.docs;
  } catch {
    const snap = await db
      .collection('whatsapp_messages')
      .where('organization_id', '==', orgId)
      .where('conversation_id', '==', conversationId)
      .orderBy('created_at', 'desc')
      .limit(25)
      .get();
    docs = snap.docs.filter(
      doc => asString((doc.data() as Record<string, unknown>).direction) === 'INBOUND'
    );
  }

  const candidate = docs
    .map(doc => doc.data() as Record<string, unknown>)
    .find(message => {
      const text = asString(message.body);
      if (!text) return false;
      if (!createdAt) return true;
      const messageDate = toDate(message.created_at);
      return !messageDate || messageDate.getTime() >= createdAt.getTime();
    });

  if (!candidate) return null;
  const message = asString(candidate.body);
  if (!message) return null;

  return {
    message,
    detected_intent: detectResponseIntent(message),
    created_at: toIso(candidate.created_at),
  };
}

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const sp = request.nextUrl.searchParams;
      const organizationIdParam = sp.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);

      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const orgId = scope.organizationId;
      const intent = sp.get('intent');
      const status = sp.get('status');
      const page = Math.max(parseInt(sp.get('page') || '1', 10) || 1, 1);
      const limit = Math.min(
        Math.max(parseInt(sp.get('limit') || '20', 10) || 20, 1),
        100
      );
      const dateFrom = toDate(sp.get('date_from'));
      const dateTo = toDate(sp.get('date_to'));

      if (intent && intent !== 'all' && !VALID_INTENTS.has(intent)) {
        return NextResponse.json(
          { error: 'intent invalido. Use task.assign o task.reminder' },
          { status: 400 }
        );
      }

      if (status && status !== 'all' && !VALID_STATUS.has(status)) {
        return NextResponse.json(
          { error: 'status invalido. Use pending|processing|completed|failed' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const snap = await db
        .collection('agent_jobs')
        .where('organization_id', '==', orgId)
        .orderBy('created_at', 'desc')
        .limit(1000)
        .get();

      const allJobs = snap.docs.map(doc => {
        const data = doc.data() as Record<string, unknown>;
        const payload = asRecord(data.payload);
        const result = asRecord(data.result);
        const createdDate = toDate(data.created_at);
        const normalizedStatus = normalizeStatus(asString(data.status) || '');
        const conversationId =
          asString(payload.conversation_id) || asString(result.conversation_id);

        return {
          id: doc.id,
          intent: asString(data.intent) || '',
          raw_status: asString(data.status) || 'unknown',
          status: normalizedStatus,
          payload,
          result: Object.keys(result).length > 0 ? result : null,
          error: data.error ?? null,
          createdDate,
          created_at: toIso(data.created_at),
          started_at: toIso(data.started_at),
          updated_at: toIso(data.updated_at),
          completed_at: toIso(data.completed_at),
          employee_phone: getPhoneFromPayload(payload),
          employee_name: getEmployeeNameFromPayload(payload),
          message_sent: getMessageFromPayload(payload),
          conversation_id: conversationId,
        };
      });

      const pendingTotal = allJobs.filter(job => job.status === 'pending').length;

      const filtered = allJobs.filter(job => {
        if (!VALID_INTENTS.has(job.intent)) return false;
        if (!job.status) return false;
        if (intent && intent !== 'all' && job.intent !== intent) return false;
        if (status && status !== 'all' && job.status !== status) return false;

        if (dateFrom || dateTo) {
          if (!job.createdDate) return false;
          if (dateFrom && job.createdDate < dateFrom) return false;
          if (dateTo && job.createdDate > dateTo) return false;
        }

        return true;
      });

      const total = filtered.length;
      const startIndex = (page - 1) * limit;
      const paged = filtered.slice(startIndex, startIndex + limit);

      const jobs: WhatsAppJobListItem[] = await Promise.all(
        paged.map(async job => ({
          id: job.id,
          intent: job.intent,
          status: job.status as NormalizedStatus,
          raw_status: job.raw_status,
          payload: job.payload,
          result: job.result,
          error: job.error,
          created_at: job.created_at,
          started_at: job.started_at,
          updated_at: job.updated_at,
          completed_at: job.completed_at,
          employee_phone: job.employee_phone,
          employee_name: job.employee_name,
          message_sent: job.message_sent,
          conversation_id: job.conversation_id,
          employee_response: await getLatestEmployeeResponse(
            orgId,
            job.conversation_id,
            job.createdDate
          ),
        }))
      );

      return NextResponse.json({
        jobs,
        total,
        page,
        limit,
        pending_total: pendingTotal,
      });
    } catch (error) {
      console.error('[GET /api/rrhh/whatsapp-jobs] Error:', error);
      return NextResponse.json(
        { error: 'No se pudieron obtener los jobs de WhatsApp RRHH' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'manager', 'super_admin'] }
);
