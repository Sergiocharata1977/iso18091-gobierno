// DonCandidoFAB - Floating Action Button para abrir el chat

'use client';

import { DonCandidoAvatar } from '@/components/ui/DonCandidoAvatar';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ChatContainer } from './ChatContainer';

interface DonCandidoFABProps {
  module?: string;
  className?: string;
}

export function DonCandidoFAB({ module, className }: DonCandidoFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-40',
          'w-20 h-20 rounded-full',
          'bg-transparent',
          'hover:bg-white/5',
          'border-2 border-emerald-500/20',
          'hover:border-emerald-500/40',
          'shadow-lg hover:shadow-xl shadow-emerald-500/25',
          'flex items-center justify-center',
          'transition-all duration-300 hover:scale-110',
          'group overflow-visible',
          isOpen && 'hidden',
          className
        )}
        title="Abrir Don Cándido IA"
        aria-label="Abrir asistente IA"
      >
        <div className="w-16 h-16">
          <DonCandidoAvatar mood="chatbot" className="w-full h-full" />
        </div>

        {/* Pulse animation */}
        <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping opacity-25" />

        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Don Cándido IA
        </span>
      </button>

      {/* Chat Container */}
      {isOpen && (
        <ChatContainer onClose={() => setIsOpen(false)} module={module} />
      )}
    </>
  );
}
