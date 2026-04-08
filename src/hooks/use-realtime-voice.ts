import { useCallback, useRef, useState } from 'react';

// Tipos básicos para los eventos de OpenAI Realtime
type RealtimeEvent =
  | { type: 'error'; error: { message: string } }
  | { type: 'response.audio.delta'; delta: string }
  | { type: 'response.done' }
  | { type: 'session.created' }
  | { type: 'input_audio_buffer.speech_started' }
  | { type: 'input_audio_buffer.speech_stopped' }
  | {
      type: 'response.function_call_arguments.done';
      call_id: string;
      name: string;
      arguments: string;
    };

interface UseRealtimeVoiceProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFunctionCall?: (name: string, args: any) => Promise<any>;
}

export function useRealtimeVoice({
  onFunctionCall,
}: UseRealtimeVoiceProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // La IA está hablando
  const [isListening, setIsListening] = useState(false); // El usuario está hablando (VAD)
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  // const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef<number>(0);

  // Inicializar conexión
  const connect = useCallback(async () => {
    try {
      setError(null);

      // 1. Obtener Token Efímero
      const tokenResponse = await fetch('/api/openai/session');
      if (!tokenResponse.ok)
        throw new Error('Error obteniendo token de sesión');
      const data = await tokenResponse.json();
      const ephemeralToken = data.client_secret.value;

      // 2. Conectar WebSocket
      const ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        [
          'realtime',
          `openai-insecure-api-key.${ephemeralToken}`,
          'openai-beta.realtime-v1',
        ]
      );

      ws.onopen = () => {
        console.log('WS Conectado a OpenAI');
        setIsConnected(true);

        // Configurar sesión inicial
        ws.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              voice: 'verse',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              turn_detection: { type: 'server_vad' }, // Detección de actividad de voz automática
              instructions:
                "Eres Don Cándido, un auditor experto en ISO 9001. Tu estilo es directo, profesional y con un toque argentino ('vos'). Eres estricto con las evidencias. Escucha y audita.",
              tools: [
                {
                  type: 'function',
                  name: 'get_my_audits',
                  description:
                    'Obtener la lista de auditorías asignadas al usuario actual',
                  parameters: { type: 'object', properties: {} },
                },
                {
                  type: 'function',
                  name: 'create_finding',
                  description:
                    'Registrar un hallazgo (No Conformidad, Oportunidad de Mejora, etc) en una auditoría',
                  parameters: {
                    type: 'object',
                    properties: {
                      normPointCode: {
                        type: 'string',
                        description: "Código del punto de norma (ej: '8.1')",
                      },
                      conformityStatus: {
                        type: 'string',
                        enum: ['NCM', 'NCm', 'OM', 'CF'],
                        description: 'Estado de conformidad',
                      },
                      description: {
                        type: 'string',
                        description: 'Descripción detallada del hallazgo',
                      },
                    },
                    required: [
                      'normPointCode',
                      'conformityStatus',
                      'description',
                    ],
                  },
                },
              ],
            },
          })
        );
      };

      ws.onmessage = async event => {
        const message: RealtimeEvent = JSON.parse(event.data);

        switch (message.type) {
          case 'error':
            console.error('OpenAI Error:', message.error.message);
            setError(message.error.message);
            break;

          case 'response.audio.delta':
            // Recibimos audio en base64 PCM16 24kHz
            queueAudio(message.delta);
            break;

          case 'input_audio_buffer.speech_started':
            setIsListening(true);
            // Si el usuario habla, interrumpimos la reproducción actual
            stopAudioPlayback();
            break;

          case 'input_audio_buffer.speech_stopped':
            setIsListening(false);
            break;

          case 'response.function_call_arguments.done':
            const args = JSON.parse(message.arguments);
            if (onFunctionCall) {
              console.log('Function Call Triggered:', message.name, args);
              // Ejecutar la tool
              const result = await onFunctionCall(message.name, args);

              // Responder a OpenAI con el resultado
              ws.send(
                JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: message.call_id,
                    output: JSON.stringify(result),
                  },
                })
              );

              // Forzar que genere una respuesta (audio) basada en la tool
              ws.send(JSON.stringify({ type: 'response.create' }));
            }
            break;
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WS Desconectado');
      };

      socketRef.current = ws;

      // 3. Iniciar Micrófono
      await startAudioRecording();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFunctionCall]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    stopAudioRecording();
    stopAudioPlayback();
    setIsConnected(false);
  }, []);

  // --- Audio Handling (Output) ---
  const queueAudio = (base64Audio: string) => {
    audioQueueRef.current.push(base64Audio);
    if (!isPlayingRef.current) {
      playNextInQueue();
    }
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    setIsSpeaking(true);
    isPlayingRef.current = true;

    const chunk = audioQueueRef.current.shift()!;
    // Convert base64 pcm16 to float32
    const audioData = base64ToFloat32(chunk);

    // Play with AudioContext
    const buffer = audioContextRef.current.createBuffer(
      1,
      audioData.length,
      24000
    );
    buffer.getChannelData(0).set(audioData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);

    // Scheduling for smooth playback
    const currentTime = audioContextRef.current.currentTime;
    const startTime = Math.max(currentTime, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      // Simple check, in reality multiple sources overlap slightly
      playNextInQueue();
    };
  };

  const stopAudioPlayback = () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    nextStartTimeRef.current = 0;
    // Note: To truly stop currently playing source we'd need to track the active source node.
    // For MVP clearing queue is often enough to stop "future" speech.
    if (audioContextRef.current) {
      audioContextRef.current
        .suspend()
        .then(() => audioContextRef.current?.resume());
    }
  };

  // --- Audio Handling (Input - Microphone) ---
  const startAudioRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 24000, channelCount: 1, echoCancellation: true },
    });
    streamRef.current = stream;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    const source = audioContextRef.current.createMediaStreamSource(stream);

    // Worklet to process audio (Processor would be in a separate file usually, but for simplicity/Next.js we might use ScriptProcessor or import a blob)
    // For this MVP, using simpler ScriptProcessor (deprecated but works reliably without extra files)
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = e => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)
        return;

      const inputData = e.inputBuffer.getChannelData(0);
      // Convert Float32 to PCM16 Base64
      const base64Audio = float32ToBase64(inputData);

      socketRef.current.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio,
        })
      );
    };

    source.connect(processor);
    processor.connect(audioContextRef.current.destination); // Needed for script processor to run, but mute output?
    // Note: connecting to destination might cause hearing oneself. Usually avoid connecting to destination if not needed or zero gain.
    // Better: Connect to a GainNode with 0 gain then destination.
    const gain = audioContextRef.current.createGain();
    gain.gain.value = 0;
    processor.connect(gain);
    gain.connect(audioContextRef.current.destination);
  };

  const stopAudioRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Utils
  const float32ToBase64 = (float32Array: Float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    // Buffer to string
    let binary = '';
    const bytes = new Uint8Array(int16Array.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const base64ToFloat32 = (base64: string) => {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 0x8000;
    }
    return float32Array;
  };

  return {
    connect,
    disconnect,
    isConnected,
    isSpeaking,
    isListening,
    error,
  };
}
