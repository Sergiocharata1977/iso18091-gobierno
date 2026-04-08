'use client';

import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, RefreshCw } from 'lucide-react';

interface LoadMoreButtonProps {
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function LoadMoreButton({
  onLoadMore,
  isLoading = false,
  hasMore = true,
  isError = false,
  onRetry,
  variant = 'outline',
  size = 'default',
  className = '',
}: LoadMoreButtonProps) {
  if (!hasMore && !isError) return null;

  const handleClick = () => {
    if (isError && onRetry) {
      onRetry();
    } else if (onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <div className={`flex justify-center py-6 ${className}`}>
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant={variant}
        size={size}
        className="gap-2 min-w-[140px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </>
        ) : isError ? (
          <>
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            Cargar más
          </>
        )}
      </Button>
    </div>
  );
}
