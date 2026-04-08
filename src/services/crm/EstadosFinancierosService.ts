// src/services/crm/EstadosFinancierosService.ts
// Servicio para gestión de Estados de Situación Patrimonial y Estados de Resultados

import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  ActivoCorriente,
  ActivoNoCorriente,
  CreateEstadoResultadosDTO,
  CreateEstadoSituacionDTO,
  EstadoResultados,
  EstadoSituacionPatrimonial,
  PasivoCorriente,
  PasivoNoCorriente,
  PatrimonioNeto,
  ResultadosDescontinuacion,
  ResultadosOperacionesContinuan,
} from '@/types/crm-estados-financieros';

const COLLECTION_SITUACION = 'crm_estados_situacion_patrimonial';
const COLLECTION_RESULTADOS = 'crm_estados_resultados';

export class EstadosFinancierosService {
  // ========================================
  // CÁLCULOS AUTOMÁTICOS
  // ========================================

  private static calcularTotalActivoCorriente(activo: ActivoCorriente): number {
    return (
      activo.caja_bancos +
      activo.inversiones_temporarias +
      activo.creditos_por_ventas +
      activo.otros_creditos +
      activo.bienes_de_cambio +
      activo.otros_activos
    );
  }

  private static calcularTotalActivoNoCorriente(
    activo: ActivoNoCorriente
  ): number {
    return (
      activo.creditos_por_ventas +
      activo.otros_creditos +
      activo.bienes_de_cambio +
      activo.bienes_de_uso +
      activo.participacion_sociedades +
      activo.otras_inversiones +
      activo.activos_intangibles +
      activo.otros_activos
    );
  }

  private static calcularTotalPasivoCorriente(pasivo: PasivoCorriente): number {
    return (
      pasivo.deudas_comerciales +
      pasivo.prestamos +
      pasivo.remuneraciones_cargas_sociales +
      pasivo.cargas_fiscales +
      pasivo.anticipos_clientes +
      pasivo.dividendos_pagar +
      pasivo.otras_deudas +
      pasivo.previsiones
    );
  }

  private static calcularTotalPasivoNoCorriente(
    pasivo: PasivoNoCorriente
  ): number {
    return pasivo.deudas + pasivo.previsiones;
  }

  private static calcularTotalPatrimonioNeto(pn: PatrimonioNeto): number {
    return (
      pn.capital +
      pn.ajuste_capital +
      pn.reservas +
      pn.resultados_acumulados +
      pn.resultado_ejercicio
    );
  }

  private static calcularResultados(
    continuan: ResultadosOperacionesContinuan,
    descontinuacion: ResultadosDescontinuacion,
    extraordinarios: number
  ): {
    ganancia_bruta: number;
    ganancia_antes_impuestos: number;
    ganancia_operaciones_continuan: number;
    ganancia_operaciones_descontinuacion: number;
    ganancia_operaciones_ordinarias: number;
    ganancia_perdida_ejercicio: number;
  } {
    // Ganancia Bruta = Ventas - Costo
    const ganancia_bruta =
      continuan.ventas_netas - continuan.costo_bienes_vendidos;

    // Resultado operativo
    const resultado_operativo =
      ganancia_bruta +
      continuan.resultado_valuacion_bienes_cambio -
      continuan.gastos_comercializacion -
      continuan.gastos_administracion -
      continuan.otros_gastos;

    // Resultados financieros
    const resultados_financieros =
      continuan.resultados_inversiones_relacionados +
      continuan.resultados_otras_inversiones +
      continuan.resultados_financieros_activos -
      continuan.resultados_financieros_pasivos +
      continuan.otros_ingresos_egresos;

    // Ganancia antes de impuestos
    const ganancia_antes_impuestos =
      resultado_operativo + resultados_financieros;

    // Ganancia operaciones continúan
    const ganancia_operaciones_continuan =
      ganancia_antes_impuestos - continuan.impuesto_ganancias;

    // Ganancia operaciones descontinuación
    const ganancia_operaciones_descontinuacion =
      descontinuacion.resultados_operaciones +
      descontinuacion.resultados_disposicion_activos;

    // Ganancia operaciones ordinarias
    const ganancia_operaciones_ordinarias =
      ganancia_operaciones_continuan + ganancia_operaciones_descontinuacion;

    // GANANCIA/PÉRDIDA DEL EJERCICIO
    const ganancia_perdida_ejercicio =
      ganancia_operaciones_ordinarias + extraordinarios;

    return {
      ganancia_bruta,
      ganancia_antes_impuestos,
      ganancia_operaciones_continuan,
      ganancia_operaciones_descontinuacion,
      ganancia_operaciones_ordinarias,
      ganancia_perdida_ejercicio,
    };
  }

