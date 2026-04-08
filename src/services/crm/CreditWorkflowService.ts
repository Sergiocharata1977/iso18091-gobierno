import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  CRM_RISK_SCORING_DISABLED_MESSAGE,
  hasCrmRiskScoringCapability,
} from '@/lib/plugins/crmRiskScoring';
import type {
  CreditWorkflow,
  CreditWorkflowProjection,
  CreditWorkflowResolution,
  CreditWorkflowStatus,
} from '@/types/crm-credit-workflow';
import type { EvaluacionRiesgo } from '@/types/crm-evaluacion-riesgo';
import type { OportunidadCRM } from '@/types/crm-oportunidad';

const COLLECTION = 'crm_credit_workflows';
const OPORTUNIDADES_COLLECTION = 'crm_oportunidades';

interface ListCreditWorkflowsFilters {
  status?: CreditWorkflowStatus;
  activo?: boolean;
  oportunidad_id?: string;
  crm_organizacion_id?: string;
  assigned_to_user_id?: string;
}

interface CreateCreditWorkflowInput {
  organization_id: string;
  oportunidad_id: string;
  crm_organizacion_id: string;
  cliente_nombre: string;
  oportunidad_nombre: string;
  stage_origin_id: string;
  stage_origin_name: string;
  status?: CreditWorkflowStatus;
  assigned_to_user_id?: string;
  assigned_to_user_name?: string;
  evaluacion_id_vigente?: string;
  sla_due_at?: string;
  notes?: string;
}

interface UpdateCreditWorkflowInput {
  status?: CreditWorkflowStatus;
  resolution?: CreditWorkflowResolution;
  assigned_to_user_id?: string | null;
  assigned_to_user_name?: string | null;
  evaluacion_id_vigente?: string | null;
  sla_due_at?: string | null;
  notes?: string | null;
}

interface MoveCreditWorkflowInput {
  status: CreditWorkflowStatus;
  resolution?: CreditWorkflowResolution;
  assigned_to_user_id?: string | null;
  assigned_to_user_name?: string | null;
  notes?: string | null;
}

interface CloseCreditWorkflowInput {
  resolution?: CreditWorkflowResolution;
  notes?: string | null;
}

interface EnsureCreditWorkflowInput {
  oportunidad: OportunidadCRM;
  stageOriginId: string;
  stageOriginName: string;
}

export class CreditWorkflowService {
  static async listByOrganization(
    organizationId: string,
    filters?: ListCreditWorkflowsFilters
  ): Promise<CreditWorkflow[]> {
    const db = getAdminFirestore();
    let query = db
      .collection(COLLECTION)
      .where('organization_id', '==', organizationId);

    if (filters?.activo !== undefined) {
      query = query.where('activo', '==', filters.activo);
    }
    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters?.oportunidad_id) {
      query = query.where('oportunidad_id', '==', filters.oportunidad_id);
    }
    if (filters?.crm_organizacion_id) {
      query = query.where(
        'crm_organizacion_id',
        '==',
        filters.crm_organizacion_id
      );
    }
    if (filters?.assigned_to_user_id) {
      query = query.where(
        'assigned_to_user_id',
        '==',
        filters.assigned_to_user_id
      );
    }

