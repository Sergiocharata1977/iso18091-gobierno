// src/services/crm/EvaluacionRiesgoService.ts
// Servicio para gestión de evaluaciones de riesgo crediticio

import { getAdminFirestore } from '@/lib/firebase/admin';
import { CreditWorkflowService } from '@/services/crm/CreditWorkflowService';
import type {
  CategoriaItem,
  ConfigScoring,
  CreateEvaluacionData,
  EvaluacionRiesgo,
  ItemEvaluacion,
  ResultadoCalculo,
  TierCredito,
  UpdateEvaluacionData,
} from '@/types/crm-evaluacion-riesgo';

export class EvaluacionRiesgoService {
  private static readonly COLLECTION = 'crm_evaluaciones_riesgo';
  private static readonly ITEMS_COLLECTION = 'items';
  private static readonly CONFIG_COLLECTION = 'crm_config_scoring';

  // ============================================================
  // CRUD EVALUACIONES
  // ============================================================

  static async getByOrganization(
    organizationId: string,
    soloVigentes = false
  ): Promise<EvaluacionRiesgo[]> {
    const db = getAdminFirestore();
    let query = db
      .collection(this.COLLECTION)
      .where('organization_id', '==', organizationId);

    if (soloVigentes) {
      query = query.where('es_vigente', '==', true);
    }

    const snapshot = await query.orderBy('created_at', 'desc').get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as EvaluacionRiesgo[];
  }

  static async getById(id: string): Promise<EvaluacionRiesgo | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(this.COLLECTION).doc(id).get();

    if (!doc.exists) return null;

