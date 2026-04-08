'use client';

import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type VoiceFormSessionState } from '@/types/voice-form';

interface VoiceSessionBannerProps {
  session: VoiceFormSessionState;
  onRestore: (session: VoiceFormSessionState) => void;
  onDiscard: () => void;
}

function formatRelativeTime(dateIso: string): string {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));

  if (minutes < 60) {
    return `hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

export function VoiceSessionBanner({
  session,
  onRestore,
  onDiscard,
}: VoiceSessionBannerProps) {
  const fields = Object.keys(session.extracted_fields);
  const firstItems = fields.slice(0, 2);
  const extraCount = Math.max(0, fields.length - firstItems.length);

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
      <p className="font-medium">
        Hay una sesion de voz guardada ({formatRelativeTime(session.updated_at)}).
      </p>
      <p className="mt-1 text-amber-900">
        Se completaron: {firstItems.join(', ') || 'sin campos'}{' '}
        {extraCount > 0 ? `( +${extraCount} mas )` : ''}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-amber-600 text-white hover:bg-amber-700"
          onClick={() => onRestore(session)}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Restaurar sesion
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-amber-300 text-amber-900 hover:bg-amber-100"
          onClick={onDiscard}
        >
          Descartar
        </Button>
      </div>
    </div>
  );
}
