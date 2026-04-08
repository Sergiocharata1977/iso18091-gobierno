import { AgentJob } from '@/types/agents';
import type {
  EmployeeResponseContext,
  EmployeeResponseIntent,
  RhrResponseResult,
} from '@/types/whatsapp-rrhh';
import { Timestamp } from 'firebase-admin/firestore';

type PayloadLike = Record<string, unknown>;

const POSITIVE_KEYWORDS = [
  'ok',
  'listo',
  'hecho',
  'completado',
  'done',
  'realizado',
  'terminado',
  'ok!',
  '👍',
];

const NEGATIVE_KEYWORDS = [
  'no puedo',
  'imposible',
  'no lo hare',
  'no lo haré',
  'rechazo',
  'rechazado',
];

const ISSUE_KEYWORDS = [
  'problema',
  'error',
  'fallo',
  'no funciona',
  'roto',
  'issue',
];

const DEADLINE_KEYWORDS = ['cuando', 'cuándo', 'para cuando', 'para cuándo', 'fecha limite', 'fecha límite', 'deadline'];

const QUESTION_STARTERS = ['que', 'qué', 'cuando', 'cuándo', 'donde', 'dónde', 'como', 'cómo', 'por que', 'por qué'];

export class RhrResponseProcessor {
  constructor(private readonly db: FirebaseFirestore.Firestore) {}

  detectIntent(
    text: string
  ): { intent: EmployeeResponseIntent; confidence: number } {
    const normalized = this.normalizeText(text);

    if (this.includesAnyKeyword(normalized, POSITIVE_KEYWORDS)) {
      return { intent: 'confirm_task', confidence: 0.93 };
    }

    if (this.includesAnyKeyword(normalized, NEGATIVE_KEYWORDS)) {
      return { intent: 'reject_task', confidence: 0.9 };
    }

    if (this.includesAnyKeyword(normalized, ISSUE_KEYWORDS)) {
      return { intent: 'report_issue', confidence: 0.87 };
    }

    if (this.includesAnyKeyword(normalized, DEADLINE_KEYWORDS)) {
      return { intent: 'request_deadline', confidence: 0.82 };
    }

    const startsWithQuestionStarter = QUESTION_STARTERS.some(starter =>
      normalized.startsWith(starter)
    );

    if (text.includes('?') || text.includes('¿') || startsWithQuestionStarter) {
      return { intent: 'ask_question', confidence: 0.8 };
    }

    return { intent: 'unknown', confidence: 0.3 };
  }

  async findRelatedJob(
    phone_e164: string,
    org_id: string
  ): Promise<AgentJob | null> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const cleanPhone = this.normalizePhone(phone_e164);

    const snapshot = await this.db
      .collection('agent_jobs')
      .where('organization_id', '==', org_id)
      .where('created_at', '>=', cutoff)
      .orderBy('created_at', 'desc')
      .limit(100)
      .get();

    const relatedDoc = snapshot.docs.find(doc => {
      const data = doc.data() as Partial<AgentJob>;
      if (data.intent !== 'task.assign' && data.intent !== 'task.reminder') {
        return false;
      }

      const payload = this.asPayload(data.payload);
      const payloadPhoneCandidates = [
        this.asString(payload.responsable_phone),
        this.asString(payload.vendedor_phone),
        this.asString(payload.phone),
        this.asString(payload.to),
        this.asString(payload.phone_e164),
      ]
        .filter((value): value is string => Boolean(value))
        .map(value => this.normalizePhone(value));

      return payloadPhoneCandidates.includes(cleanPhone);
    });

    if (!relatedDoc) {
      return null;
    }

