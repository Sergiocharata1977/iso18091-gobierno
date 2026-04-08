import { sendMessage } from '@/services/whatsapp/WhatsAppService';
import { AgentJob } from '@/types/agents';
import { IntentHandler } from './IntentHandler';

/**
 * Handler para `task.reminder`.
 * Envia recordatorio por WhatsApp.
 */
export class TaskReminderHandler implements IntentHandler {
  intent = 'task.reminder';

  /**
   * Construye mensaje de recordatorio a partir del payload.
   */
  async handle(job: AgentJob): Promise<unknown> {
    const payload = job.payload || {};
    const to =
      payload.responsable_phone || payload.vendedor_phone || payload.phone;

    if (!to) {
      throw new Error(
        'task.reminder requiere responsable_phone o vendedor_phone'
      );
    }

    const message = [
      '*Recordatorio de tarea*',
      `Tarea: ${payload.task_titulo || payload.titulo || 'Tarea CRM'}`,
      `Fecha: ${payload.fecha_programada || 'Sin fecha'}`,
      'Responde "OK" cuando la recibas.',
    ].join('\n');

    const sendResult = await sendMessage({
      organization_id: job.organization_id,
      to,
      body: message,
      sender_user_id: 'system',
      sender_name: 'Sistema CRM',
      type: 'text',
      template_name: 'task.reminder',
      template_variables: [payload.task_id || payload.accion_id || ''],
    });

    if (!sendResult.success) {
      throw new Error(sendResult.error || 'No se pudo enviar el recordatorio');
    }

    return {
      action: 'reminder_sent',
      phone: to,
      task_id: payload.task_id || payload.accion_id || null,
      twilio_sid: sendResult.twilio_sid || null,
      conversation_id: sendResult.conversation_id || null,
    };
  }
}
