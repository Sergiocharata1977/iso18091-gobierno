import { VoiceAuditor } from '@/components/voice/VoiceAuditor';

export default function VoiceAuditorPage() {
  return (
    <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="text-center mb-10 space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Auditor IA <span className="text-amber-500">Don Cándido</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          Habla con tu auditor virtual en tiempo real. Dicta hallazgos, consulta
          normas y revisa tus auditorías pendientes.
        </p>
      </div>

      <VoiceAuditor />

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-500 max-w-4xl">
        <div className="p-4 bg-slate-50 rounded border border-slate-100">
          <strong className="block text-slate-700 mb-1">🎙️ Full Duplex</strong>
          Conversación fluida natural. Puedes interrumpirlo en cualquier
          momento.
        </div>
        <div className="p-4 bg-slate-50 rounded border border-slate-100">
          <strong className="block text-slate-700 mb-1">
            📋 Memoria Activa
          </strong>
          Conectado a tus auditorías reales. Sabe qué estás auditando.
        </div>
        <div className="p-4 bg-slate-50 rounded border border-slate-100">
          <strong className="block text-slate-700 mb-1">
            ⚡ Acciones de Voz
          </strong>
          "Registra una no conformidad en el punto 8.1 por falta de limpieza".
        </div>
      </div>
    </div>
  );
}