  // ========================================
  // ESTADO DE SITUACIÓN PATRIMONIAL - CRUD
  // ========================================

  static async createSituacionPatrimonial(
    organizationId: string,
    userId: string,
    data: CreateEstadoSituacionDTO
  ): Promise<EstadoSituacionPatrimonial> {
    const db = getAdminFirestore();

    // Calcular totales
    const total_activo_corriente = this.calcularTotalActivoCorriente(
      data.activo_corriente
    );
    const total_activo_no_corriente = this.calcularTotalActivoNoCorriente(
      data.activo_no_corriente
    );
    const total_activo = total_activo_corriente + total_activo_no_corriente;

    const total_pasivo_corriente = this.calcularTotalPasivoCorriente(
      data.pasivo_corriente
    );
    const total_pasivo_no_corriente = this.calcularTotalPasivoNoCorriente(
      data.pasivo_no_corriente
    );
    const total_pasivo = total_pasivo_corriente + total_pasivo_no_corriente;

    // Obtener resultado del ejercicio desde Estado de Resultados si existe
    let resultado_ejercicio = 0;
    const resultadoSnapshot = await db
      .collection(COLLECTION_RESULTADOS)
      .where('organization_id', '==', organizationId)
      .where('crm_organizacion_id', '==', data.crm_organizacion_id)
      .where('ejercicio', '==', data.ejercicio)
      .limit(1)
      .get();

    if (!resultadoSnapshot.empty) {
      const resultadoData =
        resultadoSnapshot.docs[0].data() as EstadoResultados;
      resultado_ejercicio = resultadoData.ganancia_perdida_ejercicio;
    }

    const patrimonio_neto: PatrimonioNeto = {
      ...data.patrimonio_neto,
      resultado_ejercicio,
    };

    const total_patrimonio_neto =
      this.calcularTotalPatrimonioNeto(patrimonio_neto);
    const total_pasivo_patrimonio = total_pasivo + total_patrimonio_neto;

    // Ratios
    const liquidez_corriente =
      total_pasivo_corriente > 0
        ? total_activo_corriente / total_pasivo_corriente
        : 0;
    const solvencia =
      total_pasivo > 0 ? total_patrimonio_neto / total_pasivo : 0;
    const endeudamiento = total_activo > 0 ? total_pasivo / total_activo : 0;

    const now = new Date().toISOString();
    const docRef = db.collection(COLLECTION_SITUACION).doc();

    const estado: EstadoSituacionPatrimonial = {
      id: docRef.id,
      organization_id: organizationId,
      crm_organizacion_id: data.crm_organizacion_id,
      cliente_nombre: data.cliente_nombre,
      cliente_cuit: data.cliente_cuit,
      ejercicio: data.ejercicio,
      fecha_cierre: data.fecha_cierre,
      fuente_datos: data.fuente_datos,
      activo_corriente: data.activo_corriente,
      activo_no_corriente: data.activo_no_corriente,
      pasivo_corriente: data.pasivo_corriente,
      pasivo_no_corriente: data.pasivo_no_corriente,
      patrimonio_neto,
      total_activo_corriente,
      total_activo_no_corriente,
      total_activo,
      total_pasivo_corriente,
      total_pasivo_no_corriente,
      total_pasivo,
      total_patrimonio_neto,
      total_pasivo_patrimonio,
      liquidez_corriente,
      solvencia,
      endeudamiento,
      observaciones: data.observaciones,
      created_at: now,
      updated_at: now,
      created_by: userId,
    };

    await docRef.set(estado);
    return estado;
  }

  static async getSituacionPatrimonialByCliente(
    organizationId: string,
    clienteId: string
  ): Promise<EstadoSituacionPatrimonial[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(COLLECTION_SITUACION)
      .where('organization_id', '==', organizationId)
      .where('crm_organizacion_id', '==', clienteId)
      .orderBy('ejercicio', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as EstadoSituacionPatrimonial);
  }

