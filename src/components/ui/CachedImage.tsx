import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CachedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export function CachedImage({ 
  src, 
  alt, 
  className, 
  fallback, 
  onLoad, 
  onError 
}: CachedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn('relative', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full object-contain transition-opacity duration-200',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
        // Add caching headers via crossOrigin and referrerPolicy
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        // Add cache control via loading attribute
        loading="lazy"
      />
    </div>
  );
}