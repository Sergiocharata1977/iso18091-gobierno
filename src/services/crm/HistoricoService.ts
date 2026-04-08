/**
 * HistoricoService
 * Servicio para gestión de subcolecciones históricas (Time-Series)
 * Usa Admin SDK para rutas de API
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  CategoriaScoring,
  CreateFinancialSnapshotData,
  CreatePatrimonioSnapshotData,
  CreateScoringData,
  DocumentoVersion,
  FinancialSnapshot,
  NosisConsultaHistorica,
  PatrimonioSnapshot,
  ScoringHistoryRecord,
} from '@/types/crm-historico';

// Colección base
const CLIENTES_COLLECTION = 'crm_organizaciones';

// Subcolecciones
const FINANCIAL_SNAPSHOTS = 'crm_snapshots_financieros';
const PATRIMONIO_SNAPSHOTS = 'crm_snapshots_patrimonio';
const SCORING_HISTORY = 'crm_historial_scoring';
const CONSULTAS_NOSIS = 'crm_consultas_nosis';
const DOCUMENT_VERSIONS = 'crm_versiones_documentos';

export class HistoricoService {
  // ============================================================
  // FINANCIAL SNAPSHOTS (Balances, IVA, Ganancias, etc.)
  // ============================================================

  static async addFinancialSnapshot(
    organizationId: string,
    clienteId: string,
    data: CreateFinancialSnapshotData,
    registradoPor: { userId: string; nombre: string; cargo?: string }
  ): Promise<string> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Calcular ratios si es una situación patrimonial
    let ratios;
    if (data.situacionPatrimonial) {
      const totalActivo = data.situacionPatrimonial.totalActivo;
      const totalPasivo = data.situacionPatrimonial.totalPasivo;
      const patrimonioNeto = data.situacionPatrimonial.patrimonioNeto.total;
      const activoCorriente = data.situacionPatrimonial.activoCorriente.total;
      const pasivoCorriente = data.situacionPatrimonial.pasivoCorriente.total;

      ratios = {
        liquidezCorriente:
          pasivoCorriente > 0 ? activoCorriente / pasivoCorriente : 0,
        endeudamiento: totalActivo > 0 ? totalPasivo / totalActivo : 0,
        solvencia: totalActivo > 0 ? patrimonioNeto / totalActivo : 0,
      };
    }

    const snapshot: Omit<FinancialSnapshot, 'id'> = {
      organizationId,
      clienteId,
      tipoSnapshot: data.tipoSnapshot,
      periodo: data.periodo,
      fechaRegistro: now,
      situacionPatrimonial: data.situacionPatrimonial,
      estadoResultados: data.estadoResultados,
      declaracionMensual: data.declaracionMensual,
      ratios,
      documentoUrl: data.documentoUrl,
      fuenteDatos: data.fuenteDatos,
      registradoPor,
      createdAt: now,
    };

    const docRef = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(FINANCIAL_SNAPSHOTS)
      .add(snapshot);

    return docRef.id;
  }

  static async getFinancialSnapshots(
    clienteId: string,
    tipo?: string,
    limite: number = 12
  ): Promise<FinancialSnapshot[]> {
    const db = getAdminFirestore();

    let query = db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(FINANCIAL_SNAPSHOTS)
      .orderBy('fechaRegistro', 'desc')
      .limit(limite);

    if (tipo) {
      query = query.where('tipoSnapshot', '==', tipo);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FinancialSnapshot[];
  }

  // ============================================================
  // PATRIMONIO SNAPSHOTS
  // ============================================================

  static async addPatrimonioSnapshot(
    organizationId: string,
    clienteId: string,
    data: CreatePatrimonioSnapshotData,
    registradoPor: { userId: string; nombre: string; cargo?: string }
  ): Promise<string> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Calcular totales
    const totalMaquinarias = data.maquinarias
      .filter(m => m.propiedad === 'propia')
      .reduce((sum, m) => sum + m.valorActual, 0);
    const totalInmuebles = data.inmuebles
      .filter(i => !i.tieneGravamen)
      .reduce((sum, i) => sum + i.valorEstimado, 0);
    const totalOtrosBienes = data.otrosBienes.reduce(
      (sum, b) => sum + b.valor,
      0
    );
    const patrimonioTotal =
      totalMaquinarias + totalInmuebles + totalOtrosBienes;

    // Obtener último snapshot para calcular variación
    const ultimoSnapshot = await this.getUltimoPatrimonioSnapshot(clienteId);
    let variacionAbsoluta: number | undefined;
    let variacionPorcentaje: number | undefined;

    if (ultimoSnapshot) {
      variacionAbsoluta = patrimonioTotal - ultimoSnapshot.patrimonioTotal;
      variacionPorcentaje =
        ultimoSnapshot.patrimonioTotal > 0
          ? (variacionAbsoluta / ultimoSnapshot.patrimonioTotal) * 100
          : 0;
    }

    const snapshot: Omit<PatrimonioSnapshot, 'id'> = {
      organizationId,
      clienteId,
      fechaRegistro: now,
      maquinarias: data.maquinarias,
      inmuebles: data.inmuebles,
      otrosBienes: data.otrosBienes,
      totalMaquinarias,
      totalInmuebles,
      totalOtrosBienes,
      patrimonioTotal,
      variacionAbsoluta,
      variacionPorcentaje,
      registradoPor,
      createdAt: now,
    };

    const docRef = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(PATRIMONIO_SNAPSHOTS)
      .add(snapshot);

    return docRef.id;
  }

  static async getUltimoPatrimonioSnapshot(
    clienteId: string
  ): Promise<PatrimonioSnapshot | null> {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(PATRIMONIO_SNAPSHOTS)
      .orderBy('fechaRegistro', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as PatrimonioSnapshot;
  }

  static async getPatrimonioSnapshots(
    clienteId: string,
    limite: number = 12
  ): Promise<PatrimonioSnapshot[]> {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(PATRIMONIO_SNAPSHOTS)
      .orderBy('fechaRegistro', 'desc')
      .limit(limite)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PatrimonioSnapshot[];
  }

  // ============================================================
  // SCORING HISTORY (INMUTABLE)
  // ============================================================

  static async addScoringRecord(
    organizationId: string,
    clienteId: string,
    data: CreateScoringData,
    evaluadoPor: {
      userId: string;
      nombre: string;
      cargo?: string;
      departamento?: string;
    }
  ): Promise<string> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Calcular puntaje total
    const puntajeTotal = data.factoresEvaluados.reduce(
      (sum, f) => sum + f.puntajeObtenido * f.peso,
      0
    );

    // Determinar categoría
    let categoria: CategoriaScoring;
    if (puntajeTotal >= 8) categoria = 'A';
    else if (puntajeTotal >= 6) categoria = 'B';
    else if (puntajeTotal >= 4) categoria = 'C';
    else categoria = 'REPROBADO';

    // Calcular línea de crédito
    const lineaCreditoCalculada = this.calcularLineaCredito(
      categoria,
      data.snapshotDatos.patrimonioNeto,
      data.snapshotDatos.ventasAnuales
    );

    // Marcar evaluaciones anteriores como reemplazadas
    await this.marcarEvaluacionesAnterioresComoReemplazadas(clienteId);

    // Fecha de vigencia (por defecto 90 días)
    const vigenciaDias = data.vigenciaDias || 90;
    const vigenciaHasta = new Date();
    vigenciaHasta.setDate(vigenciaHasta.getDate() + vigenciaDias);

    const record: Omit<ScoringHistoryRecord, 'id'> = {
      organizationId,
      clienteId,
      fechaEvaluacion: now,
      versionModelo: 'v1.0',
      puntajeTotal,
      categoria,
      lineaCreditoCalculada,
      factoresEvaluados: data.factoresEvaluados,
      snapshotDatos: data.snapshotDatos,
      vigenciaHasta: vigenciaHasta.toISOString(),
      estado: 'vigente',
      evaluadoPor,
      createdAt: now,
    };

    const docRef = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(SCORING_HISTORY)
      .add(record);

    return docRef.id;
  }

  private static calcularLineaCredito(
    categoria: CategoriaScoring,
    patrimonioNeto: number,
    ventasAnuales: number
  ): number {
    const parametros = {
      A: { afectacionVentas: 0.5, relacionPatrimonio: 0.95 },
      B: { afectacionVentas: 0.44, relacionPatrimonio: 0.8 },
      C: { afectacionVentas: 0.35, relacionPatrimonio: 0.65 },
      REPROBADO: { afectacionVentas: 0, relacionPatrimonio: 0 },
    };

    const p = parametros[categoria];
    const capacidadOperativa = ventasAnuales * p.afectacionVentas;
    const capacidadPatrimonial = patrimonioNeto * p.relacionPatrimonio;

    return Math.min(capacidadOperativa, capacidadPatrimonial);
  }

  private static async marcarEvaluacionesAnterioresComoReemplazadas(
    clienteId: string
  ): Promise<void> {
    const db = getAdminFirestore();

    const vigentes = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(SCORING_HISTORY)
      .where('estado', '==', 'vigente')
      .get();

    const batch = db.batch();
    vigentes.docs.forEach(doc => {
      batch.update(doc.ref, { estado: 'reemplazado' });
    });

    await batch.commit();
  }

  static async getScoringHistory(
    clienteId: string,
    limite: number = 10
  ): Promise<ScoringHistoryRecord[]> {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(SCORING_HISTORY)
      .orderBy('fechaEvaluacion', 'desc')
      .limit(limite)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ScoringHistoryRecord[];
  }

  static async getUltimoScoringVigente(
    clienteId: string
  ): Promise<ScoringHistoryRecord | null> {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(SCORING_HISTORY)
      .where('estado', '==', 'vigente')
      .orderBy('fechaEvaluacion', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as ScoringHistoryRecord;
  }

  // ============================================================
  // CONSULTAS NOSIS (LOG)
  // ============================================================

  static async logConsultaNosis(
    organizationId: string,
    clienteId: string,
    consulta: Omit<
      NosisConsultaHistorica,
      'id' | 'organizationId' | 'clienteId' | 'createdAt'
    >
  ): Promise<string> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    const record: Omit<NosisConsultaHistorica, 'id'> = {
      organizationId,
      clienteId,
      ...consulta,
      createdAt: now,
    };

    const docRef = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(CONSULTAS_NOSIS)
      .add(record);

    return docRef.id;
  }

  static async getConsultasNosis(
    clienteId: string,
    limite: number = 10
  ): Promise<NosisConsultaHistorica[]> {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(CONSULTAS_NOSIS)
      .orderBy('fechaConsulta', 'desc')
      .limit(limite)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as NosisConsultaHistorica[];
  }

  // ============================================================
  // DOCUMENTOS VERSIONADOS
  // ============================================================

  static async addDocumentoVersion(
    organizationId: string,
    clienteId: string,
    documento: Omit<
      DocumentoVersion,
      | 'id'
      | 'organizationId'
      | 'clienteId'
      | 'version'
      | 'esVersionActual'
      | 'createdAt'
      | 'subidoPor'
    >,
    subidoPor: { userId: string; nombre: string }
  ): Promise<string> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Obtener versión actual del documento base
    const versionesAnteriores = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(DOCUMENT_VERSIONS)
      .where('documentoBaseId', '==', documento.documentoBaseId)
      .orderBy('version', 'desc')
      .limit(1)
      .get();

    let nuevaVersion = 1;
    if (!versionesAnteriores.empty) {
      const ultimaVersion = versionesAnteriores.docs[0].data().version;
      nuevaVersion = ultimaVersion + 1;

      // Marcar versión anterior como no actual
      await versionesAnteriores.docs[0].ref.update({ esVersionActual: false });
    }

    const record: Omit<DocumentoVersion, 'id'> = {
      organizationId,
      clienteId,
      documentoBaseId: documento.documentoBaseId,
      version: nuevaVersion,
      nombreArchivo: documento.nombreArchivo,
      tipoDocumento: documento.tipoDocumento,
      descripcion: documento.descripcion,
      storageUrl: documento.storageUrl,
      tamaño: documento.tamaño,
      mimeType: documento.mimeType,
      fechaDocumento: documento.fechaDocumento,
      fechaCarga: now,
      esVersionActual: true,
      subidoPor,
      createdAt: now,
    };

    const docRef = await db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(DOCUMENT_VERSIONS)
      .add(record);

    return docRef.id;
  }

  static async getDocumentos(
    clienteId: string,
    soloActuales: boolean = true
  ): Promise<DocumentoVersion[]> {
    const db = getAdminFirestore();

    let query = db
      .collection(CLIENTES_COLLECTION)
      .doc(clienteId)
      .collection(DOCUMENT_VERSIONS)
      .orderBy('fechaCarga', 'desc');

    if (soloActuales) {
      query = query.where('esVersionActual', '==', true);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as DocumentoVersion[];
  }
}
