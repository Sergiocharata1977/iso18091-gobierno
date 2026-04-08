'use client';

import { useState } from 'react';
import { Share2, Loader2, X } from 'lucide-react';
import type {
  Document,
  DocumentShare,
} from '@/lib/sdk/modules/documents/types';

interface DocumentSharingProps {
  document: Document;
  onShare?: (shares: DocumentShare[]) => void;
}

export function DocumentSharing({ document, onShare }: DocumentSharingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [newUserId, setNewUserId] = useState('');
  const [permissions, setPermissions] = useState<'view' | 'comment' | 'edit'>(
    'view'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddUser = () => {
    if (newUserId.trim() && !userIds.includes(newUserId)) {
      setUserIds([...userIds, newUserId]);
      setNewUserId('');
    }
  };

  const handleRemoveUser = (userId: string) => {
    setUserIds(userIds.filter(id => id !== userId));
  };

  const handleShare = async () => {
    if (userIds.length === 0) {
      setError('Selecciona al menos un usuario');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/sdk/documents/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          userIds,
          permissions,
        }),
      });

      if (!response.ok) throw new Error('Share failed');

      setSuccess(true);
      setUserIds([]);
      setPermissions('view');
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 2000);

      onShare?.(
        userIds.map(userId => ({
          userId,
          permissions,
          sharedAt: new Date() as any,
          sharedBy: 'current-user',
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Share2 className="h-4 w-4" />
        Compartir
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Compartir documento</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm mb-4">
                Documento compartido exitosamente
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuarios
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newUserId}
                    onChange={e => setNewUserId(e.target.value)}
                    placeholder="ID del usuario"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddUser}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Agregar
                  </button>
                </div>

                {userIds.length > 0 && (
                  <div className="space-y-2">
                    {userIds.map(userId => (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-2 bg-gray-100 rounded"
                      >
                        <span className="text-sm">{userId}</span>
                        <button
                          onClick={() => handleRemoveUser(userId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permisos
                </label>
                <select
                  value={permissions}
                  onChange={e => setPermissions(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="view">Ver</option>
                  <option value="comment">Comentar</option>
                  <option value="edit">Editar</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleShare}
                  disabled={loading || userIds.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Compartir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
