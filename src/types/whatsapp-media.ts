export type WhatsAppMediaType =
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'sticker';

export interface WhatsAppMediaAttachment {
  media_type: WhatsAppMediaType;
  original_url: string;
  storage_path: string;
  storage_url: string;
  mime_type: string;
  file_size_bytes?: number;
  file_name?: string;
  thumbnail_url?: string;
  downloaded_at: FirebaseFirestore.Timestamp;
}
