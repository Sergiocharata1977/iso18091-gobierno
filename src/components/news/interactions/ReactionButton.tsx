'use client';

import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2, ThumbsUp, Star } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ReactionButtonProps {
  targetType: 'post' | 'comment';
  targetId: string;
  currentUserId: string;
  initialCount?: number;
  initialUserReacted?: boolean;
  onReaction?: (
    targetId: string,
    reactionType: string,
    hasReacted: boolean
  ) => Promise<void>;
  variant?: 'default' | 'compact';
  showCount?: boolean;
  className?: string;
}

export function ReactionButton({
  targetType,
  targetId,
  currentUserId,
  initialCount = 0,
  initialUserReacted = false,
  onReaction,
  variant = 'default',
  showCount = true,
  className = '',
}: ReactionButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [userReacted, setUserReacted] = useState(initialUserReacted);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    setCount(initialCount);
    setUserReacted(initialUserReacted);
  }, [initialCount, initialUserReacted]);

  const handleReaction = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const newReactedState = !userReacted;

    try {
      // Optimistic update
      setUserReacted(newReactedState);
      setCount(prev => (newReactedState ? prev + 1 : Math.max(0, prev - 1)));

      // Trigger animation
      if (newReactedState) {
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 600);
      }

      await onReaction?.(targetId, 'like', newReactedState);
    } catch (error) {
      // Revert optimistic update on error
      setUserReacted(userReacted);
      setCount(count);
      console.error('Error updating reaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5';
  const buttonSize = variant === 'compact' ? 'sm' : 'default';

  return (
    <Button
      variant="ghost"
      size={buttonSize}
      onClick={handleReaction}
      disabled={isLoading}
      className={`gap-2 transition-all duration-200 hover:scale-105 ${
        userReacted
          ? 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900'
          : 'text-slate-600 hover:text-red-600'
      } ${showAnimation ? 'animate-pulse' : ''} ${className}`}
    >
      <div className={`relative ${showAnimation ? 'animate-bounce' : ''}`}>
        <Heart
          className={`${iconSize} ${userReacted ? 'fill-current' : ''} transition-all duration-200`}
        />
        {showAnimation && (
          <div className="absolute inset-0 animate-ping">
            <Heart className={`${iconSize} text-red-400`} />
          </div>
        )}
      </div>

      {showCount && (
        <span
          className={`font-medium ${variant === 'compact' ? 'text-sm' : ''}`}
        >
          {count > 0 ? count : ''}
        </span>
      )}
    </Button>
  );
}

// Additional reaction types component for future expansion
export function ReactionSelector({
  targetId,
  onSelectReaction,
  className = '',
}: {
  targetId: string;
  onSelectReaction?: (targetId: string, reactionType: string) => void;
  className?: string;
}) {
  const reactions = [
    { type: 'like', icon: ThumbsUp, color: 'text-blue-600' },
    { type: 'love', icon: Heart, color: 'text-red-600' },
    { type: 'star', icon: Star, color: 'text-yellow-600' },
  ];

  return (
    <div className={`flex gap-1 ${className}`}>
      {reactions.map(({ type, icon: Icon, color }) => (
        <Button
          key={type}
          variant="ghost"
          size="sm"
          onClick={() => onSelectReaction?.(targetId, type)}
          className={`p-2 hover:scale-110 transition-transform ${color}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}
