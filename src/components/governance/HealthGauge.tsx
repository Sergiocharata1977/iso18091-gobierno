'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface HealthGaugeProps {
  score: number;
  trend?: number;
}

export function HealthGauge({ score, trend = 0 }: HealthGaugeProps) {
  const getColor = (value: number) => {
    if (value >= 80) return '#10b981';
    if (value >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const color = getColor(score);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      <div className="relative w-64 h-32 overflow-hidden">
        <svg
          className="w-full h-full"
          viewBox="0 0 200 100"
          style={{ overflow: 'visible' }}
        >
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
            strokeLinecap="round"
          />

          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference / 2}
            initial={{ strokeDashoffset: circumference / 2 }}
            animate={{
              strokeDashoffset:
                circumference / 2 - (score / 100) * (circumference / 2),
            }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
          />
        </svg>

        <div className="absolute bottom-0 left-0 right-0 text-center translate-y-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold tracking-tighter text-slate-900"
          >
            {score}%
          </motion.div>
          <div className="text-sm font-medium text-slate-500 mt-1">
            Salud del sistema
          </div>
        </div>
      </div>

      <div
        className={`mt-5 text-sm flex items-center gap-1.5 font-medium ${
          trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {trend >= 0 ? (
          <ArrowUpRight className="h-4 w-4" />
        ) : (
          <ArrowDownRight className="h-4 w-4" />
        )}
        <span>{Math.abs(trend)}% vs mes anterior</span>
      </div>
    </div>
  );
}
