'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Copy, Mail, MessageCircle, Share2 } from 'lucide-react';
import { useState } from 'react';

interface ShareButtonProps {
  postId: string;
  postTitle?: string;
  postUrl?: string;
  onShare?: (platform: string, postId: string) => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export function ShareButton({
  postId,
  postTitle = 'Publicación',
  postUrl,
  onShare,
  variant = 'default',
  className = '',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = postUrl || `${window.location.origin}/noticias/${postId}`;

  const handleShare = async (platform: string) => {
    try {
      switch (platform) {
        case 'copy':
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          break;

        case 'whatsapp':
          window.open(
            `https://wa.me/?text=${encodeURIComponent(`${postTitle} - ${shareUrl}`)}`,
            '_blank'
          );
          break;

        case 'telegram':
          window.open(
            `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(postTitle)}`,
            '_blank'
          );
          break;

        case 'email':
          window.open(
            `mailto:?subject=${encodeURIComponent(postTitle)}&body=${encodeURIComponent(shareUrl)}`,
            '_blank'
          );
          break;

        default:
          // Native Web Share API
          if (navigator.share) {
            await navigator.share({
              title: postTitle,
              url: shareUrl,
            });
          }
      }

      onShare?.(platform, postId);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const shareOptions = [
    {
      id: 'copy',
      label: copied ? 'Copiado!' : 'Copiar enlace',
      icon: copied ? Check : Copy,
      action: () => handleShare('copy'),
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      action: () => handleShare('whatsapp'),
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: MessageCircle,
      action: () => handleShare('telegram'),
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      action: () => handleShare('email'),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === 'compact' ? 'sm' : 'default'}
          className={`gap-2 text-slate-600 hover:text-emerald-600 ${className}`}
        >
          <Share2 className={variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5'} />
          {variant === 'default' && 'Compartir'}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {shareOptions.map(({ id, label, icon: Icon, action }) => (
          <DropdownMenuItem
            key={id}
            onClick={action}
            className="cursor-pointer"
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}

        {/* Native Share API */}
        {typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function' && (
            <DropdownMenuItem
              onClick={() => handleShare('native')}
              className="cursor-pointer"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartir...
            </DropdownMenuItem>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
