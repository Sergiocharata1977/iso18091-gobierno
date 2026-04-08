'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ReactionButtonProps {
  targetType: 'post' | 'comment';
  targetId: string;
  currentUserId: string;
  initialCount: number;
  initialUserReacted: boolean;
}

export function ReactionButton({
  targetType,
  targetId,
  currentUserId,
  initialCount,
  initialUserReacted,
}: ReactionButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [userReacted, setUserReacted] = useState(initialUserReacted);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar si el usuario ya reaccionó al cargar
  useEffect(() => {
    const checkUserReaction = async () => {
      try {
        const response = await fetch(
          `/api/news/${targetType === 'post' ? 'posts' : 'comments'}/${targetId}/reactions/check`,
          {
            headers: {
              Authorization: `Bearer ${await getAuthToken()}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUserReacted(data.reacted);
        }
      } catch (error) {
        console.error('Error checking user reaction:', error);
      }
    };

    checkUserReaction();
  }, [targetType, targetId]);

  const getAuthToken = async () => {
    // Obtener token de Firebase Auth
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    return user.getIdToken();
  };

  const handleReaction = async () => {
    if (isLoading) return;

    // Actualización optimista
    const previousCount = count;
    const previousReacted = userReacted;

    setUserReacted(!userReacted);
    setCount(userReacted ? count - 1 : count + 1);
    setIsLoading(true);

    try {
      const token = await getAuthToken();
      const endpoint =
        targetType === 'post'
          ? `/api/news/posts/${targetId}/reactions`
          : `/api/news/comments/${targetId}/reactions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'like' }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle reaction');
      }

      const data = await response.json();

      // Actualizar con datos reales del servidor
      setUserReacted(data.data.reacted);
      setCount(data.data.count);
    } catch (error) {
      console.error('Error toggling reaction:', error);
      // Revertir cambios optimistas
      setUserReacted(previousReacted);
      setCount(previousCount);
      alert('Error al procesar la reacción');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleReaction}
      disabled={isLoading}
      className={cn(
        'gap-2 transition-colors',
        userReacted && 'text-red-500 hover:text-red-600'
      )}
    >
      <Heart
        className={cn('h-4 w-4 transition-all', userReacted && 'fill-current')}
      />
      <span className="text-sm">{count}</span>
    </Button>
  );
}
