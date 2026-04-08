// src/services/crm/OportunidadesService.ts
// Service para gestión de oportunidades CRM

import { getAdminFirestore } from '@/lib/firebase/admin';
import { CreditWorkflowService } from '@/services/crm/CreditWorkflowService';
import type { EstadoClienteKanban } from '@/types/crm';
import type {
  CreateOportunidadData,
  HistorialEstadoOportunidad,
  MoverOportunidadData,
  OportunidadCRM,
  UpdateOportunidadData,
} from '@/types/crm-oportunidad';

const COLLECTION = 'crm_oportunidades';
const KANBAN_COLLECTIONS = ['crm_kanban_estados', 'kanban_estados'] as const;

export class OportunidadesService {
  private static async obtenerEstadoKanbanDestino(
    oportunidad: OportunidadCRM,
    estadoId: string
  ): Promise<EstadoClienteKanban | null> {
    const db = getAdminFirestore();

    for (const collectionName of KANBAN_COLLECTIONS) {
      const doc = await db.collection(collectionName).doc(estadoId).get();
      if (!doc.exists) {
        continue;
      }

      const estado = {
        id: doc.id,
        ...doc.data(),
      } as EstadoClienteKanban;

      if (
        estado.organization_id &&
        estado.organization_id !== oportunidad.organization_id
      ) {
        continue;
      }

      if (estado.tipo && estado.tipo !== 'crm') {
        continue;
      }

      return estado;
    }

    return null;
  }

  private static requiereWorkflowCrediticio(
    estado: EstadoClienteKanban | null,
    fallbackNombre: string
  ): boolean {
    if (
      estado?.requires_credit_workflow === true &&
      estado?.credit_workflow_trigger === 'entry'
    ) {
      return true;
    }

    if (estado?.requires_credit_workflow === true) {
      return true;
    }

    return /(gestion crediticia|gestión crediticia|evaluacion|evaluación|credito|crédito)/i.test(
      fallbackNombre
    );
  }

  /**
   * Lista todas las oportunidades de una organización
   */
  static async listar(
    organizationId: string,
    filtros?: {
      estado_kanban_id?: string;
      vendedor_id?: string;
      crm_organizacion_id?: string;
    }
  ): Promise<OportunidadCRM[]> {
    const db = getAdminFirestore();
    let query = db
      .collection(COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('isActive', '==', true);

    if (filtros?.estado_kanban_id) {
      query = query.where('estado_kanban_id', '==', filtros.estado_kanban_id);
    }
    if (filtros?.vendedor_id) {
      query = query.where('vendedor_id', '==', filtros.vendedor_id);
    }
    if (filtros?.crm_organizacion_id) {
      query = query.where(
        'crm_organizacion_id',
        '==',
        filtros.crm_organizacion_id
      );
    }

    const snapshot = await query.orderBy('created_at', 'desc').get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as OportunidadCRM[];
  }

  /**
   * Obtiene una oportunidad por ID
   */
  static async obtener(id: string): Promise<OportunidadCRM | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) return null;

