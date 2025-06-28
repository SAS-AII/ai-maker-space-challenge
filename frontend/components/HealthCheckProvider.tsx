'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { HealthStatus, performHealthCheck } from '@/lib/healthCheck';

interface HealthCheckContextType {
  isHealthy: boolean;
  isLoading: boolean;
  healthStatus: HealthStatus | null;
  retryHealthCheck: () => Promise<void>;
}

const HealthCheckContext = createContext<HealthCheckContextType | undefined>(undefined);

interface HealthCheckProviderProps {
  children: React.ReactNode;
}

export function HealthCheckProvider({ children }: HealthCheckProviderProps) {
  const [isHealthy, setIsHealthy] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);

  const performCheck = async () => {
    setIsLoading(true);
    try {
      const healthy = await performHealthCheck();
      setIsHealthy(healthy);
      
      // Get detailed status for context
      const { checkBackendHealth } = await import('@/lib/healthCheck');
      const status = await checkBackendHealth();
      setHealthStatus(status);
    } catch (error) {
      console.error('Health check failed:', error);
      setIsHealthy(false);
      setHealthStatus({
        isHealthy: false,
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const retryHealthCheck = async () => {
    await performCheck();
  };

  useEffect(() => {
    // Perform health check on mount
    performCheck();
  }, []);

  const value: HealthCheckContextType = {
    isHealthy,
    isLoading,
    healthStatus,
    retryHealthCheck,
  };

  return (
    <HealthCheckContext.Provider value={value}>
      {children}
    </HealthCheckContext.Provider>
  );
}

export function useHealthCheck() {
  const context = useContext(HealthCheckContext);
  if (context === undefined) {
    throw new Error('useHealthCheck must be used within a HealthCheckProvider');
  }
  return context;
} 