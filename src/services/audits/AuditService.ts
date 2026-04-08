import { db } from '@/firebase/config';
import { EventPublisher } from '@/services/calendar/EventPublisher';
import { TraceabilityService } from '@/services/shared/TraceabilityService';
import type {
  Audit,
  AuditExecutionStartData,
  AuditFormData,
  AuditStatus,
  AuditType,
  ClosingMeeting,
  MeetingFormData,
  NormPointVerification,
  NormPointVerificationFormData,
  OpeningMeeting,
  ReportDelivery,
  ReportDeliveryFormData,
} from '@/types/audits';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'audits';

export class AuditService {
  // ============================================
  // CREAR AUDITORÍA (Planificación)
  // ============================================

  static async create(
    data: AuditFormData,
    userId: string,
    userName: string,
    organizationId: string
  ): Promise<string> {
    try {
      // Generar número de auditoría
      const year = new Date().getFullYear();
      const auditNumber = await TraceabilityService.generateNumber('AUD', year);

      const now = Timestamp.now();

      // Determinar puntos de norma a auditar
      let normPointsToAudit: string[] = [];
      if (data.auditType === 'complete') {
        // Para auditorías completas, usar 4 puntos clave (hardcoded para pruebas)
        normPointsToAudit = ['4.4', '7.5', '8.7', '10.2'];
      } else {
        // Para auditorías parciales, usar los seleccionados
        normPointsToAudit = data.selectedNormPoints;
      }

      // Inicializar verificaciones de puntos de norma
      const normPointsVerification = normPointsToAudit.map(code => ({
        normPointCode: code,
        normPointId: null,
        conformityStatus: null,
        processes: [],
        processIds: null,
        observations: null,
        verifiedAt: null,
        verifiedBy: null,
        verifiedByName: null,
      }));

      const auditData: Omit<Audit, 'id'> = {
        auditNumber,
        organization_id: organizationId,
        title: data.title,
        auditType: data.auditType,
        scope: data.scope,
        plannedDate: Timestamp.fromDate(data.plannedDate),
        leadAuditor: data.leadAuditor,
        leadAuditorId: null, // Preparar para futuro
        selectedNormPoints: normPointsToAudit,

        // Ejecución
        executionDate: null,
        normPointsVerification,
        openingMeeting: null,
        closingMeeting: null,
        reportDelivery: null,
        previousActionsVerification: null,
        observations: null,

        // Comentarios e informe
        initialComments: null,
        finalReport: null,
        archivedDocumentId: null,

        status: 'planned',

        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        createdByName: userName,
        isActive: true,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), auditData);

      // Publicar evento de calendario (no bloquear si falla)
      try {
        await EventPublisher.publishEvent('audits', {
          title: `Auditoría: ${data.title}`,
          description: `Auditoría ${data.auditType === 'complete' ? 'completa' : 'parcial'} - ${data.scope}`,
          date: data.plannedDate,
          endDate: null,
          type: 'audit',
          sourceRecordId: docRef.id,
          sourceRecordType: 'audit',
          sourceRecordNumber: auditNumber,
          responsibleUserId: null,
          responsibleUserName: data.leadAuditor,
          participantIds: null,
          priority: 'high',
          processId: null,
          processName: null,
          metadata: {
            auditType: data.auditType,
            scope: data.scope,
            leadAuditor: data.leadAuditor,
          },
        });
      } catch (calendarError) {
        console.error('Error publishing calendar event:', calendarError);
        // No fallar la creación de auditoría si falla el calendario
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating audit:', error);
      throw new Error('Error al crear la auditoría');
    }
  }

  // ============================================
  // OBTENER AUDITORÍA POR ID
  // ============================================