    const snapshot = await query.orderBy('updated_at', 'desc').get();
    return snapshot.docs.map(doc => this.hydrate(doc.id, doc.data()));
  }

  static async getById(id: string): Promise<CreditWorkflow | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return this.hydrate(doc.id, doc.data() || {});
  }

  static async getByOpportunityId(
    organizationId: string,
    oportunidadId: string
  ): Promise<CreditWorkflow | null> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('oportunidad_id', '==', oportunidadId)
      .orderBy('updated_at', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.hydrate(doc.id, doc.data());
  }

  static async createForOpportunity(
    input: CreateCreditWorkflowInput
  ): Promise<CreditWorkflow> {
    const capabilityEnabled = await hasCrmRiskScoringCapability(
      input.organization_id
    );
    if (!capabilityEnabled) {
      throw new Error(CRM_RISK_SCORING_DISABLED_MESSAGE);
    }

    const db = getAdminFirestore();
    const oportunidad = await this.getOpportunity(input.oportunidad_id);
    this.assertOpportunityScope(oportunidad, input.organization_id);

    const existing = await this.getByOpportunityId(
      input.organization_id,
      input.oportunidad_id
    );

    if (existing?.activo) {
      return existing;
    }

    const now = new Date().toISOString();
    const data: Omit<CreditWorkflow, 'id'> = {
      organization_id: input.organization_id,
      oportunidad_id: input.oportunidad_id,
      crm_organizacion_id: input.crm_organizacion_id,
      cliente_nombre: input.cliente_nombre,
      oportunidad_nombre: input.oportunidad_nombre,
      activo: true,
      status: input.status || 'pendiente',
      stage_origin_id: input.stage_origin_id,
      stage_origin_name: input.stage_origin_name,
      evaluacion_id_vigente: input.evaluacion_id_vigente,
      assigned_to_user_id: input.assigned_to_user_id,
      assigned_to_user_name: input.assigned_to_user_name,
      opened_at: now,
      updated_at: now,
      closed_at: undefined,
      resolution: undefined,
      sla_due_at: input.sla_due_at,
      notes: input.notes,
    };

    const docRef = await db.collection(COLLECTION).add(data);
    const workflow = { id: docRef.id, ...data };

    await this.syncOpportunityProjection(workflow);
    return workflow;
  }

  static async ensureForOpportunity(
    input: EnsureCreditWorkflowInput
  ): Promise<CreditWorkflow | null> {
    const capabilityEnabled = await hasCrmRiskScoringCapability(
      input.oportunidad.organization_id
    );

    if (!capabilityEnabled) {
      return null;
    }

    const existing = await this.getByOpportunityId(
      input.oportunidad.organization_id,
      input.oportunidad.id
    );

    if (!existing) {
      return this.createForOpportunity({
        organization_id: input.oportunidad.organization_id,
        oportunidad_id: input.oportunidad.id,
        crm_organizacion_id: input.oportunidad.crm_organizacion_id,
        cliente_nombre: input.oportunidad.organizacion_nombre,
        oportunidad_nombre: input.oportunidad.nombre,
        stage_origin_id: input.stageOriginId,
        stage_origin_name: input.stageOriginName,
        assigned_to_user_id: input.oportunidad.vendedor_id,
        assigned_to_user_name: input.oportunidad.vendedor_nombre,
      });
    }

    if (existing.activo) {
      await this.syncOpportunityProjection(existing);
      return existing;
    }

    const now = new Date().toISOString();
    await getAdminFirestore()
      .collection(COLLECTION)
      .doc(existing.id)
      .update({
        activo: true,
        status: 'pendiente',
        resolution: null,
        closed_at: null,
        stage_origin_id: input.stageOriginId,
        stage_origin_name: input.stageOriginName,
        updated_at: now,
      });

    const reactivated = await this.getById(existing.id);
    if (!reactivated) {
      throw new Error('Workflow crediticio no encontrado');
    }

    await this.syncOpportunityProjection(reactivated);
    return reactivated;
  }

  static async update(
    id: string,
    organizationId: string,
    input: UpdateCreditWorkflowInput
  ): Promise<CreditWorkflow> {
    const current = await this.getById(id);
    if (!current) throw new Error('Workflow crediticio no encontrado');
    if (current.organization_id !== organizationId) {
      throw new Error('Acceso denegado');
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      updated_at: now,
    };

    if (input.status !== undefined) updateData.status = input.status;
    if (input.resolution !== undefined) updateData.resolution = input.resolution;
    if (input.assigned_to_user_id !== undefined) {
      updateData.assigned_to_user_id = input.assigned_to_user_id || null;
    }
    if (input.assigned_to_user_name !== undefined) {
      updateData.assigned_to_user_name = input.assigned_to_user_name || null;
    }
    if (input.evaluacion_id_vigente !== undefined) {
      updateData.evaluacion_id_vigente = input.evaluacion_id_vigente || null;
    }
    if (input.sla_due_at !== undefined) {
      updateData.sla_due_at = input.sla_due_at || null;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes || null;
    }

    await getAdminFirestore().collection(COLLECTION).doc(id).update(updateData);

    const updated = await this.getById(id);
    if (!updated) throw new Error('Workflow crediticio no encontrado');

    await this.syncOpportunityProjection(updated);
    return updated;
  }

  static async moveStatus(
    id: string,
    organizationId: string,
    input: MoveCreditWorkflowInput
  ): Promise<CreditWorkflow> {
    return this.update(id, organizationId, {
      status: input.status,
      resolution: input.resolution,
      assigned_to_user_id: input.assigned_to_user_id,
      assigned_to_user_name: input.assigned_to_user_name,
      notes: input.notes,
    });
  }

  static async closeWorkflow(
    id: string,
    organizationId: string,
    input?: CloseCreditWorkflowInput
  ): Promise<CreditWorkflow> {
    const current = await this.getById(id);
    if (!current) throw new Error('Workflow crediticio no encontrado');
    if (current.organization_id !== organizationId) {
      throw new Error('Acceso denegado');
    }

    const now = new Date().toISOString();
    await getAdminFirestore()
      .collection(COLLECTION)
      .doc(id)
      .update({
        activo: false,
        status: 'cerrado',
        resolution: input?.resolution || current.resolution || null,
        notes: input?.notes ?? current.notes ?? null,
        closed_at: now,
        updated_at: now,
      });

    const updated = await this.getById(id);
    if (!updated) throw new Error('Workflow crediticio no encontrado');

    await this.syncOpportunityProjection(updated);
    return updated;
  }

  static async attachEvaluation(
    id: string,
    organizationId: string,
    evaluacionId: string,
    options?: {
      status?: CreditWorkflowStatus;
      resolution?: CreditWorkflowResolution;
    }
  ): Promise<CreditWorkflow> {
    return this.update(id, organizationId, {
      evaluacion_id_vigente: evaluacionId,
      status: options?.status,
      resolution: options?.resolution,
    });
  }

  static async syncOpportunityProjection(
    workflow: CreditWorkflow
  ): Promise<void> {
    const db = getAdminFirestore();
    const evaluacion = workflow.evaluacion_id_vigente
      ? await this.getEvaluacionVigente(workflow.evaluacion_id_vigente)
      : null;
    const projection: CreditWorkflowProjection = {
      workflow_id: workflow.id,
      activo: workflow.activo,
      status: workflow.status,
      resolution:
        workflow.resolution || this.resolveProjectionResolution(evaluacion),
      tier: evaluacion?.tier_asignado,
      limite_credito: evaluacion?.limite_credito_asignado,
      fecha_resolucion: this.resolveProjectionResolutionDate(workflow, evaluacion),
      updated_at: workflow.updated_at,
    };

    await db
      .collection(OPORTUNIDADES_COLLECTION)
      .doc(workflow.oportunidad_id)
      .set(
        {
          subprocesos: {
            crediticio: projection,
          },
          updated_at: workflow.updated_at,
        },
        { merge: true }
      );
  }

  private static async getOpportunity(id: string): Promise<OportunidadCRM | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(OPORTUNIDADES_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as OportunidadCRM;
  }

  private static async getEvaluacionVigente(
    id: string
  ): Promise<EvaluacionRiesgo | null> {
    const db = getAdminFirestore();
    const doc = await db.collection('crm_evaluaciones_riesgo').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as EvaluacionRiesgo;
  }

  private static assertOpportunityScope(
    oportunidad: OportunidadCRM | null,
    organizationId: string
  ): asserts oportunidad is OportunidadCRM {
    if (!oportunidad) {
      throw new Error('Oportunidad no encontrada');
    }
    if (oportunidad.organization_id !== organizationId) {
      throw new Error('Acceso denegado');
    }
  }

  private static hydrate(
    id: string,
    raw: FirebaseFirestore.DocumentData
  ): CreditWorkflow {
    return {
      id,
      organization_id: raw.organization_id,
      oportunidad_id: raw.oportunidad_id,
      crm_organizacion_id: raw.crm_organizacion_id,
      cliente_nombre: raw.cliente_nombre,
      oportunidad_nombre: raw.oportunidad_nombre,
      activo: raw.activo ?? true,
      status: raw.status,
      resolution: raw.resolution,
      stage_origin_id: raw.stage_origin_id,
      stage_origin_name: raw.stage_origin_name,
      evaluacion_id_vigente: raw.evaluacion_id_vigente,
      assigned_to_user_id: raw.assigned_to_user_id,
      assigned_to_user_name: raw.assigned_to_user_name,
      opened_at: raw.opened_at,
      updated_at: raw.updated_at,
      closed_at: raw.closed_at,
      sla_due_at: raw.sla_due_at,
      notes: raw.notes,
    };
  }

  private static resolveProjectionResolution(
    evaluacion: EvaluacionRiesgo | null
  ): CreditWorkflowResolution | undefined {
    if (!evaluacion) {
      return undefined;
    }

    if (evaluacion.estado === 'rechazada') {
      return 'rechazado';
    }

    if (evaluacion.estado !== 'aprobada') {
      return undefined;
    }

    if (evaluacion.tier_asignado === 'REPROBADO') {
      return 'rechazado';
    }

    return 'aprobado';
  }

  private static resolveProjectionResolutionDate(
    workflow: CreditWorkflow,
    evaluacion: EvaluacionRiesgo | null
  ): string | undefined {
    if (workflow.closed_at) {
      return workflow.closed_at;
    }

    if (!evaluacion) {
      return undefined;
    }

    if (evaluacion.estado === 'aprobada' || evaluacion.estado === 'rechazada') {
      return evaluacion.updated_at;
    }

    return undefined;
  }
}
