import { EventPublisher } from '@/services/calendar/EventPublisher';
import { Timestamp } from 'firebase-admin/firestore';
import { BaseService } from '../../base/BaseService';
import type {
  Action,
  ActionFilters,
  ActionStats,
  CreateActionInput,
} from './types';
import {
  ActionFiltersSchema,
  CreateActionSchema,
  UpdateActionExecutionSchema,
  VerifyEffectivenessSchema,
} from './validations';

export class ActionService extends BaseService<Action> {
  protected collectionName = 'actions';
  protected schema = CreateActionSchema;

  async createAndReturnId(
    data: CreateActionInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);

    const dueDate =
      validated.dueDate instanceof Date
        ? validated.dueDate
        : new Date(validated.dueDate);

    const actionData: Omit<Action, 'id'> = {
      title: validated.title,
      description: validated.description,
      findingId: validated.findingId,
      responsibleId: validated.responsibleId,
      dueDate: Timestamp.fromDate(dueDate),
      priority: validated.priority || 'medium',
      estimatedCost: validated.estimatedCost,
      resources: validated.resources,
      tags: validated.tags,
      status: 'pending',
      progressPercentage: 0,
      isEffective: null,
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(actionData);

    const actionId = docRef.id;

    // Publicar evento en el calendario
    try {
      await EventPublisher.publishEvent('actions', {
        title: `Acción: ${validated.title}`,
        description: validated.description,
        date: dueDate,
        type: 'action_deadline',
        sourceRecordId: actionId,
        sourceRecordType: 'action',
        priority: validated.priority || 'medium',
        responsibleUserId: validated.responsibleId,
        metadata: {
          actionId,
          findingId: validated.findingId,
          estimatedCost: validated.estimatedCost,
          tags: validated.tags,
        },
      });
    } catch (error) {
      console.error('Error publishing action event:', error);
      // No fallar la creación de la acción si falla el evento
    }

    return actionId;
  }

  async list(
    filters: ActionFilters = {},
    options: any = {}
  ): Promise<Action[]> {
    try {
      ActionFiltersSchema.parse(filters);

      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.priority) {
        query = query.where('priority', '==', filters.priority);
      }

      if (filters.responsibleId) {
        query = query.where('responsibleId', '==', filters.responsibleId);
      }

      if (filters.findingId) {
        query = query.where('findingId', '==', filters.findingId);
      }

      if (filters.isEffective !== undefined) {
        query = query.where('isEffective', '==', filters.isEffective);
      }

      if (filters.dueDateFrom) {
        const fromDate =
          filters.dueDateFrom instanceof Date
            ? filters.dueDateFrom
            : new Date(filters.dueDateFrom);
        query = query.where('dueDate', '>=', Timestamp.fromDate(fromDate));
      }

      if (filters.dueDateTo) {
        const toDate =
          filters.dueDateTo instanceof Date
            ? filters.dueDateTo
            : new Date(filters.dueDateTo);
        query = query.where('dueDate', '<=', Timestamp.fromDate(toDate));
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Action
      );
    } catch (error) {
      console.error('Error listing actions', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Action | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Action;
    } catch (error) {
      console.error(`Error getting action ${id}`, error);
      throw error;
    }
  }

  async updateExecution(id: string, data: any, userId: string): Promise<void> {
    try {
      const validated = UpdateActionExecutionSchema.parse(data);

      const updateData: Record<string, any> = {
        status: validated.status,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      };

      if (validated.progressPercentage !== undefined) {
        updateData.progressPercentage = validated.progressPercentage;
      }

      if (validated.notes) {
        updateData.notes = validated.notes;
      }

      if (validated.attachments) {
        updateData.attachments = validated.attachments;
      }

      if (validated.status === 'completed') {
        updateData.completedAt = Timestamp.now();
        updateData.completedBy = userId;
      }

      await this.db.collection(this.collectionName).doc(id).update(updateData);

      // Actualizar evento en el calendario si cambió el estado
      try {
        await EventPublisher.updatePublishedEvent('actions', id, {
          metadata: {
            status: validated.status,
            progressPercentage: validated.progressPercentage,
          },
        });
      } catch (error) {
        console.error('Error updating action event:', error);
      }
    } catch (error) {
      console.error(`Error updating action execution ${id}`, error);
      throw error;
    }
  }

  async verifyEffectiveness(
    id: string,
    data: any,
    userId: string
  ): Promise<void> {
    try {
      const validated = VerifyEffectivenessSchema.parse(data);

      const verificationDate =
        validated.verificationDate instanceof Date
          ? validated.verificationDate
          : new Date(validated.verificationDate);

      const updateData: Record<string, any> = {
        isEffective: validated.isEffective,
        verificationDate: Timestamp.fromDate(verificationDate),
        verificationNotes: validated.verificationNotes,
        verifiedBy: userId,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      };

      if (validated.evidenceAttachments) {
        updateData.evidenceAttachments = validated.evidenceAttachments;
      }

      if (validated.followUpRequired) {
        updateData.followUpRequired = true;
        updateData.followUpDescription = validated.followUpDescription;
      }

      await this.db.collection(this.collectionName).doc(id).update(updateData);
    } catch (error) {
      console.error(`Error verifying action effectiveness ${id}`, error);
      throw error;
    }
  }

  async close(id: string, userId: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        status: 'completed',
        completedAt: Timestamp.now(),
        completedBy: userId,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error(`Error closing action ${id}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });

      // Eliminar evento del calendario
      try {
        await EventPublisher.deletePublishedEvent('actions', id);
      } catch (error) {
        console.error('Error deleting action event:', error);
      }
    } catch (error) {
      console.error(`Error deleting action ${id}`, error);
      throw error;
    }
  }

  async getStats(filters: any = {}): Promise<ActionStats> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.responsibleId) {
        query = query.where('responsibleId', '==', filters.responsibleId);
      }

      if (filters.findingId) {
        query = query.where('findingId', '==', filters.findingId);
      }

      const snapshot = await query.get();
      const actions = snapshot.docs.map(doc => doc.data() as Action);

      const stats: ActionStats = {
        total: actions.length,
        pending: actions.filter(a => a.status === 'pending').length,
        inProgress: actions.filter(a => a.status === 'in_progress').length,
        completed: actions.filter(a => a.status === 'completed').length,
        cancelled: actions.filter(a => a.status === 'cancelled').length,
        effective: actions.filter(a => a.isEffective === true).length,
        ineffective: actions.filter(a => a.isEffective === false).length,
        unverified: actions.filter(a => a.isEffective === null).length,
        overdue: actions.filter(a => {
          if (!a.dueDate) return false;
          const dueDate =
            a.dueDate instanceof Timestamp
              ? a.dueDate.toDate()
              : new Date(a.dueDate);
          return dueDate < new Date() && a.status !== 'completed';
        }).length,
        averageProgressPercentage:
          actions.length > 0
            ? Math.round(
                actions.reduce(
                  (sum, a) => sum + (a.progressPercentage || 0),
                  0
                ) / actions.length
              )
            : 0,
      };

      return stats;
    } catch (error) {
      console.error('Error getting action stats', error);
      throw error;
    }
  }
}
