import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Image as ImageIcon, User } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag' | 'ref' | 'src'> {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  variant?: 'small' | 'medium' | 'large' | 'banner';
  blur?: boolean;
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className, 
  imageClassName,
  variant = 'medium',
  blur = true,
  ...props 
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Define sizes based on variant
  // small: chat (40px)
  // medium: profile preview (150px)
  // large: profile page (400px)
  // banner: profile banner (1200px)
  
  let sizeParam = '';
  let finalSrc = src || '';
  
  if (finalSrc && finalSrc.includes('picsum.photos')) {
    if (variant === 'small') sizeParam = '50/50';
    else if (variant === 'medium') sizeParam = '200/200';
    else if (variant === 'large') sizeParam = '600/600';
    else if (variant === 'banner') sizeParam = '1200/400';
    
    // Replace size in picsum URL if it's there
    // E.g. picsum.photos/seed/abc/150/150 -> picsum.photos/seed/abc/sizeParam
    const baseUrl = finalSrc.split('/').slice(0, -2).join('/');
    finalSrc = `${baseUrl}/${sizeParam}`;
  } else if (finalSrc && finalSrc.startsWith('/uploads/')) {
    let width = 200;
    if (variant === 'small') width = 50;
    else if (variant === 'medium') width = 200;
    else if (variant === 'large') width = 600;
    else if (variant === 'banner') width = 1200;
    finalSrc = `/api/image?url=${encodeURIComponent(finalSrc)}&w=${width}`;
  }

  if (!finalSrc || hasError) {
    const isPerson = alt.toLowerCase().includes('user') || 
                     alt.toLowerCase().includes('profile') || 
                     alt.toLowerCase().includes('author') ||
                     alt.toLowerCase().includes('member') ||
                     (variant === 'small' && !alt.toLowerCase().includes('logo') && !alt.toLowerCase().includes('club'));
                     
    return (
      <div className={cn("relative overflow-hidden bg-neutral-800 flex items-center justify-center", className)}>
        {isPerson ? (
          <User className={cn("text-neutral-600", variant === 'small' ? "w-2/3 h-2/3" : "w-1/2 h-1/2 max-w-12")} />
        ) : (
          <ImageIcon className={cn("text-neutral-700", variant === 'banner' || variant === 'large' ? "w-1/4 h-1/4 max-w-16 min-w-8" : "w-1/2 h-1/2 max-w-12")} />
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-neutral-800", className)}>
      {blur && !isLoaded && (
        <div 
          className="absolute inset-0 grayscale blur-xl opacity-50 scale-110"
          style={{
            backgroundImage: `url(${finalSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}
      
      <AnimatePresence mode="popLayout">
        <motion.img
          key={finalSrc}
          src={finalSrc}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={cn(
            "w-full h-full object-cover",
            imageClassName,
            !isLoaded && "invisible"
          )}
          referrerPolicy="no-referrer"
          {...props}
        />
      </AnimatePresence>
    </div>
  );
}
