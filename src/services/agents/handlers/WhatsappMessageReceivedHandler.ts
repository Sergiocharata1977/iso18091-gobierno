import { AgentJob } from '@/types/agents';
import type { EmployeeResponseContext } from '@/types/whatsapp-rrhh';
import { sendMessage } from '@/services/whatsapp/WhatsAppService';
import { RhrResponseProcessor } from '@/services/whatsapp/RhrResponseProcessor';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { IntentHandler } from './IntentHandler';

export class WhatsappMessageReceivedHandler implements IntentHandler {
  intent = 'whatsapp.message.received';

  async handle(job: AgentJob): Promise<unknown> {
    const payload = this.asPayload(job.payload);
    const phoneE164 = this.asString(payload.phone_e164) || this.asString(payload.from);
    const messageText =
      this.asString(payload.message_text) || this.asString(payload.body);
    const messageId = this.asString(payload.message_id);
    const conversationId = this.asString(payload.conversation_id);
    const organizationId =
      this.asString(payload.organization_id) || job.organization_id;

    if (!phoneE164 || !messageText || !conversationId || !organizationId) {
      return {
        action: 'ignored',
        reason: 'Missing required payload fields for WhatsApp response handling',
      };
    }

    const processor = new RhrResponseProcessor(getAdminFirestore());
    const { intent, confidence } = processor.detectIntent(messageText);

    const relatedJob = await processor.findRelatedJob(phoneE164, organizationId);
    if (!relatedJob) {
      return {
        action: 'ignored',
        reason: 'No related RRHH job found in last 48h',
      };
    }

    const relatedPayload = this.asPayload(relatedJob.payload);
    const relatedTaskId =
      this.asString(relatedPayload.task_id) ||
      this.asString(relatedPayload.accion_id) ||
      undefined;

    const context: EmployeeResponseContext = {
      phone_e164: phoneE164,
      organization_id: organizationId,
      message_text: messageText,
      message_id: messageId,
      conversation_id: conversationId,
      detected_intent: intent,
      confidence,
      related_job_id: relatedJob.id,
      related_task_id: relatedTaskId,
    };

    const result = await processor.process(context);

    if (result.reply_message) {
      await sendMessage({
        organization_id: organizationId,
        conversation_id: conversationId,
        to: phoneE164,
        body: result.reply_message,
        sender_user_id: 'system',
        sender_name: 'Sistema RRHH',
        type: 'text',
        template_name: 'rrhh.employee.response',
        template_variables: [relatedJob.id],
      });
    }

    return { action: result.action_taken, ...result };
  }

  private asPayload(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
