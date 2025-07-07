import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingIndicator({ className, size = 'md' }: LoadingIndicatorProps) {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const dotSize = dotSizes[size];

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <div className="flex items-center space-x-1">
        <div 
          className={cn(
            dotSize,
            'bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse'
          )}
          style={{
            animationDelay: '0ms',
            animationDuration: '1.4s'
          }}
        />
        <div 
          className={cn(
            dotSize,
            'bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse'
          )}
          style={{
            animationDelay: '160ms',
            animationDuration: '1.4s'
          }}
        />
        <div 
          className={cn(
            dotSize,
            'bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse'
          )}
          style={{
            animationDelay: '320ms',
            animationDuration: '1.4s'
          }}
        />
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
        Thinking...
      </span>
    </div>
  );
} 