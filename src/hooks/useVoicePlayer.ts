'use client';

import { useCallback, useRef, useState } from 'react';

export interface UseVoicePlayerReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useVoicePlayer(): UseVoicePlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      stop();
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) {
          throw new Error('TTS no disponible');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          objectUrlRef.current = null;
        };

        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error de reproducción');
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    },
    [stop],
  );

  return { speak, stop, isPlaying, isLoading, error };
}
