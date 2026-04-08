import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  sendTaskAssignment,
  sendVisitAssignment,
} from '@/services/whatsapp/WhatsAppService';
import { AgentJob } from '@/types/agents';
import { IntentHandler } from './IntentHandler';

/**
 * Handler para `task.assign`.
 * Envia asignacion por WhatsApp al responsable.
 */
export class TaskAssignHandler implements IntentHandler {
  intent = 'task.assign';

  async handle(job: AgentJob): Promise<unknown> {
    const payload = job.payload || {};
    const organizationId = job.organization_id;
    const taskId = payload.task_id || payload.accion_id || '';
    const phone = await this.resolvePhone(payload);

    if (!phone) {
      throw new Error('task.assign requiere telefono o responsable_id valido');
    }

    const responsable =
      payload.responsable_nombre || payload.vendedor_nombre || 'Responsable';
    const titulo = payload.task_titulo || payload.titulo || 'Tarea CRM';
    const fecha = payload.fecha_programada || 'Sin fecha';
    const tipo = payload.task_tipo || payload.tipo || 'tarea';
    const cliente = payload.cliente_nombre || payload.cliente || 'Cliente';
    const direccion =
      payload.cliente_direccion || payload.direccion || 'Sin direccion';

    const sendResult =
      tipo === 'visita'
        ? await sendVisitAssignment(
            organizationId,
            taskId,
            phone,
            responsable,
            cliente,
            direccion,
            fecha
          )
        : await sendTaskAssignment(
            organizationId,
            taskId,
            phone,
            responsable,
            titulo,
            tipo,
            fecha
          );

    if (!sendResult.success) {
      throw new Error(
        sendResult.error || 'No se pudo enviar la asignacion por WhatsApp'
      );
    }

    return {
      action: 'task_assigned',
      phone,
      task_id: taskId || null,
      twilio_sid: sendResult.twilio_sid || null,
      conversation_id: sendResult.conversation_id || null,
    };
  }

  /**
   * Resuelve telefono desde payload o datos de usuario/personnel.
   */
  private async resolvePhone(
    payload: Record<string, any>
  ): Promise<string | null> {
    const directPhone =
      payload.responsable_phone || payload.vendedor_phone || payload.phone;
    if (typeof directPhone === 'string' && directPhone.trim()) {
      return directPhone.trim();
    }

    const responsibleUserId =
      payload.responsable_user_id ||
      payload.vendedor_user_id ||
      payload.user_id;
    if (typeof responsibleUserId === 'string' && responsibleUserId.trim()) {
      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(responsibleUserId).get();
      const userPhone = userDoc.data()?.phoneNumber || userDoc.data()?.phone;
      if (typeof userPhone === 'string' && userPhone.trim()) {
        return userPhone.trim();
      }
    }

    const responsiblePersonnelId =
      payload.responsable_id || payload.vendedor_id || payload.personnel_id;
    if (
      typeof responsiblePersonnelId !== 'string' ||
      !responsiblePersonnelId.trim()
    ) {
      return null;
    }

    const db = getAdminFirestore();
    const personnelDoc = await db
      .collection('personnel')
      .doc(responsiblePersonnelId)
      .get();

    const personnelPhone = personnelDoc.data()?.telefono;
    if (typeof personnelPhone === 'string' && personnelPhone.trim()) {
      return personnelPhone.trim();
    }

    return null;
  }
}
