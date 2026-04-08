/**
 * Governance Agent Bridge
 *
 * Conecta la inteligencia de Gobernanza (Agente A) con la capacidad de ejecución (Agente B).
 * Transforma alertas de cumplimiento ISO 9001 en trabajos ejecutables para los agentes.
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { CreateAgentJobRequest } from '@/types/agents';
import { Personnel } from '@/types/rrhh';
import { ProcessGovernanceService } from '../processes/ProcessGovernanceService';
import { AgentQueueService } from './AgentQueueService';

export class GovernanceAgentBridge {
  /**
   * Ejecuta el ciclo de gobernanza para una organización,
   * detecta alertas y crea trabajos automáticos para los responsables.
   *
   * @returns Número de trabajos encolados
   */
  static async runGovernanceCycle(organizationId: string): Promise<number> {
    console.log(`[GovernanceBridge] Iniciando ciclo para ${organizationId}...`);

    // 1. Ejecutar escaneo de cumplimiento (Agente A)
    const scanResult =
      await ProcessGovernanceService.runComplianceScan(organizationId);

    const activeAlerts = scanResult.alerts_generated.filter(
      alert => alert.status === 'active'
    );
    console.log(
      `[GovernanceBridge] Detectadas ${activeAlerts.length} alertas activas.`
    );

    let jobsCreated = 0;

    // 2. Procesar cada alerta
    for (const alert of activeAlerts) {
      if (!alert.suggested_agent_action) continue;

      try {
        // 3. Identificar al Agente Responsable
        // Necesitamos saber quién ocupa el puesto dueño del proceso
        const responsibleUserId = await this.findResponsibleAgent(
          organizationId,
          alert.process_id
        );

        if (!responsibleUserId) {
          console.warn(
            `[GovernanceBridge] No se encontró usuario responsable para proceso ${alert.process_id}`
          );
          continue;
        }

        // 4. Crear Job para el Agente (Agente B)
        const jobRequest: CreateAgentJobRequest = {
          organization_id: organizationId,
          user_id: responsibleUserId,
          intent: 'governance.alert.handle', // Intención genérica
          payload: {
            alert_id: alert.id,
            alert_type: alert.type,
            severity: alert.severity,
            message: alert.message,
            process_id: alert.process_id,
            process_name: alert.process_name,
            suggested_action: alert.suggested_agent_action,
            details: alert.details,
            timestamp: new Date().toISOString(),
          },
          priority: alert.severity === 'critical' ? 'high' : 'normal',
        };

        const jobId = await AgentQueueService.enqueueJob(
          jobRequest,
          responsibleUserId
        );
        console.log(
          `[GovernanceBridge] Job ${jobId} creado para alerta ${alert.id}`
        );
        jobsCreated++;
      } catch (error) {
        console.error(
          `[GovernanceBridge] Error procesando alerta ${alert.id}:`,
          error
        );
      }
    }

    return jobsCreated;
  }

  /**
   * Encuentra el ID de usuario del agente responsable de un proceso.
   * Busca en la colección 'personnel' quién tiene el 'owner_position_id' del proceso.
   */
  private static async findResponsibleAgent(
    organizationId: string,
    processId: string
  ): Promise<string | null> {
    const db = getAdminFirestore();

    // 1. Obtener definición del proceso para ver el puesto responsable
    const processDoc = await db.collection('processes').doc(processId).get();

    if (!processDoc.exists) return null;
    const processData = processDoc.data();
    const ownerPositionId = processData?.owner_position_id;

    if (!ownerPositionId) return null;

    // 2. Buscar personal activo que ocupe ese puesto Y tenga acceso al sistema
    const personnelSnapshot = await db
      .collection('personnel')
      .where('organization_id', '==', organizationId)
      .where('puesto_id', '==', ownerPositionId)
      .where('estado', '==', 'Activo')
      .where('tiene_acceso_sistema', '==', true)
      .limit(1)
      .get();

    if (personnelSnapshot.empty) return null;

    const person = personnelSnapshot.docs[0].data() as Personnel;
    return person.user_id || null;
  }
}