    return { id: doc.id, ...doc.data() } as OportunidadCRM;
  }

  /**
   * Crea una nueva oportunidad
   */
  static async crear(
    organizationId: string,
    userId: string,
    data: CreateOportunidadData
  ): Promise<OportunidadCRM> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    const oportunidadData: Omit<OportunidadCRM, 'id'> = {
      organization_id: organizationId,
      nombre: data.nombre,
      descripcion: data.descripcion || '',
      crm_organizacion_id: data.crm_organizacion_id,
      organizacion_nombre: data.organizacion_nombre,
      organizacion_cuit: data.organizacion_cuit || '',
      contacto_id: data.contacto_id || undefined,
      contacto_nombre: data.contacto_nombre || '',
      vendedor_id: data.vendedor_id,
      vendedor_nombre: data.vendedor_nombre,
      estado_kanban_id: data.estado_kanban_id,
      estado_kanban_nombre: data.estado_kanban_nombre,
      estado_kanban_color: data.estado_kanban_color,
      historial_estados: [],
      monto_estimado: data.monto_estimado || 0,
      probabilidad: data.probabilidad || 50,
      fecha_cierre_estimada: data.fecha_cierre_estimada || undefined,
      productos_interes: data.productos_interes || [],
      origen_solicitud: data.origen_solicitud,
      resultado: undefined,
      motivo_cierre: undefined,
      fecha_cierre_real: undefined,
      created_at: now,
      updated_at: now,
      created_by: userId,
      isActive: true,
    };

    const docRef = await db.collection(COLLECTION).add(oportunidadData);

    return { id: docRef.id, ...oportunidadData } as OportunidadCRM;
  }

  /**
   * Actualiza una oportunidad
   */
  static async actualizar(
    id: string,
    data: UpdateOportunidadData
  ): Promise<OportunidadCRM> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    const updateData = {
      ...data,
      updated_at: now,
    };

    await db.collection(COLLECTION).doc(id).update(updateData);

    const updated = await this.obtener(id);
    return updated!;
  }

  /**
   * Mueve una oportunidad a un nuevo estado (Kanban)
   */
  static async moverEstado(
    data: MoverOportunidadData
  ): Promise<OportunidadCRM> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    const oportunidad = await this.obtener(data.oportunidad_id);
    if (!oportunidad) throw new Error('Oportunidad no encontrada');
    const estadoDestino = await this.obtenerEstadoKanbanDestino(
      oportunidad,
      data.estado_nuevo_id
    );
    const estadoNuevoNombre =
      estadoDestino?.nombre || data.estado_nuevo_nombre;
    const estadoNuevoColor = estadoDestino?.color || data.estado_nuevo_color;

    const historialEntry: HistorialEstadoOportunidad = {
      estado_anterior_id: oportunidad.estado_kanban_id,
      estado_anterior_nombre: oportunidad.estado_kanban_nombre,
      estado_nuevo_id: data.estado_nuevo_id,
      estado_nuevo_nombre: estadoNuevoNombre,
      fecha_cambio: now,
      usuario_id: data.usuario_id,
      usuario_nombre: data.usuario_nombre,
      motivo: data.motivo,
    };

    await db
      .collection(COLLECTION)
      .doc(data.oportunidad_id)
      .update({
        estado_kanban_id: data.estado_nuevo_id,
        estado_kanban_nombre: estadoNuevoNombre,
        estado_kanban_color: estadoNuevoColor,
        historial_estados: [...oportunidad.historial_estados, historialEntry],
        updated_at: now,
      });

    const oportunidadActualizada = (await this.obtener(data.oportunidad_id))!;

    if (
      this.requiereWorkflowCrediticio(
        estadoDestino,
        oportunidadActualizada.estado_kanban_nombre
      )
    ) {
      await CreditWorkflowService.ensureForOpportunity({
        oportunidad: oportunidadActualizada,
        stageOriginId: data.estado_nuevo_id,
        stageOriginName: estadoNuevoNombre,
      });
    }

    return (await this.obtener(data.oportunidad_id))!;
  }

  /**
   * Cierra una oportunidad (ganada, perdida, cancelada)
   */
  static async cerrar(
    id: string,
    resultado: 'ganada' | 'perdida' | 'cancelada',
    motivo?: string
  ): Promise<OportunidadCRM> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    await db
      .collection(COLLECTION)
      .doc(id)
      .update({
        resultado,
        motivo_cierre: motivo || null,
        fecha_cierre_real: now,
        updated_at: now,
      });

    return (await this.obtener(id))!;
  }

  /**
   * Elimina (soft delete) una oportunidad
   */
  static async eliminar(id: string): Promise<void> {
    const db = getAdminFirestore();

    await db.collection(COLLECTION).doc(id).update({
      isActive: false,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Obtiene métricas del pipeline
   */
  static async obtenerMetricas(organizationId: string): Promise<{
    total_oportunidades: number;
    monto_total_pipeline: number;
    por_estado: { estado: string; cantidad: number; monto: number }[];
  }> {
    const oportunidades = await this.listar(organizationId);

    const porEstado = oportunidades.reduce(
      (acc, op) => {
        const key = op.estado_kanban_id;
        if (!acc[key]) {
          acc[key] = { estado: op.estado_kanban_nombre, cantidad: 0, monto: 0 };
        }
        acc[key].cantidad++;
        acc[key].monto += op.monto_estimado;
        return acc;
      },
      {} as Record<string, { estado: string; cantidad: number; monto: number }>
    );

    return {
      total_oportunidades: oportunidades.length,
      monto_total_pipeline: oportunidades.reduce(
        (sum, op) => sum + op.monto_estimado,
        0
      ),
      por_estado: Object.values(porEstado),
    };
  }
}
