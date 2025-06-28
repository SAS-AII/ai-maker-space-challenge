import { healthCheck } from './api';

export interface HealthStatus {
  isHealthy: boolean;
  apiUrl: string;
  error?: string;
  responseTime?: number;
}

/**
 * Comprehensive health check for the backend API
 * Tests connectivity and returns detailed status information
 */
export async function checkBackendHealth(): Promise<HealthStatus> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const startTime = Date.now();
  
  try {
    const isHealthy = await healthCheck();
    const responseTime = Date.now() - startTime;
    
    return {
      isHealthy,
      apiUrl,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      isHealthy: false,
      apiUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    };
  }
}

/**
 * Logs health status to console with formatted output
 */
export function logHealthStatus(status: HealthStatus): void {
  // Make environment label case-insensitive and robust
  const env = (process.env.NODE_ENV || '').toLowerCase();
  let environment: string;
  if (env === 'production') {
    environment = 'Production';
  } else if (env === 'test') {
    environment = 'Test';
  } else {
    environment = 'Development';
  }
  const statusIcon = status.isHealthy ? '✅' : '❌';
  
  console.group(`${statusIcon} Backend Health Check (${environment})`);
  console.log(`API URL: ${status.apiUrl}`);
  console.log(`Status: ${status.isHealthy ? 'Healthy' : 'Unhealthy'}`);
  
  if (status.responseTime !== undefined) {
    console.log(`Response Time: ${status.responseTime}ms`);
  }
  
  if (status.error) {
    console.error(`Error: ${status.error}`);
  }
  
  console.groupEnd();
}

/**
 * Performs health check and logs results
 * Returns true if healthy, false otherwise
 */
export async function performHealthCheck(): Promise<boolean> {
  const status = await checkBackendHealth();
  logHealthStatus(status);
  return status.isHealthy;
} 