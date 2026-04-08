import { sendMessage } from '@/services/whatsapp/WhatsAppService';
import { AgentJob } from '@/types/agents';
import { IntentHandler } from './IntentHandler';

type OverdueMeasurementPayload = Record<string, any> & {
  responsible_phone?: string;
  responsable_phone?: string;
  vendedor_phone?: string;
  phone?: string;
  responsible_name?: string;
  responsable_nombre?: string;
  vendedor_nombre?: string;
  indicator_id?: string;
  indicator_name?: string;
  indicator_code?: string;
  measurement_id?: string;
  measurement_due_date?: string;
  due_date?: string;
  days_overdue?: number;
  measurement_frequency?: string;
  reminder_cooldown_hours?: number;
  last_reminder_sent_at?: string;
  reminder_count?: number;
  process_name?: string;
  deep_link?: string;
  escalation?: {
    enabled?: boolean;
    threshold_days?: number;
    threshold_reminders?: number;
    impact?: 'low' | 'medium' | 'high' | 'critical' | string;
    approver_role?: string;
    proposed_action?: string;
    auto_create_action?: boolean;
  };
};

/**
 * Handler para `quality.measurement.overdue.reminder`.
 * Envia recordatorio por WhatsApp y devuelve estrategia de escalamiento/aprobacion.
 */
export class QualityMeasurementOverdueReminderHandler implements IntentHandler {
  intent = 'quality.measurement.overdue.reminder';

  async handle(job: AgentJob): Promise<unknown> {
    const payload = (job.payload || {}) as OverdueMeasurementPayload;
    const phone = this.resolvePhone(payload);

    if (!phone) {
      throw new Error(
        'quality.measurement.overdue.reminder requiere responsible_phone/responsable_phone/phone'
      );
    }

    const cooldownHours = this.getCooldownHours(payload);
    if (this.isWithinCooldown(payload.last_reminder_sent_at, cooldownHours)) {
      return {
        action: 'measurement_overdue_reminder',
        target: this.buildTarget(job, payload, phone),
        status: 'skipped',
        reason: 'cooldown_active',
        cooldown_hours: cooldownHours,
        evidence_refs: this.buildEvidenceRefs(job, payload),
        trace: this.buildTrace(job),
      };
    }

    const message = this.buildReminderMessage(payload);
    const sendResult = await sendMessage({
      organization_id: job.organization_id,
      to: phone,
      body: message,
      sender_user_id: 'system',
      sender_name: 'Sistema Calidad',
      type: 'text',
      template_name: 'quality.measurement.overdue.reminder',
      template_variables: [
        payload.measurement_id || '',
        payload.indicator_id || '',
        String(this.getDaysOverdue(payload)),
      ],
    });

    if (!sendResult.success) {
      throw new Error(
        sendResult.error || 'No se pudo enviar recordatorio de medicion vencida'
      );
    }

    const escalation = this.buildEscalationStrategy(payload);
    const evidenceRefs = this.buildEvidenceRefs(job, payload);

    if (sendResult.message_id) {
      evidenceRefs.push({
        type: 'whatsapp_message',
        id: sendResult.message_id,
      });
    }
    if (sendResult.conversation_id) {
      evidenceRefs.push({
        type: 'whatsapp_conversation',
        id: sendResult.conversation_id,
      });
    }

    return {
      action: 'measurement_overdue_reminder',
      target: this.buildTarget(job, payload, phone),
      status:
        escalation.status === 'pending_approval'
          ? 'pending_approval'
          : 'completed',
      delivery: {
        channel: 'whatsapp',
        status: 'sent',
        template_name: 'quality.measurement.overdue.reminder',
        twilio_sid: sendResult.twilio_sid || null,
        conversation_id: sendResult.conversation_id || null,
      },
      escalation,
      evidence_refs: evidenceRefs,
      trace: this.buildTrace(job),
    };
  }

