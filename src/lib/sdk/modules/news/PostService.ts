import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { Post, CreatePostInput, PostFilters } from './types';
import { CreatePostSchema, PostFiltersSchema } from './validations';

export class PostService extends BaseService<Post> {
  protected collectionName = 'posts';
  protected schema = CreatePostSchema;

  async createAndReturnId(
    data: CreatePostInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);

    const postData: Omit<Post, 'id'> = {
      ...validated,
      tags: validated.tags || [],
      author: userId,
      likes: 0,
      comments: 0,
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db.collection(this.collectionName).add(postData);
    return docRef.id;
  }

  async list(filters: PostFilters = {}, options: any = {}): Promise<Post[]> {
    try {
      PostFiltersSchema.parse(filters);

      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.author) {
        query = query.where('author', '==', filters.author);
      }

      if (filters.dateFrom) {
        const fromDate =
          filters.dateFrom instanceof Date
            ? filters.dateFrom
            : new Date(filters.dateFrom);
        query = query.where('createdAt', '>=', Timestamp.fromDate(fromDate));
      }

      if (filters.dateTo) {
        const toDate =
          filters.dateTo instanceof Date
            ? filters.dateTo
            : new Date(filters.dateTo);
        query = query.where('createdAt', '<=', Timestamp.fromDate(toDate));
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

      const snapshot = await query.get();
      let posts = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Post
      );

      if (filters.tags && filters.tags.length > 0) {
        posts = posts.filter(post =>
          filters.tags!.some(tag => post.tags.includes(tag))
        );
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        posts = posts.filter(
          post =>
            post.title.toLowerCase().includes(searchLower) ||
            post.content.toLowerCase().includes(searchLower)
        );
      }

      return posts;
    } catch (error) {
      console.error('Error listing posts', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Post | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Post;
    } catch (error) {
      console.error(`Error getting post ${id}`, error);
      throw error;
    }
  }

  async getFeed(userId: string, limit: number = 20): Promise<Post[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post);
    } catch (error) {
      console.error(`Error getting feed for user ${userId}`, error);
      throw error;
    }
  }

  async getByAuthor(authorId: string): Promise<Post[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('author', '==', authorId)
        .where('deletedAt', '==', null)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post);
    } catch (error) {
      console.error(`Error getting posts by author ${authorId}`, error);
      throw error;
    }
  }

  async search(query: string): Promise<Post[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .orderBy('createdAt', 'desc')
        .get();

      const queryLower = query.toLowerCase();
      const posts = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Post
      );

      return posts.filter(
        post =>
          post.title.toLowerCase().includes(queryLower) ||
          post.content.toLowerCase().includes(queryLower) ||
          post.tags.some(tag => tag.toLowerCase().includes(queryLower))
      );
    } catch (error) {
      console.error(`Error searching posts with query ${query}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting post ${id}`, error);
      throw error;
    }
  }

  async incrementLikes(id: string): Promise<void> {
    try {
      await this.db
        .collection(this.collectionName)
        .doc(id)
        .update({
          likes: (await this.getById(id))?.likes || 0 + 1,
        });
    } catch (error) {
      console.error(`Error incrementing likes for post ${id}`, error);
      throw error;
    }
  }

  async incrementComments(id: string): Promise<void> {
    try {
      await this.db
        .collection(this.collectionName)
        .doc(id)
        .update({
          comments: (await this.getById(id))?.comments || 0 + 1,
        });
    } catch (error) {
      console.error(`Error incrementing comments for post ${id}`, error);
      throw error;
    }
  }

  /**
   * Obtener posts trending (más likes en últimas 7 días)
   */
  async getTrendingPosts(limit: number = 10): Promise<Post[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
        .orderBy('createdAt', 'desc')
        .orderBy('likes', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post);
    } catch (error) {
      console.error('Error getting trending posts', error);
      throw error;
    }
  }

  /**
   * Obtener posts destacados (featured)
   */
  async getFeaturedPosts(limit: number = 5): Promise<Post[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .where('isFeatured', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post);
    } catch (error) {
      console.error('Error getting featured posts', error);
      throw error;
    }
  }

  /**
   * Marcar post como destacado
   */
  async markAsFeatured(id: string, userId: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        isFeatured: true,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error(`Error marking post ${id} as featured`, error);
      throw error;
    }
  }

  /**
   * Desmarcar post como destacado
   */
  async unmarkAsFeatured(id: string, userId: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        isFeatured: false,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error(`Error unmarking post ${id} as featured`, error);
      throw error;
    }
  }

  /**
   * Obtener posts por categoría
   */
  async getByCategory(category: string, limit: number = 20): Promise<Post[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .where('category', '==', category)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post);
    } catch (error) {
      console.error(`Error getting posts by category ${category}`, error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de posts
   */
  async getPostStats(): Promise<{
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    averageLikesPerPost: number;
    averageCommentsPerPost: number;
    mostLikedPost: Post | null;
    mostCommentedPost: Post | null;
  }> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .get();

      const posts = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Post
      );

      if (posts.length === 0) {
        return {
          totalPosts: 0,
          totalLikes: 0,
          totalComments: 0,
          averageLikesPerPost: 0,
          averageCommentsPerPost: 0,
          mostLikedPost: null,
          mostCommentedPost: null,
        };
      }

      const totalLikes = posts.reduce(
        (sum, post) => sum + (post.likes || 0),
        0
      );
      const totalComments = posts.reduce(
        (sum, post) => sum + (post.comments || 0),
        0
      );

      const mostLikedPost = posts.reduce((prev, current) =>
        (current.likes || 0) > (prev.likes || 0) ? current : prev
      );

      const mostCommentedPost = posts.reduce((prev, current) =>
        (current.comments || 0) > (prev.comments || 0) ? current : prev
      );

      return {
        totalPosts: posts.length,
        totalLikes,
        totalComments,
        averageLikesPerPost: totalLikes / posts.length,
        averageCommentsPerPost: totalComments / posts.length,
        mostLikedPost,
        mostCommentedPost,
      };
    } catch (error) {
      console.error('Error getting post stats', error);
      throw error;
    }
  }

  /**
   * Obtener posts populares (por engagement)
   */
  async getPopularPosts(limit: number = 10): Promise<Post[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .get();

      const posts = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Post
      );

      // Calcular engagement score (likes + comments)
      const postsWithScore = posts.map(post => ({
        ...post,
        engagementScore: (post.likes || 0) + (post.comments || 0),
      }));

      return postsWithScore
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit)
        .map(({ engagementScore, ...post }) => post);
    } catch (error) {
      console.error('Error getting popular posts', error);
      throw error;
    }
  }

  /**
   * Obtener posts recientes
   */
  async getRecentPosts(limit: number = 20): Promise<Post[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Post);
    } catch (error) {
      console.error('Error getting recent posts', error);
      throw error;
    }
  }

  /**
   * Actualizar post
   */
  async update(id: string, data: Partial<Post>, userId: string): Promise<Post> {
    try {
      const post = await this.getById(id);
      if (!post) {
        throw new Error(`Post ${id} not found`);
      }

      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      };

      await this.db.collection(this.collectionName).doc(id).update(updateData);

      return { ...post, ...updateData } as Post;
    } catch (error) {
      console.error(`Error updating post ${id}`, error);
      throw error;
    }
  }
}
