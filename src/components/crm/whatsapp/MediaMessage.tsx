'use client';

import { FileText, Mic, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import type { WhatsAppMediaAttachment } from '@/types/whatsapp-media';

interface MediaMessageProps {
  media: WhatsAppMediaAttachment;
  direction: 'inbound' | 'outbound';
}

function formatBytes(size?: number): string {
  if (!size || size <= 0) return 'Tamaño desconocido';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function MediaMessage({ media, direction }: MediaMessageProps) {
  const cardClasses = cn(
    'rounded-xl border p-3',
    direction === 'inbound'
      ? 'border-slate-600 bg-slate-800/70 text-slate-100'
      : 'border-emerald-600/50 bg-emerald-800/40 text-white'
  );
  const isVoiceNote = media.mime_type.toLowerCase().includes('ogg');

  if (media.media_type === 'image') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <img
            src={media.storage_url}
            alt={media.file_name ?? 'Imagen adjunta'}
            className="max-w-[240px] max-h-[320px] rounded-lg object-cover cursor-pointer"
          />
        </DialogTrigger>
        <DialogContent className="max-w-3xl border-slate-700 bg-slate-950 p-2">
          <img
            src={media.storage_url}
            alt={media.file_name ?? 'Imagen adjunta'}
            className="max-h-[80vh] w-full rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (media.media_type === 'document') {
    return (
      <div className={cardClasses}>
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{media.file_name ?? 'Documento adjunto'}</p>
            <p className="text-xs opacity-80">
              {media.mime_type} · {formatBytes(media.file_size_bytes)}
            </p>
          </div>
        </div>
        <a href={media.storage_url} target="_blank" rel="noreferrer" className="mt-2 inline-block">
          <Button size="sm" variant="outline" className="h-8 border-slate-500 bg-transparent text-xs">
            Descargar
          </Button>
        </a>
      </div>
    );
  }

  if (media.media_type === 'audio') {
    return (
      <div className={cn(cardClasses, 'space-y-2')}>
        {isVoiceNote ? (
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
            <Mic className="h-3.5 w-3.5" />
            <span>Nota de voz</span>
          </div>
        ) : null}
        <audio controls src={media.storage_url} className="w-full" />
      </div>
    );
  }

  if (media.media_type === 'video') {
    return <video controls src={media.storage_url} className="max-w-[240px] rounded-lg" />;
  }

  return (
    <div className={cardClasses}>
      <div className="flex items-center gap-2 text-sm">
        <Paperclip className="h-4 w-4" />
        <span>Adjunto no soportado</span>
      </div>
    </div>
  );
}

export type { MediaMessageProps };
