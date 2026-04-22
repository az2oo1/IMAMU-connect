import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  variant?: 'small' | 'medium' | 'large' | 'banner';
  blur?: boolean;
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className, 
  variant = 'medium', 
  blur = true,
  ...props 
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Define sizes based on variant
  // small: chat (40px)
  // medium: profile preview (150px)
  // large: profile page (400px)
  // banner: profile banner (1200px)
  
  let sizeParam = '';
  let finalSrc = src;
  
  if (src && src.includes('picsum.photos')) {
    if (variant === 'small') sizeParam = '50/50';
    else if (variant === 'medium') sizeParam = '200/200';
    else if (variant === 'large') sizeParam = '600/600';
    else if (variant === 'banner') sizeParam = '1200/400';
    
    // Replace size in picsum URL if it's there
    // E.g. picsum.photos/seed/abc/150/150 -> picsum.photos/seed/abc/sizeParam
    const baseUrl = src.split('/').slice(0, -2).join('/');
    finalSrc = `${baseUrl}/${sizeParam}`;
  } else if (src && src.startsWith('/uploads/')) {
    let width = 200;
    if (variant === 'small') width = 50;
    else if (variant === 'medium') width = 200;
    else if (variant === 'large') width = 600;
    else if (variant === 'banner') width = 1200;
    finalSrc = `/api/image?url=${encodeURIComponent(src)}&w=${width}`;
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
      
      <AnimatePresence mode="wait">
        <motion.img
          key={finalSrc}
          src={finalSrc}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className={cn(
            "w-full h-full object-cover",
            !isLoaded && "invisible"
          )}
          referrerPolicy="no-referrer"
          {...props}
        />
      </AnimatePresence>
    </div>
  );
}
