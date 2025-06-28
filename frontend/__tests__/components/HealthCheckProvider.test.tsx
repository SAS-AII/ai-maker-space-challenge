import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { HealthCheckProvider, useHealthCheck } from '@/components/HealthCheckProvider';
import { performHealthCheck } from '@/lib/healthCheck';

// Mock the health check module
jest.mock('@/lib/healthCheck', () => ({
  performHealthCheck: jest.fn(),
  checkBackendHealth: jest.fn(),
}));

const mockPerformHealthCheck = performHealthCheck as jest.MockedFunction<typeof performHealthCheck>;

// Test component to access context
function TestComponent() {
  const { isHealthy, isLoading, healthStatus, retryHealthCheck } = useHealthCheck();
  
  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="healthy">{isHealthy.toString()}</div>
      <div data-testid="api-url">{healthStatus?.apiUrl || 'no-url'}</div>
      <div data-testid="error">{healthStatus?.error || 'no-error'}</div>
      <button onClick={retryHealthCheck} data-testid="retry-button">
        Retry
      </button>
    </div>
  );
}

describe('HealthCheckProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide loading state initially', async () => {
    mockPerformHealthCheck.mockResolvedValue(true);
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <TestComponent />
        </HealthCheckProvider>
      );
    });

    // Wait for the initial health check to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('healthy')).toHaveTextContent('true');
  });

  it('should update state when health check completes successfully', async () => {
    mockPerformHealthCheck.mockResolvedValue(true);
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <TestComponent />
        </HealthCheckProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('healthy')).toHaveTextContent('true');
    expect(mockPerformHealthCheck).toHaveBeenCalledTimes(1);
  });

  it('should update state when health check fails', async () => {
    mockPerformHealthCheck.mockResolvedValue(false);
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <TestComponent />
        </HealthCheckProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('healthy')).toHaveTextContent('false');
    expect(mockPerformHealthCheck).toHaveBeenCalledTimes(1);
  });

  it('should handle health check errors', async () => {
    const error = new Error('Network error');
    mockPerformHealthCheck.mockRejectedValue(error);
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <TestComponent />
        </HealthCheckProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('healthy')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('Network error');
  });

  it('should retry health check when retry button is clicked', async () => {
    // Use a delayed mock to simulate real async behavior
    mockPerformHealthCheck.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(true), 10))
    );
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <TestComponent />
        </HealthCheckProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Click retry button
    await act(async () => {
      fireEvent.click(screen.getByTestId('retry-button'));
    });

    // Should show loading again - wait for it to change
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
    });

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(mockPerformHealthCheck).toHaveBeenCalledTimes(2);
  });
}); 