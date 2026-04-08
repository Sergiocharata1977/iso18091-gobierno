'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';
import { motion } from 'framer-motion';
import { ProcessNode, ProcessLevel } from '@/types/processMap';

interface ProcessMapProps {
  data: ProcessNode[];
}

const levelColors: Record<ProcessLevel, { bg: string; border: string; text: string; bgHover: string }> = {
  1: { bg: 'bg-blue-900/40', border: 'border-blue-500/50', text: 'text-blue-100', bgHover: 'hover:bg-blue-800/50' },
  2: { bg: 'bg-indigo-900/30', border: 'border-indigo-500/40', text: 'text-indigo-100', bgHover: 'hover:bg-indigo-800/40' },
  3: { bg: 'bg-purple-900/20', border: 'border-purple-500/30', text: 'text-purple-100', bgHover: 'hover:bg-purple-800/30' },
  4: { bg: 'bg-emerald-900/20', border: 'border-emerald-500/30', text: 'text-emerald-100', bgHover: 'hover:bg-emerald-800/30' },
};

const renderIcon = (iconName?: string) => {
  if (!iconName) return null;
  // @ts-ignore - dynamic import of lucide icons
  const IconComponent = LucideIcons[iconName];
  if (!IconComponent) return null;
  return <IconComponent className="w-5 h-5 mb-2 opacity-80" />;
};

const ProcessCard = ({ node }: { node: ProcessNode }) => {
  const colors = levelColors[node.level];
  
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        relative flex flex-col items-center justify-center p-4 m-2 text-center
        rounded-xl backdrop-blur-md border shadow-lg cursor-pointer
        transition-colors duration-300 w-44 min-h-[100px] z-10
        ${colors.bg} ${colors.border} ${colors.text} ${colors.bgHover}
      `}
    >
      {renderIcon(node.iconName)}
      <span className="text-sm font-semibold tracking-wide drop-shadow-md">
        {node.title}
      </span>
      {node.description && (
        <span className="text-xs mt-1 opacity-70 leading-tight">
          {node.description}
        </span>
      )}
    </motion.div>
  );
};

export const ProcessMap: React.FC<ProcessMapProps> = ({ data }) => {
  const levels: Record<ProcessLevel, ProcessNode[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  };

  // Group by level and sort by order
  data.forEach((node) => {
    levels[node.level].push(node);
  });

  Object.values(levels).forEach((list) => {
    list.sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  return (
    <div className="relative w-full overflow-hidden p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px]" />
      
      <div className="relative z-10 flex flex-col items-center space-y-12">
        {/* Level 1 */}
        <div className="flex flex-row justify-center w-full">
          {levels[1].map((node) => (
            <ProcessCard key={node.id} node={node} />
          ))}
        </div>

        {/* Level 2 */}
        <div className="flex flex-row flex-wrap justify-center w-full max-w-4xl relative">
          {levels[2].map((node) => (
            <ProcessCard key={node.id} node={node} />
          ))}
        </div>

        {/* Level 3 */}
        <div className="flex flex-row flex-wrap justify-center w-full max-w-5xl">
          {levels[3].map((node) => (
            <ProcessCard key={node.id} node={node} />
          ))}
        </div>

        {/* Level 4 */}
        <div className="flex flex-row flex-wrap justify-center w-full max-w-6xl">
          {levels[4].map((node) => (
            <ProcessCard key={node.id} node={node} />
          ))}
        </div>
      </div>
    </div>
  );
};
