import { Timestamp } from 'firebase/firestore';

// ============================================
// TIPOS BASE
// ============================================

export type ReactionType = 'like';

export type NotificationType = 'comment' | 'reaction';

// ============================================
// INTERFACES PRINCIPALES
// ============================================

export interface Post {
  id: string;

  // Contenido
  content: string; // Texto de la publicación (1-5000 chars)
  images: PostImage[]; // Hasta 5 imágenes (Fase 2)
  attachments: PostAttachment[]; // Hasta 3 PDFs (Fase 2)

  // Autor
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;

  // Organización (preparado para multi-tenancy futuro)
  organizationId: string; // Por ahora siempre "default-org"

  // Metadata
  isEdited: boolean;
  editedAt: Timestamp | null;

  // Contadores
  commentCount: number;
  reactionCount: number;

  // Moderación
  isModerated: boolean;
  moderatedBy: string | null;
  moderatedAt: Timestamp | null;
  moderationReason: string | null;

  // Auditoría
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

export interface PostImage {
  url: string; // URL de Firebase Storage
  storagePath: string; // Path en Storage
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
}

export interface PostAttachment {
  url: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface Comment {
  id: string;

  // Relación
  postId: string;

  // Contenido
  content: string; // Texto del comentario (1-1000 chars)

  // Autor
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;

  // Metadata
  isEdited: boolean;
  editedAt: Timestamp | null;

  // Contadores
  reactionCount: number;

  // Moderación
  isModerated: boolean;
  moderatedBy: string | null;
  moderatedAt: Timestamp | null;
  moderationReason: string | null;

  // Auditoría
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

export interface Reaction {
  id: string;

  // Relación
  targetType: 'post' | 'comment';
  targetId: string; // ID del post o comentario

  // Usuario
  userId: string;
  userName: string;

  // Tipo de reacción
  type: ReactionType;

  // Auditoría
  createdAt: Timestamp;
}

export interface NewsNotification {
  id: string;

  // Destinatario
  userId: string;

  // Tipo de notificación
  type: NotificationType;

  // Relación
  postId: string;
  commentId: string | null; // Si es reacción a comentario

  // Actor (quien generó la notificación)
  actorId: string;
  actorName: string;
  actorPhotoURL: string | null;

  // Contenido
  message: string; // Mensaje descriptivo

  // Estado
  isRead: boolean;
  readAt: Timestamp | null;

  // Auditoría
  createdAt: Timestamp;
}

// ============================================
// TIPOS PARA FORMULARIOS Y CREACIÓN
// ============================================

export interface PostCreateData {
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  organizationId: string;
  images?: PostImage[]; // Fase 2
  attachments?: PostAttachment[]; // Fase 2
}

export interface PostUpdateData {
  content: string;
}

export interface CommentCreateData {
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
}

export interface CommentUpdateData {
  content: string;
}

export interface ReactionCreateData {
  targetType: 'post' | 'comment';
  targetId: string;
  userId: string;
  userName: string;
  type: ReactionType;
}

export interface NotificationCreateData {
  userId: string;
  type: NotificationType;
  postId: string;
  commentId: string | null;
  actorId: string;
  actorName: string;
  actorPhotoURL: string | null;
  message: string;
}

// ============================================
// TIPOS PARA FORMULARIOS (CLIENT-SIDE)
// ============================================

export interface PostFormData {
  content: string;
}

export interface CommentFormData {
  content: string;
}

// ============================================
// TIPOS PARA RESPUESTAS DE API
// ============================================

export interface PostsResponse {
  success: boolean;
  data: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface PostResponse {
  success: boolean;
  data: Post;
}

export interface CommentsResponse {
  success: boolean;
  data: Comment[];
}

export interface CommentResponse {
  success: boolean;
  data: Comment;
}

export interface ReactionResponse {
  success: boolean;
  data: {
    reacted: boolean; // true si agregó, false si quitó
    count: number; // Nuevo contador
  };
}

export interface NotificationsResponse {
  success: boolean;
  data: NewsNotification[];
  unreadCount: number;
}

export interface SearchResponse {
  success: boolean;
  data: Post[];
}

// ============================================
// TIPOS PARA ERRORES
// ============================================

export enum NewsErrorCode {
  // Validación
  INVALID_POST_DATA = 'INVALID_POST_DATA',
  INVALID_COMMENT_DATA = 'INVALID_COMMENT_DATA',
  CONTENT_TOO_SHORT = 'CONTENT_TOO_SHORT',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  TOO_MANY_IMAGES = 'TOO_MANY_IMAGES',
  TOO_MANY_ATTACHMENTS = 'TOO_MANY_ATTACHMENTS',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  // Permisos
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  USER_DISABLED = 'USER_DISABLED',

  // Recursos
  POST_NOT_FOUND = 'POST_NOT_FOUND',
  COMMENT_NOT_FOUND = 'COMMENT_NOT_FOUND',

  // General
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class NewsError extends Error {
  constructor(
    message: string,
    public code: NewsErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'NewsError';
  }
}

export interface ErrorResponse {
  success: false;
  error: {
    code: NewsErrorCode;
    message: string;
    details?: unknown;
  };
}

// ============================================
// TIPOS PARA PAGINACIÓN
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  lastDocId?: string; // Para cursor-based pagination
}

// ============================================
// TIPOS PARA FILTROS
// ============================================

export interface PostFilters {
  authorId?: string;
  search?: string;
}
