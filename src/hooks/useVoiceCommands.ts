'use client';

import { useEffect, useRef } from 'react';

export interface VoiceCommand {
  command: string;
  keywords: string[];
  action: () => void;
}

export interface UseVoiceCommandsOptions {
  enabled: boolean;
  commands: VoiceCommand[];
  language?: string;
}

export function useVoiceCommands({
  enabled,
  commands,
  language = 'es-ES',
}: UseVoiceCommandsOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  const startListening = () => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        recognitionRef.current.start();
        isListeningRef.current = true;
        console.log('[useVoiceCommands] Started listening for commands');
      } catch (err) {
        console.error('[useVoiceCommands] Error starting:', err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
        isListeningRef.current = false;
        console.log('[useVoiceCommands] Stopped listening for commands');
      } catch (err) {
        console.error('[useVoiceCommands] Error stopping:', err);
      }
    }
  };

  useEffect(() => {
    if (!enabled) {
      stopListening();
      return;
    }

    // Check if browser supports speech recognition

    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[useVoiceCommands] Speech recognition not supported');
      return;
    }

    // Create recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();

      console.log('[useVoiceCommands] Heard:', transcript);

      // Check if transcript matches any command
      for (const command of commands) {
        for (const keyword of command.keywords) {
          if (transcript.includes(keyword.toLowerCase())) {
            console.log(
              '[useVoiceCommands] Command detected:',
              command.command
            );
            command.action();
            return;
          }
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('[useVoiceCommands] Error:', event.error);

      // Restart on error (except if aborted)
      if (event.error !== 'aborted' && isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch (err) {
              console.error('[useVoiceCommands] Error restarting:', err);
            }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      console.log('[useVoiceCommands] Recognition ended');

      // Restart if still enabled
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (err) {
          console.error('[useVoiceCommands] Error restarting:', err);
        }
      }
    };

    recognitionRef.current = recognition;
    startListening();

    return () => {
      stopListening();
    };
  }, [enabled, commands, language]);

  return {
    startListening,
    stopListening,
  };
}
