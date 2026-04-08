'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRealtimeVoice } from '@/hooks/use-realtime-voice';
import { useVoiceSession } from '@/hooks/use-voice-session';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AuditService } from '@/services/audits/AuditService';
import { FindingService } from '@/services/findings/FindingService';
import { Languages, Phone, PhoneOff, Radio, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VoiceAuditorProps {
  templateId?: string;
}

export function VoiceAuditor({ templateId = 'auditor-voz' }: VoiceAuditorProps) {
  const { usuario } = useCurrentUser();
  const [logs, setLogs] = useState<string[]>([]);
  const { session } = useVoiceSession(templateId);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

  const handleFunctionCall = async (name: string, args: any) => {
    if (!usuario?.organization_id) return { error: 'No organization context' };

    addLog(`Ejecutando herramienta: ${name}`);
    console.log(`[VoiceAuditor] Tool Call: ${name}`, args);

    try {
      if (name === 'get_my_audits') {
        const { audits } = await AuditService.list(usuario.organization_id, {
          status: 'in_progress',
        });

        if (audits.length === 0) {
          return { message: 'No tienes auditorias en curso actualmente.' };
        }

        return {
          audits: audits.map(a => ({
            id: a.id,
            number: a.auditNumber,
            title: a.title,
            scope: a.scope,
            status: a.status,
            normPoints: a.selectedNormPoints,
          })),
        };
      }

      if (name === 'create_finding') {
        const { audits } = await AuditService.list(usuario.organization_id, {
          status: 'in_progress',
        });
        const activeAudit = audits[0];

        if (!activeAudit) {
          return {
            error:
              'No hay ninguna auditoria en curso para registrar el hallazgo. Inicia una primero.',
          };
        }

        const findingId = await FindingService.create(
          {
            name: `Hallazgo Voz: ${args.normPointCode}`,
            description: args.description,
            sourceType: 'audit',
            sourceId: activeAudit.id,
            sourceName: activeAudit.auditNumber,
            normPoints: [args.normPointCode],
            processId: '',
            processName: '',
          } as any,
          usuario.id,
          (usuario as any).nombre || 'Usuario Voz',
          usuario.organization_id
        );

        addLog(`Hallazgo creado: ${findingId}`);
        return {
          success: true,
          findingId,
          message: `Hallazgo registrado correctamente en auditoria ${activeAudit.auditNumber}`,
        };
      }
    } catch (e: any) {
      console.error('Tool Error', e);
      addLog(`Error en tool: ${e.message}`);
      return { error: e.message };
    }
    return { error: 'Tool not found' };
  };

  const { connect, disconnect, isConnected, isSpeaking, isListening, error } =
    useRealtimeVoice({
      onFunctionCall: handleFunctionCall,
    });

  const [visualizerBars, setVisualizerBars] = useState<number[]>(
    Array(12).fill(10)
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && (isSpeaking || isListening)) {
      interval = setInterval(() => {
        setVisualizerBars(prev => prev.map(() => Math.random() * 80 + 10));
      }, 100);
    } else {
      setVisualizerBars(Array(12).fill(10));
    }
    return () => clearInterval(interval);
  }, [isConnected, isSpeaking, isListening]);

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-t-4 border-t-amber-500">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Radio
              className={
                isConnected ? 'text-green-500 animate-pulse' : 'text-gray-400'
              }
            />
            Don Candido Voice
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? 'default' : 'outline'}
              className={isConnected ? 'bg-amber-500' : ''}
            >
              {isConnected
                ? isListening
                  ? 'Escuchando...'
                  : isSpeaking
                    ? 'Hablando...'
                    : 'Conectado'
                : 'Desconectado'}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Languages className="h-3 w-3" />
              {session?.language?.toUpperCase() ?? 'ES'}
            </Badge>
            {session && (
              <Badge
                variant="outline"
                className="border-emerald-300 text-emerald-700"
              >
                Sesion activa
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-32 bg-slate-900 rounded-lg flex items-center justify-center gap-1 p-4 relative overflow-hidden">
          <div className="absolute top-2 left-2 text-xs text-slate-500 font-mono">
            STATUS: {isConnected ? 'ONLINE' : 'OFFLINE'}
          </div>
          {visualizerBars.map((height, i) => (
            <div
              key={i}
              className={`w-2 rounded-full transition-all duration-100 ${isSpeaking ? 'bg-amber-400' : isListening ? 'bg-green-400' : 'bg-slate-700'}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        <div className="flex justify-center gap-4">
          {!isConnected ? (
            <Button
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800"
              onClick={() => connect()}
            >
              <Phone className="mr-2 h-5 w-5" />
              Llamar a Auditor
            </Button>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              className="w-full"
              onClick={() => disconnect()}
            >
              <PhoneOff className="mr-2 h-5 w-5" />
              Cortar Llamada
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
            {error}
          </div>
        )}

        <div className="border rounded-md bg-slate-50 p-2">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-semibold uppercase">
            <Terminal className="h-3 w-3" />
            Auditor Logs
          </div>
          <ScrollArea className="h-24 w-full">
            {logs.length === 0 ? (
              <div className="text-xs text-slate-400 italic p-1">
                Esperando actividad...
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className="text-xs font-mono text-slate-600 mb-1 border-b border-slate-100 pb-1 last:border-0"
                >
                  {log}
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
