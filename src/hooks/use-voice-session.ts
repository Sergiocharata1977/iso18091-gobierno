'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { VoiceFormSessionState } from '@/types/voice-form';

const SESSION_KEY_PREFIX = 'voice_form_session_';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const VoiceFormSessionStateSchema = z.object({
  session_id: z.string().min(1),
  form_template_id: z.string().min(1),
  language: z.union([z.literal('es'), z.literal('en')]),
  extracted_fields: z.record(z.string(), z.unknown()),
  failed_fields: z.array(z.string()),
  transcript_history: z.array(z.string()),
  started_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

function buildInitialSession(templateId: string): VoiceFormSessionState {
  const nowIso = new Date().toISOString();

  return {
    session_id: crypto.randomUUID(),
    form_template_id: templateId,
    language: 'es',
    extracted_fields: {},
    failed_fields: [],
    transcript_history: [],
    started_at: nowIso,
    updated_at: nowIso,
  };
}

export function useVoiceSession(templateId: string) {
  const key = useMemo(() => `${SESSION_KEY_PREFIX}${templateId}`, [templateId]);
  const [session, setSession] = useState<VoiceFormSessionState | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return;
      }

      const parsed = VoiceFormSessionStateSchema.parse(JSON.parse(raw));
      const age = Date.now() - new Date(parsed.updated_at).getTime();

      if (age > SESSION_TTL_MS) {
        window.localStorage.removeItem(key);
        return;
      }

      setSession(parsed);
    } catch {
      window.localStorage.removeItem(key);
    }
  }, [key]);

  const saveSession = useCallback(
    (updates: Partial<VoiceFormSessionState>) => {
      setSession(prev => {
        const base = prev ?? buildInitialSession(templateId);
        const next: VoiceFormSessionState = {
          ...base,
          ...updates,
          session_id: updates.session_id ?? base.session_id,
          form_template_id: updates.form_template_id ?? base.form_template_id,
          started_at: updates.started_at ?? base.started_at,
          updated_at: new Date().toISOString(),
        };

        try {
          const safe = VoiceFormSessionStateSchema.parse(next);
          window.localStorage.setItem(key, JSON.stringify(safe));
          return safe;
        } catch {
          return base;
        }
      });
    },
    [key, templateId]
  );

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(key);
    setSession(null);
  }, [key]);

  return {
    session,
    saveSession,
    clearSession,
  };
}

