// ChatWidget - Floating Action Button para abrir el chat en landing page
'use client';

import { DonCandidoAvatar } from '@/components/ui/DonCandidoAvatar';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ChatWindow } from './ChatWindow';

interface ChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

export function ChatWidget({
  position = 'bottom-right',
  className,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  return (
    <>
      {/* FAB Button - Tamaño estándar 64px */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-40',
          positionClasses[position],
          'w-16 h-16 rounded-full',
          'bg-slate-900',
          'hover:bg-slate-800',
          'border border-emerald-500/30',
          'hover:border-emerald-500/50',
          'shadow-lg hover:shadow-xl shadow-slate-900/30',
          'flex items-center justify-center',
          'transition-all duration-300 hover:scale-110',
          'group overflow-visible',
          isOpen && 'hidden',
          className
        )}
        title="Abrir Don Cándido IA"
        aria-label="Abrir asistente IA"
      >
        <div className="w-10 h-10">
          <DonCandidoAvatar mood="chatbot" className="w-full h-full" />
        </div>

        {/* Subtle pulse */}
        <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-20" />

        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          ¿Preguntas sobre ISO 9001?
        </span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <ChatWindow onClose={() => setIsOpen(false)} position={position} />
      )}
    </>
  );
}
