import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ErrorBanner } from '@/components/chat/ErrorBanner';
import { HealthCheckProvider } from '@/components/HealthCheckProvider';
import { performHealthCheck } from '@/lib/healthCheck';

// Mock the health check module
jest.mock('@/lib/healthCheck', () => ({
  performHealthCheck: jest.fn(),
  checkBackendHealth: jest.fn(),
}));

const mockPerformHealthCheck = performHealthCheck as jest.MockedFunction<typeof performHealthCheck>;

describe('ErrorBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when backend is healthy', async () => {
    mockPerformHealthCheck.mockResolvedValue(true);
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <ErrorBanner />
        </HealthCheckProvider>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('An error occurred connecting to the server')).not.toBeInTheDocument();
    });
  });

  it('should not render when backend is still loading', () => {
    mockPerformHealthCheck.mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );
    
    render(
      <HealthCheckProvider>
        <ErrorBanner />
      </HealthCheckProvider>
    );

    expect(screen.queryByText('An error occurred connecting to the server')).not.toBeInTheDocument();
  });

  it('should render error message when backend is unhealthy', async () => {
    mockPerformHealthCheck.mockResolvedValue(false);
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <ErrorBanner />
        </HealthCheckProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('An error occurred connecting to the server')).toBeInTheDocument();
    });
  });

  it('should show retry message when lastPrompt is provided', async () => {
    mockPerformHealthCheck.mockResolvedValue(false);
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <ErrorBanner lastPrompt="Test message" />
        </HealthCheckProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Your message couldn\'t be sent. Click reload to try again.')).toBeInTheDocument();
    });
  });

  it('should call onRetry when reload button is clicked with lastPrompt', async () => {
    mockPerformHealthCheck.mockResolvedValue(false);
    const mockOnRetry = jest.fn();
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <ErrorBanner onRetry={mockOnRetry} lastPrompt="Test message" />
        </HealthCheckProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Reload')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Reload'));
    });

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should call retryHealthCheck when reload button is clicked without lastPrompt', async () => {
    mockPerformHealthCheck.mockResolvedValue(false);
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <ErrorBanner />
        </HealthCheckProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Reload')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Reload'));
    });

    // Should call the health check retry function
    expect(mockPerformHealthCheck).toHaveBeenCalled();
  });

  it('should have proper styling and accessibility', async () => {
    mockPerformHealthCheck.mockResolvedValue(false);
    
    await act(async () => {
      render(
        <HealthCheckProvider>
          <ErrorBanner />
        </HealthCheckProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('An error occurred connecting to the server')).toBeInTheDocument();
    });

    const reloadButton = screen.getByText('Reload');
    expect(reloadButton).toBeInTheDocument();
    expect(reloadButton).toHaveClass('border-red-300');
    expect(reloadButton).toHaveClass('dark:border-red-700');
  });
}); 