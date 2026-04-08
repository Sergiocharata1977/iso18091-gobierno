'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'sent' | 'read' | 'archived';
  relatedId?: string;
  relatedType?: string;
  createdAt?: Date;
  readAt?: Date;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>(
    'newest'
  );

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Obtener userId del usuario actual (en producción vendría de autenticación)
      const userId = 'current-user-id';
      const response = await fetch(`/api/sdk/notifications?userId=${userId}`);
      const result = await response.json();

      if (result.success && result.data) {
        setNotifications(result.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/sdk/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' }),
      });

      if (response.ok) {
        setNotifications(
          notifications.map(n =>
            n.id === notificationId ? { ...n, status: 'read' } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleArchive = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/sdk/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });

      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/sdk/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.status === 'pending';
    if (filter === 'critical') return n.priority === 'critical';
    return true;
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    if (sortBy === 'newest') {
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    } else if (sortBy === 'oldest') {
      return (
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
      );
    } else {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
  });

  const unreadCount = notifications.filter(n => n.status === 'pending').length;
  const criticalCount = notifications.filter(
    n => n.priority === 'critical'
  ).length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-l-4 border-red-500';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-l-4 border-orange-500';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500';
      default:
        return 'bg-blue-100 text-blue-800 border-l-4 border-blue-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      case 'medium':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audit_upcoming':
        return '📅';
      case 'action_due':
        return '⏰';
      case 'action_overdue':
        return '🚨';
      case 'conformity_alert':
        return '⚠️';
      case 'finding_registered':
        return '📝';
      default:
        return '🔔';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando notificaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-600 mt-1">
            Gestión de notificaciones y alertas del sistema
          </p>
        </div>

        <Button
          onClick={() => router.push('/auditorias')}
          variant="outline"
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">
            {notifications.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">No leídas</p>
          <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Críticas</p>
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Leídas</p>
          <p className="text-2xl font-bold text-green-600">
            {notifications.filter(n => n.status === 'read').length}
          </p>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'unread', 'critical'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all'
                    ? 'Todas'
                    : f === 'unread'
                      ? `No leídas (${unreadCount})`
                      : `Críticas (${criticalCount})`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguas</option>
              <option value="priority">Prioridad</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {sortedNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No hay notificaciones que mostrar</p>
          </div>
        ) : (
          sortedNotifications.map(notification => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow p-6 ${getPriorityColor(notification.priority)} transition-all hover:shadow-lg`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">
                  {getTypeIcon(notification.type)}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {notification.title}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getPriorityBadge(notification.priority)}`}
                    >
                      {notification.priority.toUpperCase()}
                    </span>
                    {notification.status === 'pending' && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white whitespace-nowrap">
                        NO LEÍDA
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 mb-3">{notification.message}</p>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div>
                      <span>Tipo: {notification.type}</span>
                      {notification.relatedType && (
                        <span className="ml-4">
                          Relacionado: {notification.relatedType}
                        </span>
                      )}
                    </div>
                    <div>
                      {notification.createdAt && (
                        <span>
                          {new Date(notification.createdAt).toLocaleString(
                            'es-ES'
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {notification.status === 'pending' && (
                    <Button
                      onClick={() => handleMarkAsRead(notification.id)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Marcar como leída
                    </Button>
                  )}
                  <Button
                    onClick={() => handleArchive(notification.id)}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-gray-700"
                  >
                    Archivar
                  </Button>
                  <Button
                    onClick={() => handleDelete(notification.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