    return {
      id: relatedDoc.id,
      ...(relatedDoc.data() as Omit<AgentJob, 'id'>),
    };
  }

  async updateTaskStatus(
    task_id: string | undefined,
    intent: EmployeeResponseIntent,
    org_id: string,
    metadata: { phone_e164: string; message_text: string }
  ): Promise<boolean> {
    if (intent !== 'confirm_task' && intent !== 'reject_task') {
      return false;
    }

    const actionUpdate = await this.updateCollectionTask(
      'actions',
      task_id,
      intent,
      org_id,
      metadata
    );

    if (actionUpdate) {
      return true;
    }

    // Fallback solicitado para auditorias/hallazgos.
    return this.updateCollectionTask(
      'audit_findings',
      task_id,
      intent,
      org_id,
      metadata
    );
  }

  generateReply(
    intent: EmployeeResponseIntent,
    context: EmployeeResponseContext
  ): string | null {
    const employeeName =
      ((context as EmployeeResponseContext & { employee_name?: string })
        .employee_name || '')
        .trim();

    switch (intent) {
      case 'confirm_task':
        return employeeName
          ? `✅ ¡Perfecto! Tarea marcada como completada. Gracias ${employeeName}.`
          : '✅ ¡Perfecto! Tarea marcada como completada. Gracias.';
      case 'reject_task':
        return '❌ Entendido. Notifiqué al administrador. Alguien se contactará contigo.';
      case 'ask_question':
      case 'request_deadline':
        return '🤔 Tu consulta fue registrada. Un supervisor responderá a la brevedad.';
      case 'report_issue':
        return `⚠️ Problema registrado. El equipo fue notificado. Código de referencia: ${
          context.related_job_id || context.message_id
        }`;
      case 'unknown':
      default:
        return null;
    }
  }

  async process(context: EmployeeResponseContext): Promise<RhrResponseResult> {
    try {
      const intent = context.detected_intent;
      const replyMessage = this.generateReply(intent, context);
      let taskUpdated = false;

      if (intent === 'confirm_task' || intent === 'reject_task') {
        taskUpdated = await this.updateTaskStatus(
          context.related_task_id,
          intent,
          context.organization_id,
          {
            phone_e164: context.phone_e164,
            message_text: context.message_text,
          }
        );
      }

      if (intent === 'confirm_task') {
        return {
          intent,
          action_taken: taskUpdated ? 'task_confirmed' : 'reply_sent',
          reply_message: replyMessage || undefined,
          task_updated: taskUpdated,
        };
      }

      if (intent === 'reject_task') {
        return {
          intent,
          action_taken: taskUpdated ? 'task_rejected' : 'reply_sent',
          reply_message: replyMessage || undefined,
          task_updated: taskUpdated,
        };
      }

      if (intent === 'ask_question' || intent === 'request_deadline') {
        return {
          intent,
          action_taken: 'question_queued',
          reply_message: replyMessage || undefined,
          task_updated: false,
        };
      }

      if (intent === 'report_issue') {
        return {
          intent,
          action_taken: 'issue_logged',
          reply_message: replyMessage || undefined,
          task_updated: false,
        };
      }

      return {
        intent,
        action_taken: 'ignored',
        task_updated: false,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected processing error';
      return {
        intent: context.detected_intent,
        action_taken: 'ignored',
        error: message,
      };
    }
  }

  private async updateCollectionTask(
    collectionName: 'actions' | 'audit_findings',
    explicitTaskId: string | undefined,
    intent: EmployeeResponseIntent,
    orgId: string,
    metadata: { phone_e164: string; message_text: string }
  ): Promise<boolean> {
    const now = Timestamp.now();
    const baseData =
      intent === 'confirm_task'
        ? {
            status: 'completada',
            confirmed_by_whatsapp: true,
            confirmed_at: now,
            updatedAt: now,
          }
        : {
            status: 'rechazada_whatsapp',
            rejection_reason: metadata.message_text,
            updatedAt: now,
          };

    let targetDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    if (explicitTaskId) {
      const byId = await this.db.collection(collectionName).doc(explicitTaskId).get();
      if (byId.exists) {
        const data = byId.data() as Record<string, unknown>;
        if (this.asString(data.organization_id) === orgId) {
          targetDoc = byId as FirebaseFirestore.QueryDocumentSnapshot;
        }
      }
    }

    if (!targetDoc) {
      const byPhone = await this.db
        .collection(collectionName)
        .where('organization_id', '==', orgId)
        .where('responsable_phone', '==', metadata.phone_e164)
        .orderBy('updatedAt', 'desc')
        .limit(20)
        .get();

      targetDoc =
        byPhone.docs.find(doc => {
          const status = this.asString((doc.data() as Record<string, unknown>).status);
          return status !== 'completada';
        }) || null;
    }

    if (!targetDoc) {
      return false;
    }

    await targetDoc.ref.update(baseData);
    return true;
  }

  private includesAnyKeyword(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(this.normalizeText(keyword)));
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '').trim();
  }

  private asPayload(value: unknown): PayloadLike {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as PayloadLike;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