    return { id: doc.id, ...doc.data() } as EvaluacionRiesgo;
  }

  static async getByCliente(
    organizationId: string,
    clienteId: string
  ): Promise<EvaluacionRiesgo[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('crm_organizacion_id', '==', clienteId)
      .orderBy('created_at', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as EvaluacionRiesgo[];
  }

  static async create(
    organizationId: string,
    userId: string,
    userName: string,
    data: CreateEvaluacionData
  ): Promise<EvaluacionRiesgo> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Obtener configuración de scoring
    const config = await this.getOrCreateConfig(organizationId);

    // Calcular scores
    const resultado = this.calcularScores(
      data.items,
      data.patrimonio_neto_computable,
      config
    );

    // Marcar evaluaciones anteriores como no vigentes
    await this.marcarAnterioresNoVigentes(
      organizationId,
      data.crm_organizacion_id
    );

    // Crear evaluación
    const evaluacionData: Omit<EvaluacionRiesgo, 'id'> = {
      organization_id: organizationId,
      crm_organizacion_id: data.crm_organizacion_id,
      oportunidad_id: data.oportunidad_id,
      credit_workflow_id: data.credit_workflow_id,
      cliente_nombre: data.cliente_nombre,
      cliente_cuit: data.cliente_cuit,
      fecha_evaluacion: now,
      evaluador_id: userId,
      evaluador_nombre: userName,
      estado: 'borrador',
      score_cualitativos: resultado.score_cualitativos,
      score_conflictos: resultado.score_conflictos,
      score_cuantitativos: resultado.score_cuantitativos,
      score_nosis: data.score_nosis,
      score_ponderado_total: resultado.score_ponderado_total,
      tier_sugerido: resultado.tier_sugerido,
      patrimonio_neto_computable: data.patrimonio_neto_computable,
      capital_garantia: resultado.capital_garantia,
      evaluacion_personal: data.evaluacion_personal,
      es_vigente: true,
      created_at: now,
      updated_at: now,
    };

    const docRef = await db.collection(this.COLLECTION).add(evaluacionData);

    // Guardar items
    await this.guardarItems(docRef.id, data.items, config);

    const evaluacion = { id: docRef.id, ...evaluacionData };
    await this.syncWorkflowWithEvaluation(evaluacion, 'create');

    return evaluacion;
  }

  static async update(id: string, data: UpdateEvaluacionData): Promise<void> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();
    const current = await this.getById(id);

    if (!current) {
      throw new Error('Evaluación no encontrada');
    }

    const updateData: Record<string, unknown> = {
      updated_at: now,
    };

    if (data.tier_asignado !== undefined) {
      updateData.tier_asignado = data.tier_asignado;
    }
    if (data.limite_credito_asignado !== undefined) {
      updateData.limite_credito_asignado = data.limite_credito_asignado;
    }
    if (data.evaluacion_personal !== undefined) {
      updateData.evaluacion_personal = data.evaluacion_personal;
    }
    if (data.estado !== undefined) {
      updateData.estado = data.estado;
    }
    if (data.score_nosis !== undefined) {
      updateData.score_nosis = data.score_nosis;
    }
    if (data.oportunidad_id !== undefined) {
      updateData.oportunidad_id = data.oportunidad_id;
    }
    if (data.credit_workflow_id !== undefined) {
      updateData.credit_workflow_id = data.credit_workflow_id;
    }

    await db.collection(this.COLLECTION).doc(id).update(updateData);

    const updated: EvaluacionRiesgo = {
      ...current,
      ...updateData,
      id,
      updated_at: now,
      oportunidad_id:
        data.oportunidad_id !== undefined
          ? data.oportunidad_id
          : current.oportunidad_id,
      credit_workflow_id:
        data.credit_workflow_id !== undefined
          ? data.credit_workflow_id
          : current.credit_workflow_id,
    } as EvaluacionRiesgo;

    await this.syncWorkflowWithEvaluation(updated, 'update');
  }

  static async delete(id: string): Promise<void> {
    const db = getAdminFirestore();

    // Eliminar items primero
    const itemsSnapshot = await db
      .collection(this.COLLECTION)
      .doc(id)
      .collection(this.ITEMS_COLLECTION)
      .get();

    const batch = db.batch();
    itemsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection(this.COLLECTION).doc(id));

    await batch.commit();
  }

  static async aprobar(
    id: string,
    tierAsignado: TierCredito,
    limiteCreditoAsignado: number
  ): Promise<{ success: boolean; error?: string }> {
    const evaluacion = await this.getById(id);
    if (!evaluacion) {
      return { success: false, error: 'Evaluación no encontrada' };
    }

    // Validar que el límite no supere el capital garantía
    if (limiteCreditoAsignado > evaluacion.capital_garantia) {
      return {
        success: false,
        error: `El límite no puede superar el 50% del patrimonio ($${evaluacion.capital_garantia.toLocaleString()})`,
      };
    }

    await this.update(id, {
      tier_asignado: tierAsignado,
      limite_credito_asignado: limiteCreditoAsignado,
      estado: 'aprobada',
    });

    return { success: true };
  }

  static async rechazar(
    id: string,
    evaluacionPersonal?: string
  ): Promise<{ success: boolean; error?: string }> {
    const evaluacion = await this.getById(id);
    if (!evaluacion) {
      return { success: false, error: 'Evaluación no encontrada' };
    }

    await this.update(id, {
      estado: 'rechazada',
      evaluacion_personal: evaluacionPersonal ?? evaluacion.evaluacion_personal,
    });

    return { success: true };
  }

  // ============================================================
  // CÁLCULOS
  // ============================================================

  static calcularScores(
    items: { categoria: CategoriaItem; item_key: string; puntaje: number }[],
    patrimonioNeto: number,
    config: ConfigScoring
  ): ResultadoCalculo {
    // Agrupar por categoría
    const cualitativos = items.filter(i => i.categoria === 'cualitativos');
    const conflictos = items.filter(i => i.categoria === 'conflictos');
    const cuantitativos = items.filter(i => i.categoria === 'cuantitativos');

    // Calcular promedio por categoría
    const score_cualitativos = this.calcularPromedio(cualitativos);
    const score_conflictos = this.calcularPromedio(conflictos);
    const score_cuantitativos = this.calcularPromedio(cuantitativos);

    // Calcular score ponderado total
    const score_ponderado_total =
      score_cualitativos * config.peso_cualitativos +
      score_conflictos * config.peso_conflictos +
      score_cuantitativos * config.peso_cuantitativos;

    // Determinar tier sugerido
    let tier_sugerido: TierCredito;
    if (score_ponderado_total >= config.tier_a_min_score) {
      tier_sugerido = 'A';
    } else if (score_ponderado_total >= config.tier_b_min_score) {
      tier_sugerido = 'B';
    } else if (score_ponderado_total >= config.tier_c_min_score) {
      tier_sugerido = 'C';
    } else {
      tier_sugerido = 'REPROBADO';
    }

    // Calcular capital garantía y límites
    const capital_garantia = patrimonioNeto * 0.5;

    return {
      score_cualitativos: Math.round(score_cualitativos * 100) / 100,
      score_conflictos: Math.round(score_conflictos * 100) / 100,
      score_cuantitativos: Math.round(score_cuantitativos * 100) / 100,
      score_ponderado_total: Math.round(score_ponderado_total * 100) / 100,
      tier_sugerido,
      capital_garantia,
      limite_maximo_sugerido: {
        tier_a: patrimonioNeto * config.tier_a_max_patrimonio,
        tier_b: patrimonioNeto * config.tier_b_max_patrimonio,
        tier_c: patrimonioNeto * config.tier_c_max_patrimonio,
      },
    };
  }

  private static calcularPromedio(items: { puntaje: number }[]): number {
    if (items.length === 0) return 0;
    const suma = items.reduce((acc, item) => acc + item.puntaje, 0);
    return suma / items.length;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private static async marcarAnterioresNoVigentes(
    organizationId: string,
    clienteId: string
  ): Promise<void> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('crm_organizacion_id', '==', clienteId)
      .where('es_vigente', '==', true)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { es_vigente: false });
    });
    await batch.commit();
  }

  private static async guardarItems(
    evaluacionId: string,
    items: {
      categoria: CategoriaItem;
      item_key: string;
      puntaje: number;
      observaciones?: string;
    }[],
    config: ConfigScoring
  ): Promise<void> {
    const db = getAdminFirestore();
    const batch = db.batch();

    for (const item of items) {
      const pesoCategoria = this.getPesoCategoria(item.categoria, config);
      const pesoItem = this.getPesoItem(item.categoria, item.item_key);
      const nombreItem = this.getNombreItem(item.categoria, item.item_key);

      const itemData: Omit<ItemEvaluacion, 'id'> = {
        evaluacion_id: evaluacionId,
        categoria: item.categoria,
        item_key: item.item_key,
        item_nombre: nombreItem,
        puntaje: item.puntaje,
        peso_categoria: pesoCategoria,
        peso_item: pesoItem,
        puntaje_ponderado: item.puntaje * pesoCategoria * pesoItem,
        observaciones: item.observaciones,
      };

      const ref = db
        .collection(this.COLLECTION)
        .doc(evaluacionId)
        .collection(this.ITEMS_COLLECTION)
        .doc();
      batch.set(ref, itemData);
    }

    await batch.commit();
  }

  private static async syncWorkflowWithEvaluation(
    evaluacion: EvaluacionRiesgo,
    reason: 'create' | 'update'
  ): Promise<void> {
    const workflow = await this.resolveWorkflowForEvaluation(evaluacion);
    if (!workflow) {
      return;
    }

    const statusMap: Partial<
      Record<EvaluacionRiesgo['estado'], 'en_analisis' | 'aprobado' | 'rechazado'>
    > = {
      borrador: 'en_analisis',
      pendiente: 'en_analisis',
      aprobada: 'aprobado',
      rechazada: 'rechazado',
    };

    const workflowStatus =
      statusMap[evaluacion.estado] ||
      (reason === 'create' ? 'en_analisis' : undefined);

    await CreditWorkflowService.attachEvaluation(
      workflow.id,
      evaluacion.organization_id,
      evaluacion.id,
      {
        status: workflowStatus,
        resolution:
          evaluacion.estado === 'aprobada'
            ? 'aprobado'
            : evaluacion.estado === 'rechazada'
              ? 'rechazado'
              : undefined,
      }
    );

    if (reason === 'update' && evaluacion.estado === 'aprobada') {
      await CreditWorkflowService.closeWorkflow(
        workflow.id,
        evaluacion.organization_id,
        { resolution: 'aprobado' }
      );
    }

    if (reason === 'update' && evaluacion.estado === 'rechazada') {
      await CreditWorkflowService.closeWorkflow(
        workflow.id,
        evaluacion.organization_id,
        { resolution: 'rechazado' }
      );
    }
  }

  private static async resolveWorkflowForEvaluation(
    evaluacion: EvaluacionRiesgo
  ) {
    if (evaluacion.credit_workflow_id) {
      const workflow = await CreditWorkflowService.getById(
        evaluacion.credit_workflow_id
      );

      if (workflow?.organization_id === evaluacion.organization_id) {
        return workflow;
      }
    }

    if (!evaluacion.oportunidad_id) {
      return null;
    }

    return CreditWorkflowService.getByOpportunityId(
      evaluacion.organization_id,
      evaluacion.oportunidad_id
    );
  }

  private static getPesoCategoria(
    categoria: CategoriaItem,
    config: ConfigScoring
  ): number {
    switch (categoria) {
      case 'cualitativos':
        return config.peso_cualitativos;
      case 'conflictos':
        return config.peso_conflictos;
      case 'cuantitativos':
        return config.peso_cuantitativos;
    }
  }

  private static getPesoItem(
    categoria: CategoriaItem,
    itemKey: string
  ): number {
    const items = this.getItemsDefinition(categoria);
    const item = items.find((i: { key: string }) => i.key === itemKey);
    return item?.peso || 0;
  }

  private static getNombreItem(
    categoria: CategoriaItem,
    itemKey: string
  ): string {
    const items = this.getItemsDefinition(categoria);
    const item = items.find((i: { key: string }) => i.key === itemKey);
    return item?.nombre || itemKey;
  }

  private static getItemsDefinition(
    categoria: CategoriaItem
  ): readonly { key: string; nombre: string; peso: number }[] {
    // Import constants inline to avoid circular dependency
    const ITEMS_CUALITATIVOS = [
      {
        key: 'capacidad_direccion',
        nombre: 'Capacidad de la dirección',
        peso: 0.143,
      },
      {
        key: 'condiciones_ramo',
        nombre: 'Condiciones del ramo o actividad',
        peso: 0.143,
      },
      {
        key: 'organizacion_controles',
        nombre: 'Organización y controles',
        peso: 0.143,
      },
      {
        key: 'cheques_rechazados_empresa',
        nombre: 'Cheques rechazados en la Empresa',
        peso: 0.143,
      },
      {
        key: 'terminos_pago',
        nombre: 'Términos y condiciones de pago (cumplimiento)',
        peso: 0.143,
      },
      {
        key: 'potencial_crecimiento',
        nombre: 'Potencialidad y capacidad de crecimiento',
        peso: 0.143,
      },
      {
        key: 'nivel_fidelizacion',
        nombre: 'Nivel de fidelización',
        peso: 0.142,
      },
    ];

    const ITEMS_CONFLICTOS = [
      {
        key: 'concursos_quiebras',
        nombre: 'Concursos y quiebras',
        peso: 0.333,
      },
      { key: 'problemas_fiscales', nombre: 'Problemas fiscales', peso: 0.333 },
      {
        key: 'cheques_rechazados_historial',
        nombre: 'Cheques rechazados (historial)',
        peso: 0.334,
      },
    ];

    const ITEMS_CUANTITATIVOS = [
      { key: 'situacion_economica', nombre: 'Situación económica', peso: 0.25 },
      {
        key: 'situacion_financiera',
        nombre: 'Situación financiera',
        peso: 0.25,
      },
      { key: 'volumenes_operados', nombre: 'Volúmenes operados', peso: 0.25 },
      {
        key: 'situacion_patrimonial',
        nombre: 'Situación patrimonial',
        peso: 0.25,
      },
    ];

    switch (categoria) {
      case 'cualitativos':
        return ITEMS_CUALITATIVOS;
      case 'conflictos':
        return ITEMS_CONFLICTOS;
      case 'cuantitativos':
        return ITEMS_CUANTITATIVOS;
    }
  }

  // ============================================================
  // CONFIGURACIÓN
  // ============================================================

  static async getOrCreateConfig(
    organizationId: string
  ): Promise<ConfigScoring> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(this.CONFIG_COLLECTION)
      .where('organization_id', '==', organizationId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      } as ConfigScoring;
    }

    // Crear configuración por defecto
    const now = new Date().toISOString();
    const configData = {
      organization_id: organizationId,
      peso_cualitativos: 0.43,
      peso_conflictos: 0.31,
      peso_cuantitativos: 0.26,
      tier_a_min_score: 8,
      tier_a_max_patrimonio: 0.5,
      tier_b_min_score: 6,
      tier_b_max_patrimonio: 0.4,
      tier_c_min_score: 4,
      tier_c_max_patrimonio: 0.3,
      frecuencia_actualizacion_meses: 12,
      created_at: now,
      updated_at: now,
    };

    const docRef = await db.collection(this.CONFIG_COLLECTION).add(configData);
    return { id: docRef.id, ...configData };
  }

  static async updateConfig(
    id: string,
    data: Partial<ConfigScoring>
  ): Promise<void> {
    const db = getAdminFirestore();
    await db
      .collection(this.CONFIG_COLLECTION)
      .doc(id)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      });
  }
}