  static async getSituacionPatrimonialById(
    id: string
  ): Promise<EstadoSituacionPatrimonial | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION_SITUACION).doc(id).get();
    return doc.exists ? (doc.data() as EstadoSituacionPatrimonial) : null;
  }

  static async updateSituacionPatrimonial(
    id: string,
    data: Partial<CreateEstadoSituacionDTO>
  ): Promise<void> {
    const db = getAdminFirestore();
    const updateData: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Recalcular totales si hay datos de activo/pasivo
    if (data.activo_corriente) {
      updateData.total_activo_corriente = this.calcularTotalActivoCorriente(
        data.activo_corriente
      );
    }
    if (data.activo_no_corriente) {
      updateData.total_activo_no_corriente =
        this.calcularTotalActivoNoCorriente(data.activo_no_corriente);
    }
    if (data.pasivo_corriente) {
      updateData.total_pasivo_corriente = this.calcularTotalPasivoCorriente(
        data.pasivo_corriente
      );
    }
    if (data.pasivo_no_corriente) {
      updateData.total_pasivo_no_corriente =
        this.calcularTotalPasivoNoCorriente(data.pasivo_no_corriente);
    }

    await db.collection(COLLECTION_SITUACION).doc(id).update(updateData);
  }

  static async deleteSituacionPatrimonial(id: string): Promise<void> {
    const db = getAdminFirestore();
    await db.collection(COLLECTION_SITUACION).doc(id).delete();
  }

  // ========================================
  // ESTADO DE RESULTADOS - CRUD
  // ========================================

  static async createEstadoResultados(
    organizationId: string,
    userId: string,
    data: CreateEstadoResultadosDTO
  ): Promise<EstadoResultados> {
    const db = getAdminFirestore();

    // Calcular resultados automáticamente
    const calculados = this.calcularResultados(
      data.resultados_continuan,
      data.resultados_descontinuacion,
      data.resultados_extraordinarios
    );

    const now = new Date().toISOString();
    const docRef = db.collection(COLLECTION_RESULTADOS).doc();

    const estado: EstadoResultados = {
      id: docRef.id,
      organization_id: organizationId,
      crm_organizacion_id: data.crm_organizacion_id,
      cliente_nombre: data.cliente_nombre,
      cliente_cuit: data.cliente_cuit,
      ejercicio: data.ejercicio,
      fecha_inicio: data.fecha_inicio,
      fecha_cierre: data.fecha_cierre,
      fuente_datos: data.fuente_datos,
      resultados_continuan: data.resultados_continuan,
      resultados_descontinuacion: data.resultados_descontinuacion,
      resultados_extraordinarios: data.resultados_extraordinarios,
      ...calculados,
      observaciones: data.observaciones,
      created_at: now,
      updated_at: now,
      created_by: userId,
    };

    await docRef.set(estado);

    // Actualizar resultado en Estado de Situación Patrimonial si existe
    const situacionSnapshot = await db
      .collection(COLLECTION_SITUACION)
      .where('organization_id', '==', organizationId)
      .where('crm_organizacion_id', '==', data.crm_organizacion_id)
      .where('ejercicio', '==', data.ejercicio)
      .limit(1)
      .get();

    if (!situacionSnapshot.empty) {
      const situacionDoc = situacionSnapshot.docs[0];
      await situacionDoc.ref.update({
        'patrimonio_neto.resultado_ejercicio':
          calculados.ganancia_perdida_ejercicio,
        updated_at: now,
      });
    }

    return estado;
  }

  static async getEstadoResultadosByCliente(
    organizationId: string,
    clienteId: string
  ): Promise<EstadoResultados[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(COLLECTION_RESULTADOS)
      .where('organization_id', '==', organizationId)
      .where('crm_organizacion_id', '==', clienteId)
      .orderBy('ejercicio', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as EstadoResultados);
  }

  static async getEstadoResultadosById(
    id: string
  ): Promise<EstadoResultados | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION_RESULTADOS).doc(id).get();
    return doc.exists ? (doc.data() as EstadoResultados) : null;
  }

  static async updateEstadoResultados(
    id: string,
    data: Partial<CreateEstadoResultadosDTO>
  ): Promise<void> {
    const db = getAdminFirestore();
    const updateData: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Recalcular si hay datos de resultados
    if (
      data.resultados_continuan &&
      data.resultados_descontinuacion !== undefined
    ) {
      const calculados = this.calcularResultados(
        data.resultados_continuan,
        data.resultados_descontinuacion,
        data.resultados_extraordinarios || 0
      );
      Object.assign(updateData, calculados);
    }

    await db.collection(COLLECTION_RESULTADOS).doc(id).update(updateData);
  }

  static async deleteEstadoResultados(id: string): Promise<void> {
    const db = getAdminFirestore();
    await db.collection(COLLECTION_RESULTADOS).doc(id).delete();
  }
}
