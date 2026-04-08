import type { Storage } from 'firebase-admin/storage';
import { Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import type {
  WhatsAppMediaAttachment,
  WhatsAppMediaType,
} from '@/types/whatsapp-media';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'video/mp4': 'mp4',
};

interface MetaMediaInfo {
  url: string;
  mime_type?: string;
  file_size?: number;
}

export class MediaHandler {
  constructor(
    private storage: Storage,
    private metaAccessToken: string
  ) {}

  private async getMetaMediaInfo(mediaId: string): Promise<MetaMediaInfo> {
    const mediaInfoRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.metaAccessToken}` },
    });

    if (!mediaInfoRes.ok) {
      throw new Error(
        `No se pudo obtener metadata de media ${mediaId}: ${mediaInfoRes.status}`
      );
    }

    const mediaInfo = (await mediaInfoRes.json()) as MetaMediaInfo;
    if (!mediaInfo.url) {
      throw new Error(`Meta no devolvio URL para media ${mediaId}`);
    }

    return mediaInfo;
  }

  async downloadFromMeta(media_id: string): Promise<Buffer> {
    const mediaInfo = await this.getMetaMediaInfo(media_id);

    const fileRes = await fetch(mediaInfo.url, {
      headers: { Authorization: `Bearer ${this.metaAccessToken}` },
    });

    if (!fileRes.ok) {
      throw new Error(
        `No se pudo descargar media ${media_id}: ${fileRes.status}`
      );
    }

    return Buffer.from(await fileRes.arrayBuffer());
  }

  async uploadToStorage(
    buffer: Buffer,
    orgId: string,
    _media_type: WhatsAppMediaType,
    mime_type: string,
    original_filename?: string
  ): Promise<{ storage_path: string; storage_url: string }> {
    const ext =
      MIME_TO_EXT[mime_type] ||
      (original_filename?.includes('.')
        ? original_filename.split('.').pop()?.toLowerCase()
        : undefined) ||
      'bin';
    const storagePath = `organizations/${orgId}/whatsapp_media/${Date.now()}_${randomUUID()}.${ext}`;

    const bucket = this.storage.bucket();
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      metadata: {
        contentType: mime_type,
      },
      resumable: false,
    });

    const [storageUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return { storage_path: storagePath, storage_url: storageUrl };
  }

  async processMediaMessage(
    media_id: string,
    media_type: WhatsAppMediaType,
    mime_type: string,
    orgId: string,
    original_filename?: string
  ): Promise<WhatsAppMediaAttachment> {
    const mediaInfo = await this.getMetaMediaInfo(media_id);
    const fileRes = await fetch(mediaInfo.url, {
      headers: { Authorization: `Bearer ${this.metaAccessToken}` },
    });

    if (!fileRes.ok) {
      throw new Error(
        `No se pudo descargar media ${media_id}: ${fileRes.status}`
      );
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const resolvedMimeType = mime_type || mediaInfo.mime_type || 'application/octet-stream';
    const upload = await this.uploadToStorage(
      buffer,
      orgId,
      media_type,
      resolvedMimeType,
      original_filename
    );

    return {
      media_type,
      original_url: mediaInfo.url,
      storage_path: upload.storage_path,
      storage_url: upload.storage_url,
      mime_type: resolvedMimeType,
      file_size_bytes: mediaInfo.file_size ?? buffer.length,
      file_name: original_filename,
      downloaded_at: Timestamp.now(),
    };
  }
}
