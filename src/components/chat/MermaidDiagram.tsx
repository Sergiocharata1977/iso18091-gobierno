'use client';

import { useState } from 'react';

interface MermaidDiagramProps {
  code: string;
}

/**
 * Renderiza un diagrama Mermaid usando mermaid.ink (API pública, sin dependencias).
 * Detecta bloques ```mermaid en el contenido del chat de Don Cándido.
 */
export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  // mermaid.ink espera el código en base64 (URL-safe)
  const encoded = btoa(unescape(encodeURIComponent(code.trim())));
  const imageUrl = `https://mermaid.ink/img/${encoded}?theme=neutral`;
  const svgUrl = `https://mermaid.ink/svg/${encoded}?theme=neutral`;
  const liveUrl = `https://mermaid.live/edit#base64:${encoded}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  return (
    <div className="my-3 rounded-xl border border-indigo-100 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-indigo-700">Diagrama</span>
          <span className="text-xs text-indigo-400">generado por Don Cándido</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            {copied ? '✓ Copiado' : 'Copiar código'}
          </button>
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Mermaid Live ↗
          </a>
          <a
            href="https://whimsical.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Whimsical importa Mermaid nativamente — insertá el código desde el botón 'Copiar código'"
            className="text-xs px-2 py-0.5 rounded bg-white border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors"
          >
            Abrir en Whimsical ↗
          </a>
        </div>
      </div>

      {/* Diagrama */}
      <div className="p-4 flex items-center justify-center min-h-24 bg-white">
        {imageError ? (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">No se pudo renderizar el diagrama.</p>
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline"
            >
              Ver en Mermaid Live →
            </a>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt="Diagrama Mermaid"
            className="max-w-full h-auto rounded"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}
      </div>

      {/* Código fuente colapsable */}
      <details className="border-t border-gray-100">
        <summary className="px-3 py-1.5 text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
          Ver código fuente
        </summary>
        <pre className="px-3 pb-3 text-xs font-mono text-gray-600 whitespace-pre-wrap overflow-auto bg-gray-50">
          {code.trim()}
        </pre>
      </details>
    </div>
  );
}

/**
 * Parsea el contenido de un mensaje y retorna partes de texto y diagramas Mermaid.
 */
export function parseMermaidBlocks(content: string): Array<{ type: 'text' | 'mermaid'; content: string }> {
  const parts: Array<{ type: 'text' | 'mermaid'; content: string }> = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'mermaid', content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }];
}
