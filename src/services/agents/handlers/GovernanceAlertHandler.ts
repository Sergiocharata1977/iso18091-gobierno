import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentJob } from '@/types/agents';
import { Personnel } from '@/types/rrhh';
import { IntentHandler } from './IntentHandler';

/**
 * Handler para `governance.alert.handle`.
 * Prepara payload de notificacion para canal externo sin ejecutarlo.
 */
export class GovernanceAlertHandler implements IntentHandler {
  intent = 'governance.alert.handle';

  /**
   * Construye el resultado estandar de alerta de gobernanza.
   */
  async handle(job: AgentJob): Promise<unknown> {
    const phone = await this.resolvePhone(job.user_id);
    if (!phone) {
      throw new Error(`No phone number found for user ${job.user_id}`);
    }

    const payload = job.payload || {};
    const emoji = payload.severity === 'critical' ? 'ALERTA' : 'ATENCION';
    const messageBody =
      `${emoji} *Agente de Gobernanza ISO*\n\n` +
      `Detecte un problema en el proceso: *${payload.process_name || 'Sin proceso'}*.\n\n` +
      `"${payload.message || 'Sin detalle'}"\n\n` +
      `Accion sugerida: _${payload.suggested_action || 'Sin accion sugerida'}_\n\n` +
      `Deseas que proceda con esta accion? Responde SI o NO.`;

    return {
      action: 'notify_whatsapp',
      sent_to: phone,
      message: messageBody,
      status: 'notification_prepared',
    };
  }

  /**
   * Resuelve telefono principal desde users o personnel.
   */
  private async resolvePhone(userId: string): Promise<string | null> {
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userPhone = userDoc.data()?.phoneNumber || userDoc.data()?.phone;

    if (typeof userPhone === 'string' && userPhone.trim()) {
      return userPhone.trim();
    }

    const personnelSnapshot = await db
      .collection('personnel')
      .where('user_id', '==', userId)
      .limit(1)
      .get();

    if (personnelSnapshot.empty) {
      return null;
    }

    const person = personnelSnapshot.docs[0].data() as Personnel;
    return person.telefono?.trim() || null;
  }
}
