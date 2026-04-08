import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { z } from 'zod';

// Tipos de notificación
export type NotificationType =
  | 'audit_scheduled'
  | 'audit_upcoming'
  | 'action_due'
  | 'action_overdue'
  | 'conformity_alert'
  | 'finding_registered';

// Prioridad de notificación
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

// Estado de notificación
export type NotificationStatus = 'pending' | 'sent' | 'read' | 'archived';

// Interfaz de notificación
export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  relatedId?: string; // ID de auditoría, acción, etc.
  relatedType?: string; // 'audit', 'action', 'finding'
  createdAt?: Timestamp | Date;
  readAt?: Timestamp | Date;
  expiresAt?: Timestamp | Date;
  metadata?: Record<string, any>;
  deletedAt?: Timestamp | Date | null;
}

// Schema de validación
const notificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum([
    'audit_scheduled',
    'audit_upcoming',
    'action_due',
    'action_overdue',
    'conformity_alert',
    'finding_registered',
  ]),
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(1000),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['pending', 'sent', 'read', 'archived']).default('pending'),
  relatedId: z.string().optional(),
  relatedType: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class NotificationService {
  protected collectionName = 'notifications';
  protected schema = notificationSchema;

  /**
   * Crear una notificación
   */
  async createNotification(
    data: Omit<Notification, 'id' | 'createdAt'>
  ): Promise<Notification> {
    const validated = this.schema.parse(data);
    const db = getFirestore();

    const docRef = await addDoc(collection(db, this.collectionName), {
      ...validated,
      createdAt: Timestamp.now(),
      status: 'pending',
    });

    return {
      id: docRef.id,
      ...validated,
      createdAt: new Date(),
      status: 'pending',
    };
  }

  /**
   * Obtener notificaciones de un usuario
   */
  async getNotificationsByUser(
    userId: string,
    status?: NotificationStatus
  ): Promise<Notification[]> {
    const db = getFirestore();
    let q;

    if (status) {
      q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('status', '==', status),
        where('deletedAt', '==', null)
      );
    } else {
      q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('deletedAt', '==', null)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Notification
    );
  }

  /**
   * Obtener notificación por ID
   */
  async getById(notificationId: string): Promise<Notification | null> {
    const db = getFirestore();
    const docRef = doc(db, this.collectionName, notificationId);
    const docSnap = await getDocs(
      query(
        collection(db, this.collectionName),
        where('__name__', '==', notificationId)
      )
    );

    if (docSnap.empty) {
      return null;
    }

    const data = docSnap.docs[0].data();
    return {
      id: docSnap.docs[0].id,
      ...data,
    } as Notification;
  }

  /**
   * Obtener notificaciones no leídas
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.getNotificationsByUser(userId, 'pending');
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const db = getFirestore();
    const docRef = doc(db, this.collectionName, notificationId);

    await updateDoc(docRef, {
      status: 'read',
      readAt: Timestamp.now(),
    });

    const updated = await this.getById(notificationId);
    if (!updated) throw new Error('Notification not found');
    return updated;
  }

  /**
   * Marcar múltiples notificaciones como leídas
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    const db = getFirestore();

    for (const id of notificationIds) {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        status: 'read',
        readAt: Timestamp.now(),
      });
    }
  }

  /**
   * Archivar notificación
   */
  async archiveNotification(notificationId: string): Promise<Notification> {
    const db = getFirestore();
    const docRef = doc(db, this.collectionName, notificationId);

    await updateDoc(docRef, {
      status: 'archived',
    });

    const updated = await this.getById(notificationId);
    if (!updated) throw new Error('Notification not found');
    return updated;
  }

  /**
   * Obtener notificaciones por tipo
   */
  async getNotificationsByType(
    userId: string,
    type: NotificationType
  ): Promise<Notification[]> {
    const db = getFirestore();
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      where('type', '==', type),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Notification
    );
  }

  /**
   * Obtener notificaciones por prioridad
   */
  async getNotificationsByPriority(
    userId: string,
    priority: NotificationPriority
  ): Promise<Notification[]> {
    const db = getFirestore();
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      where('priority', '==', priority),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Notification
    );
  }

  /**
   * Obtener notificaciones relacionadas a una auditoría
   */
  async getNotificationsByAudit(auditId: string): Promise<Notification[]> {
    const db = getFirestore();
    const q = query(
      collection(db, this.collectionName),
      where('relatedId', '==', auditId),
      where('relatedType', '==', 'audit'),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Notification
    );
  }

  /**
   * Obtener notificaciones relacionadas a una acción
   */
  async getNotificationsByAction(actionId: string): Promise<Notification[]> {
    const db = getFirestore();
    const q = query(
      collection(db, this.collectionName),
      where('relatedId', '==', actionId),
      where('relatedType', '==', 'action'),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Notification
    );
  }

  /**
   * Crear notificación de auditoría próxima
   */
  async createAuditUpcomingNotification(
    userId: string,
    auditId: string,
    auditName: string,
    daysUntil: number
  ): Promise<Notification> {
    const priority =
      daysUntil <= 1 ? 'critical' : daysUntil <= 3 ? 'high' : 'medium';

    return this.createNotification({
      userId,
      type: 'audit_upcoming',
      title: `Auditoría próxima: ${auditName}`,
      message: `La auditoría "${auditName}" está programada para dentro de ${daysUntil} día(s)`,
      priority,
      status: 'pending',
      relatedId: auditId,
      relatedType: 'audit',
    });
  }

  /**
   * Crear notificación de acción vencida
   */
  async createActionOverdueNotification(
    userId: string,
    actionId: string,
    actionDescription: string,
    daysOverdue: number
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'action_overdue',
      title: `Acción vencida: ${actionDescription}`,
      message: `La acción "${actionDescription}" está vencida hace ${daysOverdue} día(s)`,
      priority: 'critical',
      status: 'pending',
      relatedId: actionId,
      relatedType: 'action',
    });
  }

  /**
   * Crear notificación de acción próxima a vencer
   */
  async createActionDueNotification(
    userId: string,
    actionId: string,
    actionDescription: string,
    daysUntil: number
  ): Promise<Notification> {
    const priority =
      daysUntil <= 1 ? 'critical' : daysUntil <= 3 ? 'high' : 'medium';

    return this.createNotification({
      userId,
      type: 'action_due',
      title: `Acción próxima a vencer: ${actionDescription}`,
      message: `La acción "${actionDescription}" vence en ${daysUntil} día(s)`,
      priority,
      status: 'pending',
      relatedId: actionId,
      relatedType: 'action',
    });
  }

  /**
   * Crear notificación de alerta de conformidad
   */
  async createConformityAlertNotification(
    userId: string,
    auditId: string,
    conformityRate: number
  ): Promise<Notification> {
    const priority =
      conformityRate < 50
        ? 'critical'
        : conformityRate < 75
          ? 'high'
          : 'medium';

    return this.createNotification({
      userId,
      type: 'conformity_alert',
      title: 'Alerta de conformidad',
      message: `La tasa de conformidad es del ${conformityRate}%`,
      priority,
      status: 'pending',
      relatedId: auditId,
      relatedType: 'audit',
      metadata: { conformityRate },
    });
  }

  /**
   * Crear notificación de hallazgo registrado
   */
  async createFindingRegisteredNotification(
    userId: string,
    findingId: string,
    findingName: string,
    severity: string
  ): Promise<Notification> {
    const priority =
      severity === 'critica'
        ? 'critical'
        : severity === 'alta'
          ? 'high'
          : 'medium';

    return this.createNotification({
      userId,
      type: 'finding_registered',
      title: `Nuevo hallazgo: ${findingName}`,
      message: `Se ha registrado un hallazgo de severidad ${severity}`,
      priority,
      status: 'pending',
      relatedId: findingId,
      relatedType: 'finding',
      metadata: { severity },
    });
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
  }> {
    const notifications = await this.getNotificationsByUser(userId);

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => n.status === 'pending').length,
      byType: {} as Record<NotificationType, number>,
      byPriority: {} as Record<NotificationPriority, number>,
    };

    notifications.forEach(notification => {
      stats.byType[notification.type] =
        (stats.byType[notification.type] || 0) + 1;
      stats.byPriority[notification.priority] =
        (stats.byPriority[notification.priority] || 0) + 1;
    });

    return stats;
  }

  /**
   * Limpiar notificaciones expiradas
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const db = getFirestore();
    const now = Timestamp.now();
    const q = query(
      collection(db, this.collectionName),
      where('expiresAt', '<', now),
      where('deletedAt', '==', null)
    );

    const snapshot = await getDocs(q);
    let count = 0;

    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
      count++;
    }

    return count;
  }
}
