'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  X,
  ZoomIn,
} from 'lucide-react';
import Image from 'next/image';
import React, { useState } from 'react';

interface ImageData {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
}

interface ImageGalleryProps {
  images: ImageData[];
  maxDisplay?: number;
  className?: string;
}

export function ImageGallery({
  images,
  maxDisplay = 4,
  className = '',
}: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (!images || images.length === 0) return null;

  const displayedImages = images.slice(0, maxDisplay);
  const hasMoreImages = images.length > maxDisplay;

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    setZoomed(false);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setZoomed(false);
  };

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    setZoomed(false);
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
    setZoomed(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!lightboxOpen) return;

    switch (e.key) {
      case 'ArrowLeft':
        prevImage();
        break;
      case 'ArrowRight':
        nextImage();
        break;
      case 'Escape':
        closeLightbox();
        break;
      case ' ':
      case 'Enter':
        setZoomed(!zoomed);
        break;
    }
  };

  // Add keyboard event listeners when lightbox is open
  React.useEffect(() => {
    if (lightboxOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [lightboxOpen, zoomed]);

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const shareImage = async (imageUrl: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          url: imageUrl,
        });
      } else {
        await navigator.clipboard.writeText(imageUrl);
      }
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

  return (
    <>
      <div
        className={`grid gap-1 ${getGridClasses(images.length, maxDisplay)} ${className}`}
      >
        {displayedImages.map((image, index) => (
          <div
            key={image.id}
            className={`relative overflow-hidden cursor-pointer group ${getImageClasses(images.length, index)}`}
            onClick={() => openLightbox(index)}
          >
            <Image
              src={image.url}
              alt={image.alt || `Imagen ${index + 1}`}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />

            {/* Overlay for additional images indicator */}
            {hasMoreImages && index === maxDisplay - 1 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  +{images.length - maxDisplay}
                </span>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-7xl w-full h-full max-h-screen p-0 bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Main Image */}
            <div
              className={`relative max-w-full max-h-full ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              onClick={() => setZoomed(!zoomed)}
            >
              <Image
                src={images[currentImageIndex]?.url || ''}
                alt={
                  images[currentImageIndex]?.alt ||
                  `Imagen ${currentImageIndex + 1}`
                }
                width={1200}
                height={800}
                className={`max-w-full max-h-full object-contain transition-transform duration-300 ${
                  zoomed ? 'scale-150' : 'scale-100'
                }`}
                style={{ imageRendering: zoomed ? 'auto' : 'auto' }}
              />
            </div>

            {/* Image Info and Actions */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {currentImageIndex + 1} de {images.length}
                  </p>
                  {images[currentImageIndex]?.caption && (
                    <p className="text-sm opacity-90 mt-1">
                      {images[currentImageIndex].caption}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomed(!zoomed)}
                    className="text-white hover:bg-white/20"
                  >
                    <ZoomIn className="h-4 w-4 mr-2" />
                    {zoomed ? 'Reducir' : 'Ampliar'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      downloadImage(
                        images[currentImageIndex].url,
                        `imagen-${currentImageIndex + 1}.jpg`
                      )
                    }
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => shareImage(images[currentImageIndex].url)}
                    className="text-white hover:bg-white/20"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartir
                  </Button>
                </div>
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto p-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => {
                      setCurrentImageIndex(index);
                      setZoomed(false);
                    }}
                    className={`relative w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 ${
                      index === currentImageIndex
                        ? 'border-white'
                        : 'border-white/50 hover:border-white/75'
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={`Miniatura ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function to determine grid classes
function getGridClasses(imageCount: number, maxDisplay: number): string {
  const count = Math.min(imageCount, maxDisplay);

  switch (count) {
    case 1:
      return 'grid-cols-1';
    case 2:
      return 'grid-cols-2';
    case 3:
      return 'grid-cols-3';
    default:
      return 'grid-cols-2';
  }
}

// Helper function to determine individual image classes for Facebook-style layout
function getImageClasses(imageCount: number, index: number): string {
  // Base aspect ratio classes
  if (imageCount === 1) {
    return 'aspect-video'; // 16:9 for single image
  }

  if (imageCount === 2) {
    return 'aspect-square'; // Square for 2 images side by side
  }

  if (imageCount === 3) {
    if (index === 0) {
      return 'aspect-square row-span-2'; // First image is taller
    }
    return 'aspect-square'; // Others are square
  }

  if (imageCount >= 4) {
    return 'aspect-square'; // All square for 4+ images
  }

  return 'aspect-square';
}
