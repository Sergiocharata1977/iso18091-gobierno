import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { Reaction } from './types';
import { CreateReactionSchema } from './validations';

export class ReactionService extends BaseService<Reaction> {
  protected collectionName = 'reactions';
  protected schema = CreateReactionSchema;

  async toggle(
    postId: string,
    userId: string,
    reactionType: string,
    organizationId?: string
  ): Promise<void> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('postId', '==', postId)
        .where('userId', '==', userId)
        .where('reactionType', '==', reactionType)
        .where('deletedAt', '==', null)
        .get();

      if (snapshot.empty) {
        // Crear nueva reacción
        const reactionData: Omit<Reaction, 'id'> = {
          ...(organizationId ? { organization_id: organizationId } : {}),
          postId,
          userId,
          reactionType: reactionType as any,
          isActive: true,
          createdBy: userId,
          createdAt: Timestamp.now(),
          updatedBy: userId,
          updatedAt: Timestamp.now(),
          deletedAt: null,
        };

        await this.db.collection(this.collectionName).add(reactionData);
      } else {
        // Eliminar reacción existente
        const doc = snapshot.docs[0];
        await this.db.collection(this.collectionName).doc(doc.id).update({
          deletedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error(`Error toggling reaction for post ${postId}`, error);
      throw error;
    }
  }

  async getByPost(postId: string): Promise<Reaction[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('postId', '==', postId)
        .where('deletedAt', '==', null)
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Reaction
      );
    } catch (error) {
      console.error(`Error getting reactions for post ${postId}`, error);
      throw error;
    }
  }

  async getStats(postId: string): Promise<Record<string, number>> {
    try {
      const reactions = await this.getByPost(postId);

      const stats: Record<string, number> = {
        like: 0,
        love: 0,
        haha: 0,
        wow: 0,
        sad: 0,
        angry: 0,
      };

      reactions.forEach(reaction => {
        stats[reaction.reactionType]++;
      });

      return stats;
    } catch (error) {
      console.error(`Error getting reaction stats for post ${postId}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting reaction ${id}`, error);
      throw error;
    }
  }

  async getById(id: string): Promise<Reaction | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Reaction;
    } catch (error) {
      console.error(`Error getting reaction ${id}`, error);
      throw error;
    }
  }

  async list(filters: any = {}, options: any = {}): Promise<Reaction[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Reaction
      );
    } catch (error) {
      console.error('Error listing reactions', error);
      throw error;
    }
  }
}
