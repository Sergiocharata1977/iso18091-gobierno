'use client';

import { Button } from '@/components/ui/button';
import { Bell, Loader2, X } from 'lucide-react';
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

interface NotificationCenterProps {
  userId: string;
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationCenter({
  userId,
  onNotificationClick,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  useEffect(() => {
    fetchNotifications();
    // Polling cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/sdk/notifications?userId=${userId}`);
      const result = await response.json();

      if (result.success && result.data) {
        setNotifications(result.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.status === 'pending';
    if (filter === 'critical') return n.priority === 'critical';
    return true;
  });

  const unreadCount = notifications.filter(n => n.status === 'pending').length;
  const criticalCount = notifications.filter(
    n => n.priority === 'critical'
  ).length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
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

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gray-50 border-b p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Notificaciones
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 border-b px-4 py-2 flex gap-2">
            {(['all', 'unread', 'critical'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${
                      notification.status === 'pending'
                        ? 'border-l-blue-500 bg-blue-50'
                        : 'border-l-gray-300'
                    }`}
                    onClick={() => {
                      onNotificationClick?.(notification);
                      handleMarkAsRead(notification.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {getTypeIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getPriorityColor(notification.priority)}`}
                          >
                            {notification.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.createdAt
                            ? new Date(notification.createdAt).toLocaleString(
                                'es-ES'
                              )
                            : 'Hace poco'}
                        </p>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleArchive(notification.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="bg-gray-50 border-t p-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNotifications()}
                className="flex-1"
              >
                Actualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNotifications([])}
                className="flex-1"
              >
                Limpiar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
