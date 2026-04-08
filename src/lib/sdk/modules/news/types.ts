import type { BaseDocument } from '../../base/types';
import { Timestamp } from 'firebase-admin/firestore';

export interface Post extends BaseDocument {
  organization_id?: string;
  title: string;
  content: string;
  author: string;
  tags: string[];
  likes: number;
  comments: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface Comment extends BaseDocument {
  organization_id?: string;
  postId: string;
  content: string;
  author: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface Reaction extends BaseDocument {
  organization_id?: string;
  postId: string;
  userId: string;
  reactionType: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
  createdAt: Timestamp;
  createdBy: string;
  deletedAt: Timestamp | null;
}

export interface CreatePostInput {
  organization_id?: string;
  title: string;
  content: string;
  tags?: string[];
}

export interface CreateCommentInput {
  organization_id?: string;
  postId: string;
  content: string;
}

export interface PostFilters {
  tags?: string[];
  author?: string;
  search?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}
