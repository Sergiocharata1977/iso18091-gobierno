import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTextToSpeechReturn {
  isPlaying: boolean;
  speak: (text: string, onEnd?: () => void) => Promise<void>;
  stop: () => void;
  error: string | null;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEndCallbackRef.current) {
        onEndCallbackRef.current();
        onEndCallbackRef.current = null;
      }
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
      setError('Error playing audio');
    };

    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('error', handleError);

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('error', handleError);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (!text) return;

    stop(); // Stop any current playback
    setError(null);
    setIsPlaying(true);
    onEndCallbackRef.current = onEnd || null;

    try {
      const response = await fetch('/api/elevenlabs/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate speech');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Error in TTS:', err);
      setError(err instanceof Error ? err.message : 'Error generating speech');
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    onEndCallbackRef.current = null;
  }, []);

  return {
    isPlaying,
    speak,
    stop,
    error,
  };
}
