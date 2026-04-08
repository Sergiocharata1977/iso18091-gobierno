import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { Comment, CreateCommentInput } from './types';
import { CreateCommentSchema } from './validations';

export class CommentService extends BaseService<Comment> {
  protected collectionName = 'comments';
  protected schema = CreateCommentSchema;

  async createAndReturnId(
    data: CreateCommentInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);

    const commentData: Omit<Comment, 'id'> = {
      ...validated,
      author: userId,
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(commentData);
    return docRef.id;
  }

  async getByPost(postId: string): Promise<Comment[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('postId', '==', postId)
        .where('deletedAt', '==', null)
        .orderBy('createdAt', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Comment
      );
    } catch (error) {
      console.error(`Error getting comments for post ${postId}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting comment ${id}`, error);
      throw error;
    }
  }

  async getById(id: string): Promise<Comment | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Comment;
    } catch (error) {
      console.error(`Error getting comment ${id}`, error);
      throw error;
    }
  }

  async list(filters: any = {}, options: any = {}): Promise<Comment[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Comment
      );
    } catch (error) {
      console.error('Error listing comments', error);
      throw error;
    }
  }
}
