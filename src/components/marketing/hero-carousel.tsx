'use client';

import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

const slides = [
  {
    src: '/images/Screenshot_1.png',
    label: 'Procesos',
    detail: 'Flujos, responsables y seguimiento visible.',
  },
  {
    src: '/images/Screenshot_2.png',
    label: 'Documentos',
    detail: 'Control documental y evidencia en un solo sistema.',
  },
  {
    src: '/images/Screenshot_3.png',
    label: 'Auditorias',
    detail: 'Preparacion, ejecucion y trazabilidad auditables.',
  },
  {
    src: '/images/Screenshot_4.png',
    label: 'Hallazgos y RRHH',
    detail: 'Acciones, seguimiento operativo y contexto por rol.',
  },
];

export function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="group relative w-full aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={slides[currentIndex].src}
          alt={`Modulo ${slides[currentIndex].label} de Don Candido IA`}
          className="h-full w-full object-cover object-top"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      </AnimatePresence>

      <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
        <Badge className="rounded-full border border-white/40 bg-slate-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-lg">
          Producto real
        </Badge>
        <div className="max-w-[260px] rounded-2xl border border-white/20 bg-white/88 px-4 py-3 text-right shadow-xl backdrop-blur-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Modulo visible
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {slides[currentIndex].label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {slides[currentIndex].detail}
          </p>
        </div>
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-800 shadow-lg backdrop-blur-sm opacity-0 transition-all duration-300 transform hover:scale-110 hover:bg-white group-hover:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-800 shadow-lg backdrop-blur-sm opacity-0 transition-all duration-300 transform hover:scale-110 hover:bg-white group-hover:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-8 bg-slate-800'
                : 'w-2.5 bg-slate-400/50 hover:bg-slate-600'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent shadow-[inset_0_0_40px_rgba(0,0,0,0.05)]" />
    </div>
  );
}
