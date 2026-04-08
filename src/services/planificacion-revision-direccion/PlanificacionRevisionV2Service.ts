/**
 * Servicio V2 para Planificación y Revisión por la Dirección
 * Compatible con ISO 9001:2026
 *
 * Mejoras vs V1:
 * - PATCH por sección (no sobrescribe todo el documento)
 * - Soporte para requisitos ISO 2026
 * - Métodos específicos para cada nueva sección
 * - Integración con módulo de Acciones
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  CreatePlanificacionRevisionV2Data,
  ParteInteresada,
  PlanificacionRevisionDireccionV2,
  RevisionDireccion,
  RiesgoOportunidad,
  UpdateSectionV2Data,
} from '@/types/planificacion-revision-direccion-v2';

const COLLECTION = 'planificacion_revision_direccion_v2';

export class PlanificacionRevisionV2Service {
  /**
   * Obtener instancia de Firestore Admin
   */
  private static getDb() {
    return getAdminFirestore();
  }

  /**
   * Obtener la revisión vigente más reciente
   */
  static async getLatest(): Promise<PlanificacionRevisionDireccionV2 | null> {
    try {
      const snapshot = await this.getDb()
        .collection(COLLECTION)
        .where('estado', '==', 'vigente')
        .orderBy('fecha_revision', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PlanificacionRevisionDireccionV2;
    } catch (error) {
      console.error('Error al obtener revisión vigente:', error);
      throw new Error('Error al obtener la revisión vigente');
    }
  }

  /**
   * Obtener todas las revisiones (historial)
   */
  static async getAll(): Promise<PlanificacionRevisionDireccionV2[]> {
    try {
      const snapshot = await this.getDb()
        .collection(COLLECTION)
        .orderBy('fecha_revision', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PlanificacionRevisionDireccionV2[];
    } catch (error) {
      console.error('Error al obtener revisiones:', error);
      throw new Error('Error al obtener el historial de revisiones');
    }
  }

  /**
   * Obtener revisión por ID
   */
  static async getById(
    id: string
  ): Promise<PlanificacionRevisionDireccionV2 | null> {
    try {
      const doc = await this.getDb().collection(COLLECTION).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as PlanificacionRevisionDireccionV2;
    } catch (error) {
      console.error('Error al obtener revisión:', error);
      throw new Error('Error al obtener la revisión');
    }
  }

  /**
   * Crear nueva revisión V2
   */
  static async createRevision(
    data: CreatePlanificacionRevisionV2Data
  ): Promise<PlanificacionRevisionDireccionV2> {
    try {
      const now = new Date().toISOString();

      const docData: Omit<PlanificacionRevisionDireccionV2, 'id'> = {
        fecha_revision: data.fecha_revision,
        periodo: data.periodo,
        estado: 'borrador',
        version: '2.0',

        // Configuración ISO (por defecto ISO 2015, el usuario puede activar 2026)
        configuracion_iso: {
          habilitar_requisitos_2026:
            data.configuracion_iso?.habilitar_requisitos_2026 ?? false,
          version_iso_objetivo:
            data.configuracion_iso?.version_iso_objetivo ?? '2015',
          fecha_activacion_2026: data.configuracion_iso?.fecha_activacion_2026,
          notas_transicion: data.configuracion_iso?.notas_transicion,
        },

        // Tracking de completado
        completado: {
          identidad: false,
          alcance: false,
          contexto: false,
          estructura: false,
          politicas: false,
          partes_interesadas: false,
          cultura_calidad: false,
          comportamiento_etico: false,
          riesgos_oportunidades: false,
          gestion_conocimiento: false,
          revision_direccion: false,
        },

        // Secciones V1
        IdentidadOrganizacional: {
          NOMBRE_ORGANIZACION: '',
          SECTOR: '',
          DESCRIPCION: '',
          TOTAL_EMPLEADOS: 0,
          EMPLEADOS_CON_ACCESO: 0,
          MISION: '',
          VISION: '',
          ...(data.IdentidadOrganizacional || {}),
        },
        AlcanceSGC: {
          DESCRIPCION: '',
          LIMITES: '',
          PRODUCTOS_SERVICIOS: [],
          UBICACIONES: [],
          ...(data.AlcanceSGC || {}),
        },
        Contexto: {
          FECHA_ANALISIS: now.split('T')[0],
          FRECUENCIA_REVISION: 'semestral',
          CUESTIONES_EXTERNAS: [],
          CUESTIONES_INTERNAS: [],
          ...(data.Contexto || {}),
        },
        Estructura: data.Estructura || {
          ORGANIGRAMA_URL: '',
          OTROS_DATOS: '',
        },
        Politicas: data.Politicas || [],

        // Secciones NUEVAS ISO 2026
        PartesInteresadas: data.PartesInteresadas || [],
        CulturaCalidad: {
          descripcion: data.CulturaCalidad?.descripcion || '',
          valores_calidad: data.CulturaCalidad?.valores_calidad || [],
          iniciativas_activas: data.CulturaCalidad?.iniciativas_activas || [],
          evaluacion_madurez: data.CulturaCalidad?.evaluacion_madurez,
          fecha_ultima_revision:
            data.CulturaCalidad?.fecha_ultima_revision || now.split('T')[0],
        },
        ComportamientoEtico: {
          codigo_etica_url: data.ComportamientoEtico?.codigo_etica_url,
          codigo_etica_version: data.ComportamientoEtico?.codigo_etica_version,
          fecha_aprobacion_codigo:
            data.ComportamientoEtico?.fecha_aprobacion_codigo,
          canales_denuncia: data.ComportamientoEtico?.canales_denuncia || [],
          capacitaciones_etica:
            data.ComportamientoEtico?.capacitaciones_etica || [],
          incidentes_reportados_anio_actual:
            data.ComportamientoEtico?.incidentes_reportados_anio_actual || 0,
          incidentes_resueltos_anio_actual:
            data.ComportamientoEtico?.incidentes_resueltos_anio_actual || 0,
          tiempo_promedio_resolucion_dias:
            data.ComportamientoEtico?.tiempo_promedio_resolucion_dias,
          fecha_ultima_revision:
            data.ComportamientoEtico?.fecha_ultima_revision ||
            now.split('T')[0],
          notas: data.ComportamientoEtico?.notas,
        },
        RiesgosOportunidades: data.RiesgosOportunidades || [],
        GestionConocimiento: {
          conocimientos_criticos:
            data.GestionConocimiento?.conocimientos_criticos || [],
          mecanismos_captura:
            data.GestionConocimiento?.mecanismos_captura || [],
          frecuencia_revision_conocimiento:
            data.GestionConocimiento?.frecuencia_revision_conocimiento ||
            'semestral',
          fecha_ultima_revision:
            data.GestionConocimiento?.fecha_ultima_revision ||
            now.split('T')[0],
        },
        RevisionesDireccion: [],

        // Metadata
        created_at: now,
        updated_at: now,
        created_by: data.created_by,
      };

      const docRef = await this.getDb().collection(COLLECTION).add(docData);
      const created = await docRef.get();

      return {
        id: created.id,
        ...created.data(),
      } as PlanificacionRevisionDireccionV2;
    } catch (error) {
      console.error('Error al crear revisión V2:', error);
      throw error;
    }
  }

  /**
   * Actualizar una sección específica (PATCH)
   * Implementa la sugerencia de Gemini 3: solo actualiza la sección modificada
   */
  static async updateSection(
    id: string,
    updateData: UpdateSectionV2Data
  ): Promise<PlanificacionRevisionDireccionV2> {
    try {
      const docRef = this.getDb().collection(COLLECTION).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('La revisión no existe');
      }

      const now = new Date().toISOString();
      const currentData = doc.data() as Omit<
        PlanificacionRevisionDireccionV2,
        'id'
      >;

      // Preparar actualización
      const updates: any = {
        [updateData.section]: updateData.data,
        updated_at: now,
        updated_by: updateData.updated_by,
      };

      // Actualizar tracking de completado según la sección
      const completadoKey = this.getSectionCompletadoKey(updateData.section);
      if (completadoKey) {
        const isComplete = this.isSectionComplete(
          updateData.section,
          updateData.data,
          currentData
        );
        updates[`completado.${completadoKey}`] = isComplete;
      }

      await docRef.update(updates);

      const updated = await docRef.get();
      return {
        id: updated.id,
        ...updated.data(),
      } as PlanificacionRevisionDireccionV2;
    } catch (error) {
      console.error('Error al actualizar sección:', error);
      throw error;
    }
  }

  /**
   * Marcar revisión como vigente (y otras como históricas)
   */
  static async markAsVigente(
    id: string
  ): Promise<PlanificacionRevisionDireccionV2> {
    try {
      const db = this.getDb();

      // Marcar todas las vigentes actuales como históricas
      const vigentesSnapshot = await db
        .collection(COLLECTION)
        .where('estado', '==', 'vigente')
        .get();

      const batch = db.batch();
      vigentesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { estado: 'historico' });
      });

      // Marcar la nueva como vigente
      const docRef = db.collection(COLLECTION).doc(id);
      batch.update(docRef, {
        estado: 'vigente',
        updated_at: new Date().toISOString(),
      });

      await batch.commit();

      const updated = await docRef.get();
      return {
        id: updated.id,
        ...updated.data(),
      } as PlanificacionRevisionDireccionV2;
    } catch (error) {
      console.error('Error al marcar como vigente:', error);
      throw error;
    }
  }

  /**
   * Eliminar revisión
   */
  static async delete(id: string): Promise<void> {
    try {
      await this.getDb().collection(COLLECTION).doc(id).delete();
    } catch (error) {
      console.error('Error al eliminar revisión:', error);
      throw new Error('Error al eliminar la revisión');
    }
  }

  // ===== MÉTODOS ESPECÍFICOS PARA SECCIONES ISO 2026 =====

  /**
   * Agregar Parte Interesada
   */
  static async addParteInteresada(
    revisionId: string,
    parte: Omit<ParteInteresada, 'id'>
  ): Promise<PlanificacionRevisionDireccionV2> {
    const doc = await this.getById(revisionId);
    if (!doc) throw new Error('Revisión no encontrada');

    const newParte: ParteInteresada = {
      ...parte,
      id: this.getDb().collection('temp').doc().id,
    };

    return this.updateSection(revisionId, {
      section: 'PartesInteresadas',
      data: [...doc.PartesInteresadas, newParte],
      updated_by: 'system',
    });
  }

  /**
   * Actualizar Parte Interesada
   */
  static async updateParteInteresada(
    revisionId: string,
    parteId: string,
    updates: Partial<ParteInteresada>
  ): Promise<PlanificacionRevisionDireccionV2> {
    const doc = await this.getById(revisionId);
    if (!doc) throw new Error('Revisión no encontrada');

    const updatedPartes = doc.PartesInteresadas.map(p =>
      p.id === parteId ? { ...p, ...updates } : p
    );

    return this.updateSection(revisionId, {
      section: 'PartesInteresadas',
      data: updatedPartes,
      updated_by: 'system',
    });
  }

  /**
   * Eliminar Parte Interesada
   */
  static async deleteParteInteresada(
    revisionId: string,
    parteId: string
  ): Promise<PlanificacionRevisionDireccionV2> {
    const doc = await this.getById(revisionId);
    if (!doc) throw new Error('Revisión no encontrada');

    const updatedPartes = doc.PartesInteresadas.filter(p => p.id !== parteId);

    return this.updateSection(revisionId, {
      section: 'PartesInteresadas',
      data: updatedPartes,
      updated_by: 'system',
    });
  }

  /**
   * Agregar Riesgo u Oportunidad
   */
  static async addRiesgoOportunidad(
    revisionId: string,
    riesgo: Omit<RiesgoOportunidad, 'id' | 'nivel_riesgo'>
  ): Promise<PlanificacionRevisionDireccionV2> {
    const doc = await this.getById(revisionId);
    if (!doc) throw new Error('Revisión no encontrada');

    // Importar función de cálculo
    const { calcularNivelRiesgo } = await import(
      '@/types/planificacion-revision-direccion-v2'
    );

    const newRiesgo: RiesgoOportunidad = {
      ...riesgo,
      id: this.getDb().collection('temp').doc().id,
      nivel_riesgo: calcularNivelRiesgo(riesgo.probabilidad, riesgo.impacto),
    };

    return this.updateSection(revisionId, {
      section: 'RiesgosOportunidades',
      data: [...doc.RiesgosOportunidades, newRiesgo],
      updated_by: 'system',
    });
  }

  /**
   * Agregar Revisión por la Dirección
   * Implementa sugerencia de Gemini 3: vinculación con módulo de Acciones
   */
  static async addRevisionDireccion(
    revisionId: string,
    revision: Omit<RevisionDireccion, 'id' | 'created_at'>
  ): Promise<PlanificacionRevisionDireccionV2> {
    const doc = await this.getById(revisionId);
    if (!doc) throw new Error('Revisión no encontrada');

    const now = new Date().toISOString();
    const newRevision: RevisionDireccion = {
      ...revision,
      id: this.getDb().collection('temp').doc().id,
      created_at: now,
    };

    return this.updateSection(revisionId, {
      section: 'RevisionesDireccion',
      data: [...doc.RevisionesDireccion, newRevision],
      updated_by: revision.created_by,
    });
  }

  /**
   * Vincular Acción del módulo de Acciones a una Revisión por la Dirección
   * Implementa sugerencia de Gemini 3
   */
  static async vincularAccionARevision(
    revisionId: string,
    revisionDireccionId: string,
    accionId: string,
    descripcion: string
  ): Promise<PlanificacionRevisionDireccionV2> {
    const doc = await this.getById(revisionId);
    if (!doc) throw new Error('Revisión no encontrada');

    const updatedRevisiones = doc.RevisionesDireccion.map(rev => {
      if (rev.id === revisionDireccionId) {
        return {
          ...rev,
          salidas: {
            ...rev.salidas,
            acciones_generadas: [
              ...rev.salidas.acciones_generadas,
              {
                accion_id: accionId,
                descripcion,
                tipo: 'mejora' as const,
                estado: 'pendiente' as const,
              },
            ],
          },
        };
      }
      return rev;
    });

    return this.updateSection(revisionId, {
      section: 'RevisionesDireccion',
      data: updatedRevisiones,
      updated_by: 'system',
    });
  }

  // ===== MÉTODOS AUXILIARES =====

  /**
   * Mapea el nombre de la sección al key de completado
   */
  private static getSectionCompletadoKey(section: string): string | null {
    const map: Record<string, string> = {
      IdentidadOrganizacional: 'identidad',
      AlcanceSGC: 'alcance',
      Contexto: 'contexto',
      Estructura: 'estructura',
      Politicas: 'politicas',
      PartesInteresadas: 'partes_interesadas',
      CulturaCalidad: 'cultura_calidad',
      ComportamientoEtico: 'comportamiento_etico',
      RiesgosOportunidades: 'riesgos_oportunidades',
      GestionConocimiento: 'gestion_conocimiento',
      RevisionesDireccion: 'revision_direccion',
    };
    return map[section] || null;
  }

  /**
   * Verifica si una sección está completa
   */
  private static isSectionComplete(
    section: string,
    data: any,
    currentData: any
  ): boolean {
    if (!data) return false;

    switch (section) {
      case 'IdentidadOrganizacional':
        return !!(
          data.NOMBRE_ORGANIZACION &&
          data.SECTOR &&
          data.DESCRIPCION &&
          data.MISION &&
          data.VISION
        );

      case 'AlcanceSGC':
        return !!(
          data.DESCRIPCION &&
          data.LIMITES &&
          data.PRODUCTOS_SERVICIOS?.length > 0 &&
          data.UBICACIONES?.length > 0
        );

      case 'Contexto':
        return !!(
          data.FECHA_ANALISIS &&
          data.CUESTIONES_EXTERNAS?.length > 0 &&
          data.CUESTIONES_INTERNAS?.length > 0
        );

      case 'Estructura':
        return !!(data.ORGANIGRAMA_URL || data.OTROS_DATOS);

      case 'Politicas':
        return Array.isArray(data) && data.length > 0;

      case 'PartesInteresadas':
        return Array.isArray(data) && data.length > 0;

      case 'CulturaCalidad':
        return !!(data.descripcion && data.valores_calidad?.length > 0);

      case 'ComportamientoEtico':
        return !!(data.canales_denuncia?.length > 0);

      case 'RiesgosOportunidades':
        return Array.isArray(data) && data.length > 0;

      case 'GestionConocimiento':
        return !!(
          data.conocimientos_criticos?.length > 0 &&
          data.mecanismos_captura?.length > 0
        );

      case 'RevisionesDireccion':
        return Array.isArray(data) && data.length > 0;

      default:
        return false;
    }
  }
}