  static async getById(id: string): Promise<Audit | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Audit;
    } catch (error) {
      console.error('Error getting audit:', error);
      throw new Error('Error al obtener la auditoría');
    }
  }

  // ============================================
  // LISTAR AUDITORÍAS
  // ============================================

  static async list(
    organizationId: string,
    filters?: {
      status?: AuditStatus;
      auditType?: AuditType;
      year?: number;
      search?: string;
    },
    pageSize: number = 50
  ): Promise<{ audits: Audit[] }> {
    try {
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        where('organization_id', '==', organizationId),
      ];

      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      if (filters?.auditType) {
        constraints.push(where('auditType', '==', filters.auditType));
      }

      if (filters?.year) {
        const startDate = new Date(filters.year, 0, 1);
        const endDate = new Date(filters.year, 11, 31, 23, 59, 59);
        constraints.push(
          where('createdAt', '>=', Timestamp.fromDate(startDate))
        );
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endDate)));
      }

      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(pageSize));

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      const audits: Audit[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Audit[];

      // Filtro de búsqueda en memoria
      let filteredAudits = audits;
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredAudits = audits.filter(
          audit =>
            audit.title.toLowerCase().includes(searchLower) ||
            audit.auditNumber.toLowerCase().includes(searchLower) ||
            audit.scope.toLowerCase().includes(searchLower)
        );
      }

      return { audits: filteredAudits };
    } catch (error) {
      console.error('Error listing audits:', error);
      throw new Error('Error al listar las auditorías');
    }
  }

  // ============================================
  // OBTENER AUDITORÍAS POR ESTADO
  // ============================================

  static async getByStatus(
    organizationId: string,
    status: AuditStatus
  ): Promise<Audit[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('isActive', '==', true),
        where('organization_id', '==', organizationId),
        where('status', '==', status),
        orderBy('plannedDate', 'asc')
      );

      const querySnapshot = await getDocs(q);

      const audits: Audit[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Audit[];

      return audits;
    } catch (error) {
      console.error('[AuditService] Error getting audits by status:', error);
      return [];
    }
  }

  // ============================================
  // ACTUALIZAR AUDITORÍA (Planificación)
  // ============================================

  static async update(
    id: string,
    data: Partial<AuditFormData>,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'planned') {
        throw new Error(
          'Solo se pueden editar auditorías en estado planificado'
        );
      }

      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      if (data.title) updateData.title = data.title;
      if (data.auditType) updateData.auditType = data.auditType;
      if (data.scope) updateData.scope = data.scope;
      if (data.plannedDate)
        updateData.plannedDate = Timestamp.fromDate(data.plannedDate);
      if (data.leadAuditor) updateData.leadAuditor = data.leadAuditor;
      if (data.selectedNormPoints)
        updateData.selectedNormPoints = data.selectedNormPoints;

      await updateDoc(docRef, updateData);

      // Actualizar evento de calendario si cambió la fecha (no bloquear si falla)
      if (data.plannedDate) {
        try {
          const eventUpdateData: Record<string, unknown> = {
            date: data.plannedDate,
          };

          if (data.title) {
            eventUpdateData.title = `Auditoría: ${data.title}`;
          }

          if (data.scope || data.auditType) {
            eventUpdateData.description = `Auditoría ${data.auditType || audit.auditType === 'complete' ? 'completa' : 'parcial'} - ${data.scope || audit.scope}`;
          }

          if (data.leadAuditor) {
            eventUpdateData.responsibleUserName = data.leadAuditor;
          }

          await EventPublisher.updatePublishedEvent(
            'audits',
            id,
            eventUpdateData
          );
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError);
          // No fallar la actualización de auditoría si falla el calendario
        }
      }
    } catch (error) {
      console.error('Error updating audit:', error);
      throw new Error('Error al actualizar la auditoría');
    }
  }

  // ============================================
  // ELIMINAR AUDITORÍA
  // ============================================

  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);

      // Eliminar evento de calendario (no bloquear si falla)
      try {
        await EventPublisher.deletePublishedEvent('audits', id);
      } catch (calendarError) {
        console.error('Error deleting calendar event:', calendarError);
        // No fallar la eliminación de auditoría si falla el calendario
      }
    } catch (error) {
      console.error('Error deleting audit:', error);
      throw new Error('Error al eliminar la auditoría');
    }
  }

  // ============================================
  // INICIAR EJECUCIÓN
  // ============================================

  static async startExecution(
    id: string,
    data: AuditExecutionStartData,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'planned') {
        throw new Error('La auditoría ya fue iniciada');
      }

      // Usar los puntos que ya están en la auditoría
      const normPointCodes = audit.selectedNormPoints;

      // Crear array de verificaciones iniciales
      const normPointsVerification: NormPointVerification[] =
        normPointCodes.map(code => ({
          normPointCode: code,
          normPointId: null,
          conformityStatus: null,
          processes: [],
          processIds: null,
          observations: null,
          verifiedAt: null,
          verifiedBy: null,
          verifiedByName: null,
        }));

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'in_progress',
        executionDate: Timestamp.fromDate(data.executionDate),
        normPointsVerification,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error starting execution:', error);
      throw new Error('Error al iniciar la ejecución');
    }
  }

  // ============================================
  // ACTUALIZAR VERIFICACIÓN DE PUNTO DE NORMA
  // ============================================

  static async updateNormPointVerification(
    id: string,
    normPointCode: string,
    data: NormPointVerificationFormData,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      // Allow verification from 'planned' or 'in_progress' states
      if (audit.status === 'completed') {
        throw new Error('La auditoría ya está completada');
      }

      // Encontrar el índice del punto a actualizar
      const index = audit.normPointsVerification.findIndex(
        v => v.normPointCode === normPointCode
      );

      if (index === -1) {
        throw new Error('Punto de norma no encontrado');
      }

      // Actualizar el punto
      const updatedVerifications = [...audit.normPointsVerification];
      updatedVerifications[index] = {
        ...updatedVerifications[index],
        conformityStatus: data.conformityStatus,
        processes: data.processes,
        observations: data.observations || null,
        verifiedAt: Timestamp.now(),
        verifiedBy: userId,
        verifiedByName: userName,
      };

      const docRef = doc(db, COLLECTION_NAME, id);

      // Build update data - auto-transition from 'planned' to 'in_progress'
      const updateData: Record<string, unknown> = {
        normPointsVerification: updatedVerifications,
        updatedAt: Timestamp.now(),
      };

      // If first verification and status is planned, change to in_progress
      if (audit.status === 'planned') {
        updateData.status = 'in_progress';
        updateData.executionDate = Timestamp.now();
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating norm point verification:', error);
      throw new Error('Error al actualizar la verificación');
    }
  }

  // ============================================
  // ACTUALIZAR REUNIÓN DE APERTURA
  // ============================================

  static async updateOpeningMeeting(
    id: string,
    data: MeetingFormData
  ): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'in_progress') {
        throw new Error('La auditoría no está en ejecución');
      }

      const openingMeeting: OpeningMeeting = {
        date: Timestamp.fromDate(data.date),
        participants: data.participants.map(p => ({
          ...p,
          userId: null,
        })),
        notes: data.notes || null,
      };

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        openingMeeting,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating opening meeting:', error);
      throw new Error('Error al actualizar la reunión de apertura');
    }
  }

  // ============================================
  // ACTUALIZAR REUNIÓN DE CIERRE
  // ============================================

  static async updateClosingMeeting(
    id: string,
    data: MeetingFormData
  ): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'in_progress') {
        throw new Error('La auditoría no está en ejecución');
      }

      const closingMeeting: ClosingMeeting = {
        date: Timestamp.fromDate(data.date),
        participants: data.participants.map(p => ({
          ...p,
          userId: null,
        })),
        notes: data.notes || null,
      };

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        closingMeeting,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating closing meeting:', error);
      throw new Error('Error al actualizar la reunión de cierre');
    }
  }

  // ============================================
  // ACTUALIZAR ENTREGA DE INFORME
  // ============================================

  static async updateReportDelivery(
    id: string,
    data: ReportDeliveryFormData
  ): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'in_progress') {
        throw new Error('La auditoría no está en ejecución');
      }

      const reportDelivery: ReportDelivery = {
        date: Timestamp.fromDate(data.date),
        deliveredBy: data.deliveredBy,
        deliveredById: null,
        receivedBy: data.receivedBy,
        receivedByIds: null,
        notes: data.notes || null,
      };

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        reportDelivery,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating report delivery:', error);
      throw new Error('Error al actualizar la entrega del informe');
    }
  }

  // ============================================
  // ACTUALIZAR VERIFICACIÓN DE ACCIONES PREVIAS
  // ============================================

  static async updatePreviousActionsVerification(
    id: string,
    text: string
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        previousActionsVerification: text,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating previous actions verification:', error);
      throw new Error(
        'Error al actualizar la verificación de acciones previas'
      );
    }
  }

  // ============================================
  // ACTUALIZAR OBSERVACIONES GENERALES
  // ============================================

  static async updateObservations(id: string, text: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        observations: text,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating observations:', error);
      throw new Error('Error al actualizar las observaciones');
    }
  }

  // ============================================
  // COMPLETAR AUDITORÍA
  // ============================================

  static async complete(id: string): Promise<void> {
    try {
      const audit = await this.getById(id);

      if (!audit) {
        throw new Error('Auditoría no encontrada');
      }

      if (audit.status !== 'in_progress') {
        throw new Error('La auditoría no está en ejecución');
      }

      // Validar que todos los puntos estén verificados
      const allVerified = audit.normPointsVerification.every(
        v => v.conformityStatus !== null
      );

      if (!allVerified) {
        throw new Error('Todos los puntos deben estar verificados');
      }

      // Las reuniones y entrega de informe son opcionales para simplificar

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'completed',
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error completing audit:', error);
      throw error;
    }
  }
}
