'use client';

import { DocumentationRouteButton } from '@/components/docs/DocumentationRouteButton';
import { NewsFeed } from '@/components/news/feed/NewsFeed';
import { NewsGrid } from '@/components/news/layout/NewsGrid';
import { NewsHeader } from '@/components/news/layout/NewsHeader';
import { NewsRightSidebar } from '@/components/news/layout/NewsRightSidebar';
import { NewsSidebar } from '@/components/news/layout/NewsSidebar';
import { DonCandidoTour } from '@/components/onboarding/DonCandidoTour';
import { TourHelpButton } from '@/components/onboarding/TourHelpButton';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Mapeo de tipo_evento a categorías para sidebar
const EVENT_TYPE_CATEGORY: Record<string, string> = {
  capacitacion: 'Capacitación',
  evaluacion: 'Evaluación',
  auditoria: 'Auditoría',
  hallazgo: 'Hallazgo',
  accion_correctiva: 'Acción',
  accion_preventiva: 'Acción',
  reunion: 'Reunión',
  mantenimiento: 'Mantenimiento',
  otro: 'General',
};

export default function NoticiasPage() {
  const [user, setUser] = useState<{
    uid: string;
    displayName: string;
    photoURL?: string;
    role: string;
    organizationId?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [realEvents, setRealEvents] = useState<any[]>([]);
  const router = useRouter();

  // Cargar eventos reales de la colección events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user?.organizationId) return;

      try {
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const response = await fetch(
          `/api/events/range?startDate=${now.toISOString()}&endDate=${endDate.toISOString()}&organizationId=${user.organizationId}`
        );

        if (response.ok) {
          const data = await response.json();
          const events = (data.events || []).map((event: any) => ({
            id: event.id,
            title: event.titulo || event.title,
            date: new Date(event.fecha_inicio || event.date),
            location: event.responsable_nombre || undefined,
            category:
              EVENT_TYPE_CATEGORY[event.tipo_evento || event.type] || 'General',
          }));
          setRealEvents(events);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [user?.organizationId]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();

        const unsubscribe = auth.onAuthStateChanged(async firebaseUser => {
          if (!firebaseUser) {
            router.push('/login');
            return;
          }

          const idTokenResult = await firebaseUser.getIdTokenResult();
          const role = (idTokenResult.claims.role as string) || 'user';

          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Usuario',
            photoURL: firebaseUser.photoURL ?? undefined,
            role,
            organizationId:
              (idTokenResult.claims.organization_id as string) || undefined,
          });
          setIsLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Cargando Noticias...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'admin';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Mock data for sidebar
  const mockStats = {
    totalPosts: 156,
    totalComments: 423,
    totalReactions: 892,
    activeUsers: 47,
  };

  const mockCategories = [
    { id: '1', name: 'Calidad', count: 23, color: '#059669' },
    { id: '2', name: 'Procesos', count: 18, color: '#dc2626' },
    { id: '3', name: 'Auditorías', count: 12, color: '#d97706' },
    { id: '4', name: 'Mejora Continua', count: 31, color: '#2563eb' },
  ];

  const mockRecentPosts = [
    {
      id: '1',
      title: 'Nueva política de calidad implementada',
      author: 'María González',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '2',
      title: 'Resultados de la auditoría interna',
      author: 'Carlos Rodríguez',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
  ];

  const mockAlerts = [
    {
      id: '1',
      title: 'Actualización de Procedimiento',
      description: 'Se ha actualizado el procedimiento de control de calidad',
      severity: 'info' as const,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <NewsGrid
        header={
          <div>
            <DonCandidoTour />
            <div className="bg-white dark:bg-slate-800 border-b px-4 pt-2 pb-4">
              <div className="flex items-center justify-between mb-2">
                <h1
                  id="tour-start"
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  Centro de Noticias
                </h1>
                <div className="flex items-center gap-2">
                  <DocumentationRouteButton route="/noticias" label="Manual" />
                  <TourHelpButton />
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Comunicaciones y novedades de tu organización
              </p>
            </div>
            <NewsHeader
              onCreatePost={() => setShowComposer(true)}
              onSearch={query => console.log('Search:', query)}
              onToggleFilters={() => setFiltersOpen(!filtersOpen)}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              notificationCount={3}
              isMobile={isMobile}
            />
          </div>
        }
        leftSidebar={
          <NewsSidebar
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            stats={mockStats}
            categories={mockCategories}
            recentPosts={mockRecentPosts}
          />
        }
        content={
          <NewsFeed
            currentUserId={user.uid}
            currentUserName={user.displayName}
            currentUserPhotoURL={user.photoURL}
            isAdmin={isAdmin}
            initialShowComposer={showComposer}
            onComposerClose={() => setShowComposer(false)}
          />
        }
        rightSidebar={
          <NewsRightSidebar
            events={realEvents}
            alerts={mockAlerts}
            onEventClick={eventId => console.log('Event clicked:', eventId)}
            onAlertClick={alertId => console.log('Alert clicked:', alertId)}
          />
        }
        isLeftSidebarCollapsed={sidebarCollapsed}
      />
    </div>
  );
}
