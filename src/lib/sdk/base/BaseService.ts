/**
 * Base Service Class
 *
 * Abstract base class that provides common CRUD operations
 * for all service classes in the SDK.
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  DocumentData,
  Firestore,
  Query,
  Timestamp,
} from 'firebase-admin/firestore';
import { z } from 'zod';
import { NotFoundError, ValidationError } from './BaseError';
import { BaseDocument, ListOptions } from './types';

/**
 * Abstract base service class with common CRUD operations
 * All service classes should extend this class
 */
export abstract class BaseService<T extends BaseDocument> {
  protected db: Firestore;
  protected abstract collectionName: string;
  protected abstract schema: z.ZodSchema<any>;

  constructor() {
    this.db = getAdminFirestore();
  }

  /**
   * Create a new document
   * @param data - Document data (without id, timestamps, audit fields)
   * @param userId - ID of user creating the document
   * @returns Created document with id and timestamps
   */
  async create(data: Partial<T>, userId: string): Promise<T> {
    try {
      // Validate data with schema
      const validated = this.schema.parse(data);

      // Add timestamps and audit fields
      const now = Timestamp.now();
      const docData = {
        ...validated,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        isActive: true,
      };

      // Create document in Firestore
      const docRef = await this.db.collection(this.collectionName).add(docData);

      // Return document with ID
      return {
        id: docRef.id,
        ...docData,
      } as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        error.issues.forEach((err: any) => {
          const path = err.path.join('.');
          if (!errors[path]) errors[path] = [];
          errors[path].push(err.message);
        });
        throw new ValidationError('Validation failed', errors);
      }
      throw error;
    }
  }

  /**
   * Get document by ID
   * @param id - Document ID
   * @returns Document or null if not found
   */
  async getById(id: string): Promise<T | null> {
    const doc = await this.db.collection(this.collectionName).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as T;

    return {
      ...data,
      id: doc.id,
    } as T;
  }

  /**
   * Update document
   * @param id - Document ID
   * @param data - Partial document data to update
   * @param userId - ID of user updating the document
   * @returns Updated document
   */
  async update(id: string, data: Partial<T>, userId: string): Promise<T> {
    // Verify document exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError('Document not found');
    }

    try {
      // Validate partial data
      const validated = (this.schema as any).partial().parse(data);

      // Update with timestamp
      const updateData = {
        ...validated,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      };

      // Update in Firestore
      await this.db.collection(this.collectionName).doc(id).update(updateData);

      // Return updated document
      return this.getById(id) as Promise<T>;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        error.issues.forEach((err: any) => {
          const path = err.path.join('.');
          if (!errors[path]) errors[path] = [];
          errors[path].push(err.message);
        });
        throw new ValidationError('Validation failed', errors);
      }
      throw error;
    }
  }

  /**
   * Soft delete document
   * @param id - Document ID
   */
  async delete(id: string): Promise<void> {
    // Verify document exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError('Document not found');
    }

    // Soft delete by setting isActive to false
    await this.db.collection(this.collectionName).doc(id).update({
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Hard delete document (use with caution)
   * @param id - Document ID
   */
  async hardDelete(id: string): Promise<void> {
    // Verify document exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundError('Document not found');
    }

    // Permanently delete document
    await this.db.collection(this.collectionName).doc(id).delete();
  }

  /**
   * List documents with filters and pagination
   * @param filters - Additional filters to apply
   * @param options - Pagination and sorting options
   * @returns Array of documents
   */
  async list(
    filters: Record<string, any> = {},
    options: ListOptions = {}
  ): Promise<T[]> {
    let query: Query<DocumentData> = this.db
      .collection(this.collectionName)
      .where('isActive', '==', true);

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(key, '==', value);
      }
    });

    // Apply ordering
    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || 'desc');
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    // Execute query
    const snapshot = await query.get();

    // Map documents
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  /**
   * Count documents matching filters
   * @param filters - Additional filters to apply
   * @returns Count of matching documents
   */
  async count(filters: Record<string, any> = {}): Promise<number> {
    let query: Query<DocumentData> = this.db
      .collection(this.collectionName)
      .where('isActive', '==', true);

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(key, '==', value);
      }
    });

    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  /**
   * Check if document exists
   * @param id - Document ID
   * @returns True if document exists
   */
  async exists(id: string): Promise<boolean> {
    const doc = await this.getById(id);
    return doc !== null;
  }

  /**
   * Batch create multiple documents
   * @param dataArray - Array of document data
   * @param userId - ID of user creating the documents
   * @returns Array of created documents
   */
  async batchCreate(dataArray: Partial<T>[], userId: string): Promise<T[]> {
    const batch = this.db.batch();
    const results: T[] = [];

    for (const data of dataArray) {
      const validated = this.schema.parse(data);
      const now = Timestamp.now();
      const docData = {
        ...validated,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        isActive: true,
      };

      const docRef = this.db.collection(this.collectionName).doc();
      batch.set(docRef, docData);

      results.push({
        id: docRef.id,
        ...docData,
      } as T);
    }

    await batch.commit();
    return results;
  }

  /**
   * Execute operation within a transaction
   * @param operation - Function to execute within transaction
   * @returns Result of the operation
   */
  async withTransaction<R>(
    operation: (transaction: FirebaseFirestore.Transaction) => Promise<R>
  ): Promise<R> {
    return this.db.runTransaction(operation);
  }
}
