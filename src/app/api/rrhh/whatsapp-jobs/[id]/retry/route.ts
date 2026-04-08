import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { NextRequest, NextResponse } from 'next/server';

type RetryableStatus = 'pending' | 'processing' | 'completed' | 'failed';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeStatus(status: string): RetryableStatus | null {
  if (status === 'pending' || status === 'queued') return 'pending';
  if (status === 'processing' || status === 'running') return 'processing';
  if (status === 'completed') return 'completed';
  if (status === 'failed' || status === 'cancelled') return 'failed';
  return null;
}

export const POST = withAuth(
  async (request: NextRequest, context, auth) => {
    try {
      const { id } = await context.params;
      if (!id) {
        return NextResponse.json({ error: 'id de job requerido' }, { status: 400 });
      }

      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const db = getAdminFirestore();
      const jobRef = db.collection('agent_jobs').doc(id);
      const jobSnap = await jobRef.get();

      if (!jobSnap.exists) {
        return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 });
      }

      const jobData = jobSnap.data() as Record<string, unknown>;
      const organizationId = asString(jobData.organization_id);
      if (!organizationId || organizationId !== scope.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const intent = asString(jobData.intent);
      if (intent !== 'task.assign' && intent !== 'task.reminder') {
        return NextResponse.json(
          { error: 'Solo se pueden reintentar jobs RRHH de WhatsApp' },
          { status: 400 }
        );
      }

      const status = normalizeStatus(asString(jobData.status) || '');
      if (status !== 'failed') {
        return NextResponse.json(
          { error: 'Solo se pueden reintentar jobs fallidos' },
          { status: 409 }
        );
      }

      const payload =
        jobData.payload && typeof jobData.payload === 'object'
          ? (jobData.payload as Record<string, unknown>)
          : {};

      const baseMaxAttempts =
        typeof jobData.max_attempts === 'number' && Number.isFinite(jobData.max_attempts)
          ? Math.max(1, jobData.max_attempts)
          : 3;

      const now = new Date();
      const newJobData: Record<string, unknown> = {
        organization_id: organizationId,
        user_id: asString(jobData.user_id) || auth.uid,
        agent_instance_id:
          asString(jobData.agent_instance_id) ||
          asString(jobData.user_id) ||
          auth.uid,
        intent,
        payload,
        status: 'pending',
        priority: asString(jobData.priority) || 'normal',
        attempts: 0,
        max_attempts: baseMaxAttempts,
        parent_job_id: id,
        workflow_id: asString(jobData.workflow_id) || null,
        step_index:
          typeof jobData.step_index === 'number' ? jobData.step_index : null,
        created_at: now,
        updated_at: now,
      };

      const newRef = await db.collection('agent_jobs').add(newJobData);

      return NextResponse.json({ new_job_id: newRef.id }, { status: 201 });
    } catch (error) {
      console.error('[POST /api/rrhh/whatsapp-jobs/[id]/retry] Error:', error);
      return NextResponse.json(
        { error: 'No se pudo reintentar el job' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'manager', 'super_admin'] }
);

