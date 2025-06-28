'use client';

import React from 'react';
import { useHealthCheck } from '@/components/HealthCheckProvider';
import { Button } from '@/components/ui/Button';
import { RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  onRetry?: () => void;
  lastPrompt?: string;
}

export function ErrorBanner({ onRetry, lastPrompt }: ErrorBannerProps) {
  const { isHealthy, isLoading, retryHealthCheck } = useHealthCheck();

  // Don't show banner if backend is healthy or still loading
  if (isHealthy || isLoading) {
    return null;
  }

  const handleRetry = async () => {
    if (onRetry && lastPrompt) {
      // Retry the last prompt
      onRetry();
    } else {
      // Just check health status
      await retryHealthCheck();
    }
  };

  return (
    <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
          <div>
            <p className="text-red-800 dark:text-red-200 font-medium">
              An error occurred connecting to the server
            </p>
            {lastPrompt && (
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                Your message couldn&apos;t be sent. Click reload to try again.
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={handleRetry}
          variant="secondary"
          size="sm"
          className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
        >
          <RefreshCw size={16} className="mr-2" />
          Reload
        </Button>
      </div>
    </div>
  );
} 