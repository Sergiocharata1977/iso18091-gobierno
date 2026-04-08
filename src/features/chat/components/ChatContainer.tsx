// ChatContainer - Contenedor principal del chat Don Cándido
// Layout con sidebar de sesiones, área de mensajes y panel de contexto

'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import { BarChart3, Brain, Menu, Moon, Sun, X, Zap } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatWindow } from './ChatWindow';
import { SessionList } from './SessionList';

interface ChatContainerProps {
  onClose: () => void;
  module?: string; // Prop opcional manual, tiene prioridad sobre la automática
}

// Helper para mapear rutas a keys de módulos (coinciden con KnowledgeBaseService)
const getModuleFromPath = (path: string): string => {
  if (!path) return 'general';
  if (path.includes('/rrhh')) return 'rrhh';
  if (path.includes('/planificacion-revision-direccion'))
    return 'planificacion';
  if (path.includes('/auditorias')) return 'auditorias';
  if (path.includes('/documentos')) return 'documentos';
  if (path.includes('/procesos')) return 'procesos';
  if (path.includes('/riesgos') || path.includes('/amfe'))
    return 'planificacion'; // AMFE es parte de planificación
  if (path.includes('/hallazgos')) return 'hallazgos';
  if (path.includes('/acciones')) return 'acciones';
  if (path.includes('/crm') || path.includes('/ventas')) return 'crm';
  if (path.includes('/dashboard')) return 'general';
  return 'general';
};

export function ChatContainer({
  onClose,
  module: manualModule,
}: ChatContainerProps) {
  const { usuario } = useCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const pathname = usePathname();

  // Determinar el módulo actual: Manual (prop) > Automático (URL) > General
  const currentModule = useMemo(() => {
    return manualModule || getModuleFromPath(pathname);
  }, [manualModule, pathname]);

  // Usar el hook de chat con el módulo dinámico
  const chat = useChat({
    userId: usuario?.id || '',
    module: currentModule,
    screen: pathname,
    autoCreateSession: true,
  });

  // Responsive check
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setContextPanelOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Toggle Dark Mode
  useEffect(() => {
    if (chat.config.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [chat.config.darkMode]);

  if (!usuario) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Cargando usuario...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full md:w-1/2 lg:w-[45%] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 text-gray-900 dark:text-white overflow-hidden transition-colors duration-300 shadow-2xl border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">DC</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                Don Cándido IA
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  v3.0
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Asesor Experto ISO 9001
              </p>
            </div>
          </div>
        </div>

        {/* Controles del header */}
        <div className="flex items-center gap-2">
          {/* AI Mode Selector */}
          <div className="relative group">
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                chat.config.aiMode === 'fast'
                  ? 'border-yellow-400/50 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                  : 'border-purple-400/50 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
              )}
              title="Modelo de IA"
            >
              {chat.config.aiMode === 'fast' ? (
                <Zap className="w-4 h-4" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {chat.config.aiMode === 'fast' ? 'Rápido' : 'Calidad'}
              </span>
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => chat.setAIMode('fast')}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors flex items-center gap-2',
                  chat.config.aiMode === 'fast' &&
                    'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700'
                )}
              >
                <Zap className="w-4 h-4" />
                <div>
                  <div className="font-medium">Rápido (Groq)</div>
                  <div className="text-[10px] opacity-70">
                    Respuestas instantáneas
                  </div>
                </div>
              </button>
              <button
                onClick={() => chat.setAIMode('quality')}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg transition-colors flex items-center gap-2',
                  chat.config.aiMode === 'quality' &&
                    'bg-purple-50 dark:bg-purple-900/20 text-purple-700'
                )}
              >
                <Brain className="w-4 h-4" />
                <div>
                  <div className="font-medium">Calidad (Claude)</div>
                  <div className="text-[10px] opacity-70">
                    Respuestas detalladas
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Context Panel Toggle */}
          <button
            onClick={() => setContextPanelOpen(!contextPanelOpen)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              contextPanelOpen
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
            )}
            title="Panel de contexto"
          >
            <BarChart3 className="w-5 h-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => chat.setDarkMode(!chat.config.darkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            title={chat.config.darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {chat.config.darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-gray-500 dark:text-gray-400 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Sidebar - Session List */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm',
            sidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0'
          )}
        >
          <SessionList
            sessions={chat.sessions}
            currentSessionId={chat.currentSession?.id}
            onSelectSession={chat.selectSession}
            onNewSession={chat.createSession}
            onDeleteSession={chat.deleteSession}
            isLoading={chat.isLoading}
          />
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatWindow
            messages={chat.messages}
            onSendMessage={chat.sendMessage}
            isLoading={chat.isLoading}
            isSending={chat.isSending}
            error={chat.error}
            onClearError={chat.clearError}
            aiMode={chat.config.aiMode}
            currentSession={chat.currentSession}
          />
        </div>

        {/* Context Panel (opcional) */}
        {contextPanelOpen && (
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-4 overflow-y-auto">
            <h3 className="font-semibold text-sm mb-4">Contexto del Usuario</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Usuario
                </p>
                <p className="font-medium">{usuario?.email}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Rol</p>
                <p className="font-medium capitalize">
                  {usuario?.rol || 'No asignado'}
                </p>
              </div>
              {currentModule && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Módulo activo
                  </p>
                  <p className="font-medium capitalize">{currentModule}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