  private resolvePhone(payload: OverdueMeasurementPayload): string | null {
    const candidate =
      payload.responsible_phone ||
      payload.responsable_phone ||
      payload.vendedor_phone ||
      payload.phone;

    if (typeof candidate !== 'string') return null;
    const trimmed = candidate.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private getCooldownHours(payload: OverdueMeasurementPayload): number {
    const raw =
      typeof payload.reminder_cooldown_hours === 'number'
        ? payload.reminder_cooldown_hours
        : 24;
    return Math.max(1, Math.floor(raw));
  }

  private isWithinCooldown(
    lastSentAt: unknown,
    cooldownHours: number
  ): boolean {
    if (typeof lastSentAt !== 'string' || !lastSentAt.trim()) return false;
    const parsed = new Date(lastSentAt);
    if (Number.isNaN(parsed.getTime())) return false;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    return Date.now() - parsed.getTime() < cooldownMs;
  }

  private buildReminderMessage(payload: OverdueMeasurementPayload): string {
    const responsible =
      payload.responsible_name ||
      payload.responsable_nombre ||
      payload.vendedor_nombre ||
      'responsable';
    const indicatorName = payload.indicator_name || 'Indicador de calidad';
    const indicatorCode = payload.indicator_code
      ? ` (${payload.indicator_code})`
      : '';
    const dueDate =
      payload.measurement_due_date || payload.due_date || 'sin fecha';
    const daysOverdue = this.getDaysOverdue(payload);
    const frequency = payload.measurement_frequency || 'sin frecuencia';
    const processName = payload.process_name
      ? `Proceso: ${payload.process_name}`
      : '';
    const deepLink = payload.deep_link ? `Registro: ${payload.deep_link}` : '';

    const lines = [
      '*Recordatorio de medicion vencida*',
      `Hola ${responsible},`,
      `Indicador: ${indicatorName}${indicatorCode}`,
      `Vencimiento: ${dueDate}`,
      `Atraso: ${daysOverdue} dia(s)`,
      `Frecuencia: ${frequency}`,
      processName,
      deepLink,
      'Por favor registre la medicion o informe bloqueo.',
    ];

    return lines.filter(Boolean).join('\n');
  }

  private getDaysOverdue(payload: OverdueMeasurementPayload): number {
    if (
      typeof payload.days_overdue === 'number' &&
      Number.isFinite(payload.days_overdue)
    ) {
      return Math.max(0, Math.floor(payload.days_overdue));
    }

    const dueDateRaw = payload.measurement_due_date || payload.due_date;
    if (typeof dueDateRaw !== 'string' || !dueDateRaw.trim()) return 0;

    const dueDate = new Date(dueDateRaw);
    if (Number.isNaN(dueDate.getTime())) return 0;

    const diffMs = Date.now() - dueDate.getTime();
    if (diffMs <= 0) return 0;

    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }

  private buildEscalationStrategy(payload: OverdueMeasurementPayload): {
    status: 'not_required' | 'recommended' | 'pending_approval';
    reason: string;
    approval_gate?: {
      required_role: string;
      proposed_action: string;
      impact: string;
    };
  } {
    const escalation = payload.escalation || {};
    if (escalation.enabled === false) {
      return { status: 'not_required', reason: 'disabled_by_payload' };
    }

    const daysOverdue = this.getDaysOverdue(payload);
    const reminderCount =
      typeof payload.reminder_count === 'number' &&
      Number.isFinite(payload.reminder_count)
        ? Math.max(0, Math.floor(payload.reminder_count))
        : 0;

    const thresholdDays =
      typeof escalation.threshold_days === 'number' &&
      Number.isFinite(escalation.threshold_days)
        ? Math.max(1, Math.floor(escalation.threshold_days))
        : 3;
    const thresholdReminders =
      typeof escalation.threshold_reminders === 'number' &&
      Number.isFinite(escalation.threshold_reminders)
        ? Math.max(1, Math.floor(escalation.threshold_reminders))
        : 2;

    const thresholdReached =
      daysOverdue >= thresholdDays || reminderCount >= thresholdReminders;

    if (!thresholdReached) {
      return { status: 'not_required', reason: 'threshold_not_reached' };
    }

    const impact = String(escalation.impact || 'medium');
    const proposedAction =
      escalation.proposed_action ||
      'Crear accion correctiva de seguimiento / escalar a supervisor';

    const requiresApproval =
      escalation.auto_create_action === true ||
      impact === 'high' ||
      impact === 'critical';

    if (requiresApproval) {
      return {
        status: 'pending_approval',
        reason: 'sensitive_escalation_requires_gate',
        approval_gate: {
          required_role: escalation.approver_role || 'quality_supervisor',
          proposed_action: proposedAction,
          impact,
        },
      };
    }

    return {
      status: 'recommended',
      reason: 'threshold_reached_non_sensitive_escalation',
      approval_gate: {
        required_role: escalation.approver_role || 'quality_supervisor',
        proposed_action: proposedAction,
        impact,
      },
    };
  }

  private buildTarget(
    job: AgentJob,
    payload: OverdueMeasurementPayload,
    phone: string
  ) {
    return {
      channel: 'whatsapp',
      phone,
      organization_id: job.organization_id,
      user_id:
        payload.responsible_user_id || payload.responsable_user_id || null,
      indicator_id: payload.indicator_id || null,
      measurement_id: payload.measurement_id || null,
    };
  }

  private buildEvidenceRefs(job: AgentJob, payload: OverdueMeasurementPayload) {
    const refs: Array<{ type: string; id: string }> = [
      { type: 'agent_job', id: job.id },
    ];

    if (
      typeof payload.measurement_id === 'string' &&
      payload.measurement_id.trim()
    ) {
      refs.push({
        type: 'quality_measurement',
        id: payload.measurement_id.trim(),
      });
    }

    if (
      typeof payload.indicator_id === 'string' &&
      payload.indicator_id.trim()
    ) {
      refs.push({ type: 'quality_indicator', id: payload.indicator_id.trim() });
    }

    if (
      typeof payload.process_definition_id === 'string' &&
      payload.process_definition_id.trim()
    ) {
      refs.push({
        type: 'process_definition',
        id: payload.process_definition_id.trim(),
      });
    }

    return refs;
  }

  private buildTrace(job: AgentJob) {
    return {
      org_id: job.organization_id,
      job_id: job.id,
      intent: job.intent,
      workflow_id: job.workflow_id || null,
      step_index: typeof job.step_index === 'number' ? job.step_index : null,
    };
  }
}
