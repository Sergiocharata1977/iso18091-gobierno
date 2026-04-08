'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Mic, XCircle } from 'lucide-react';
import { useState } from 'react';

interface DiagnosticResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function MicrophoneDiagnosticPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    setAudioUrl(null);

    // 1. Check browser support
    addResult({
      step: '1. Verificando soporte del navegador',
      status: 'pending',
      message: 'Verificando...',
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const hasMediaDevices = 'mediaDevices' in navigator;
    const hasGetUserMedia =
      hasMediaDevices && 'getUserMedia' in navigator.mediaDevices;
    const hasMediaRecorder = 'MediaRecorder' in window;

    if (!hasGetUserMedia || !hasMediaRecorder) {
      addResult({
        step: '1. Verificando soporte del navegador',
        status: 'error',
        message: 'Tu navegador no soporta grabación de audio',
        details: `MediaDevices: ${hasMediaDevices}, getUserMedia: ${hasGetUserMedia}, MediaRecorder: ${hasMediaRecorder}`,
      });
      setIsRunning(false);
      return;
    }

    addResult({
      step: '1. Verificando soporte del navegador',
      status: 'success',
      message: '✓ Navegador compatible',
    });

    // 2. Request microphone permission
    addResult({
      step: '2. Solicitando permisos del micrófono',
      status: 'pending',
      message: 'Solicitando acceso...',
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      addResult({
        step: '2. Solicitando permisos del micrófono',
        status: 'success',
        message: '✓ Permisos concedidos',
        details: `Dispositivos de audio: ${stream.getAudioTracks().length}`,
      });
    } catch (error) {
      const errorName = error instanceof Error ? error.name : 'Unknown';
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';

      addResult({
        step: '2. Solicitando permisos del micrófono',
        status: 'error',
        message: `❌ Error: ${errorName}`,
        details: errorMessage,
      });
      setIsRunning(false);
      return;
    }

    // 3. Test recording
    addResult({
      step: '3. Probando grabación de audio',
      status: 'pending',
      message: 'Grabando 3 segundos...',
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    let mediaRecorder: MediaRecorder;
    const audioChunks: Blob[] = [];

    try {
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.start();

      // Record for 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));

      mediaRecorder.stop();
      stream.getTracks().forEach(track => track.stop());

      // Wait for all data to be collected
      await new Promise(resolve => {
        mediaRecorder.onstop = resolve;
      });

      if (audioChunks.length === 0) {
        addResult({
          step: '3. Probando grabación de audio',
          status: 'error',
          message: '❌ No se capturó audio',
          details: 'El micrófono no está capturando sonido',
        });
        setIsRunning(false);
        return;
      }

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      addResult({
        step: '3. Probando grabación de audio',
        status: 'success',
        message: '✓ Grabación exitosa',
        details: `Tamaño: ${(audioBlob.size / 1024).toFixed(2)} KB`,
      });

      // 4. Test transcription API
      addResult({
        step: '4. Probando API de transcripción',
        status: 'pending',
        message: 'Enviando audio a Whisper...',
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'test.webm');

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch('/api/whisper/transcribe', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error en la transcripción');
        }

        const result = await response.json();

        addResult({
          step: '4. Probando API de transcripción',
          status: 'success',
          message: '✓ Transcripción exitosa',
          details: `Texto: "${result.text}" (${result.latencyMs}ms)`,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';
        const isTimeout = errorMessage.includes('aborted');

        addResult({
          step: '4. Probando API de transcripción',
          status: 'error',
          message: isTimeout
            ? '❌ Timeout - La API tardó demasiado'
            : '❌ Error en la API',
          details: isTimeout
            ? 'La API de Whisper no respondió en 15 segundos. Esto puede deberse a problemas de red o la API de Groq está lenta. El micrófono funciona correctamente.'
            : errorMessage,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      addResult({
        step: '3. Probando grabación de audio',
        status: 'error',
        message: '❌ Error al grabar',
        details: errorMessage,
      });
    }

    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Diagnóstico del Micrófono
              </h1>
              <p className="text-gray-600 mt-1">
                Prueba tu micrófono y la integración con Whisper
              </p>
            </div>
          </div>

          <div className="mb-8">
            <Button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-6 text-lg font-semibold rounded-xl shadow-lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ejecutando diagnóstico...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Iniciar Diagnóstico
                </>
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Resultados
              </h2>
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    result.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : result.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {result.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : result.status === 'error' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {result.step}
                      </p>
                      <p className="text-gray-700 mt-1">{result.message}</p>
                      {result.details && (
                        <p className="text-sm text-gray-600 mt-2 font-mono bg-white/50 p-2 rounded">
                          {result.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {audioUrl && (
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-3">
                🎵 Audio Grabado
              </h3>
              <audio controls src={audioUrl} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">
                Si puedes escuchar el audio, tu micrófono está funcionando
                correctamente.
              </p>
            </div>
          )}

          <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">
              💡 Solución de Problemas
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Error de permisos:</strong> Verifica que hayas dado
                  permiso al navegador para usar el micrófono. Revisa la
                  configuración del sitio en tu navegador.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>No se captura audio:</strong> Verifica que tu
                  micrófono esté conectado y seleccionado como dispositivo
                  predeterminado en Windows.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Error en la API:</strong> Verifica que la variable de
                  entorno GROQ_API_KEY esté configurada correctamente.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
