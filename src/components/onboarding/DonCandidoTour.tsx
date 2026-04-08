'use client';

import {
  getTourContext,
  getTourKey,
} from '@/components/onboarding/tourContext';
import {
  DonCandidoAvatar,
  DonCandidoMood,
} from '@/components/ui/DonCandidoAvatar';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const TOUR_COOLDOWN_DAYS = 14;

interface TourStep {
  element: string;
  mood: DonCandidoMood;
  title: string;
  content: React.ReactNode;
  side: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
}

export const DonCandidoTour = () => {
  const driverObj = useRef<ReturnType<typeof driver> | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const tourKey = getTourKey(pathname);
    const lastSeenRaw = localStorage.getItem(tourKey);
    const params =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const forceTour =
      params.get('tour') === '1' || params.get('wizard') === '1';

    if (!forceTour && lastSeenRaw) {
      const lastSeen = Number(lastSeenRaw);
      if (Number.isFinite(lastSeen)) {
        const cooldownMs = TOUR_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        if (Date.now() - lastSeen < cooldownMs) return;
      }
    }

    const context = getTourContext(pathname);
    const tourSteps: TourStep[] =
      context === 'mi-sgc'
        ? [
            {
              element: '#tour-start',
              mood: 'saludo',
              title: 'Tu Centro Unico de Gestion ISO',
              content: (
                <>
                  <p>
                    Este es tu <strong>centro unico de gestion ISO</strong>.
                  </p>
                  <p className="mt-2">
                    Aca encontras madurez, brechas, roadmap y accesos rapidos a
                    todos los modulos.
                  </p>
                </>
              ),
              side: 'bottom',
              align: 'start',
            },
            {
              element: 'a[href="/mi-sgc/cumplimiento"]',
              mood: 'explicando',
              title: 'Cumplimiento en tiempo real',
              content: (
                <p>
                  Revisa el nivel de cumplimiento por capitulos ISO y valida el
                  estado global de tu SGC.
                </p>
              ),
              side: 'bottom',
              align: 'center',
            },
            {
              element: 'a[href="/mi-sgc/gaps"]',
              mood: 'señalando',
              title: 'Brechas prioritarias',
              content: (
                <p>
                  Identifica gaps criticos y enfoca acciones en lo que impacta
                  mas la certificacion.
                </p>
              ),
              side: 'bottom',
              align: 'center',
            },
            {
              element: 'a[href="/mi-sgc/roadmap"]',
              mood: 'explicando',
              title: 'Roadmap ISO 9001',
              content: (
                <p>
                  Sigue las fases de implementacion y prioriza el proximo bloque
                  de trabajo del equipo.
                </p>
              ),
              side: 'bottom',
              align: 'center',
            },
            {
              element: '#tour-quick-access',
              mood: 'saludo',
              title: 'Accesos rapidos operativos',
              content: (
                <p>
                  Desde aqui podes entrar directo a Calidad, Procesos, RRHH y
                  Comercial sin salir de Mi SGC.
                </p>
              ),
              side: 'top',
              align: 'center',
            },
          ]
        : [
            {
              element: '#tour-start',
              mood: 'saludo',
              title: 'Bienvenido',
              content: (
                <p>
                  Esta vista centraliza noticias y novedades del equipo para
                  coordinar el trabajo diario.
                </p>
              ),
              side: 'bottom',
              align: 'center',
            },
            {
              element: 'a[href="/mi-sgc"]',
              mood: 'explicando',
              title: 'Ir a Mi SGC',
              content: (
                <p>
                  Cuando necesites gestion ISO, entra a Mi SGC para ver madurez,
                  gaps y roadmap.
                </p>
              ),
              side: 'bottom',
              align: 'center',
            },
          ];

    const availableSteps = tourSteps.filter(step =>
      Boolean(document.querySelector(step.element))
    );

    if (availableSteps.length === 0) return;

    const driverConfig = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      doneBtnText: 'Comenzar',
      nextBtnText: 'Siguiente ->',
      prevBtnText: '<- Atras',
      progressText: '{{current}} de {{total}}',
      onDestroyed: () => {
        localStorage.setItem(tourKey, String(Date.now()));
      },
      steps: availableSteps.map(step => ({
        element: step.element,
        popover: {
          title: step.title,
          description: '<div id="driver-popover-content-placeholder"></div>',
          side: step.side,
          align: step.align,
        },
      })),
      onHighlightStarted: (_element, step) => {
        requestAnimationFrame(() => {
          const popoverWrapper = document.querySelector('.driver-popover');
          if (!popoverWrapper) return;

          const descriptionContainer = popoverWrapper.querySelector(
            '#driver-popover-content-placeholder'
          );

          if (!descriptionContainer) return;

          const stepData = availableSteps.find(
            s => s.title === step.popover?.title
          );
          if (!stepData) return;

          descriptionContainer.innerHTML = '';
          const root = createRoot(descriptionContainer);
          root.render(
            <div className="flex flex-col gap-2 p-1">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 shrink-0 -ml-2 -mt-2">
                  <DonCandidoAvatar mood={stepData.mood} />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-600 space-y-1">
                    {stepData.content}
                  </div>
                </div>
              </div>
            </div>
          );
        });
      },
    });

    driverObj.current = driverConfig;

    const timer = setTimeout(() => {
      driverObj.current?.drive();
    }, 1200);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
};
