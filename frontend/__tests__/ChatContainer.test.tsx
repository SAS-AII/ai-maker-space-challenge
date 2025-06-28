import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { HealthCheckProvider } from '@/components/HealthCheckProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import '@testing-library/jest-dom';

// Mock the API functions
jest.mock('@/lib/api', () => ({
  sendChatMessage: jest.fn(),
  healthCheck: jest.fn(),
  sendMessage: jest.fn(),
  validateApiKey: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.innerWidth for responsive testing
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024, // Desktop width
});

// Mock ReadableStream
global.ReadableStream = class ReadableStream {
  constructor(init: any) {
    this.init = init;
  }
  init: any;
  getReader() {
    return {
      read: () => Promise.resolve({ done: true, value: undefined }),
    };
  }
} as any;

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Helper function to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <HealthCheckProvider>
        {component}
      </HealthCheckProvider>
    </ThemeProvider>
  );
};

describe('ChatContainer - New Empty Chat Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  const mockSession = {
    id: 'test-session-1',
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    model: 'gpt-4.1-nano',
    messages: [], // Empty messages array
  };

  const mockSessionWithMessages = {
    id: 'test-session-2',
    title: 'Chat with Messages',
    createdAt: new Date().toISOString(),
    model: 'gpt-4.1-nano',
    messages: [
      {
        role: 'user',
        content: 'Hello',
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date().toISOString(),
      },
    ],
  };

  test('should display centered layout for new empty chat on desktop', () => {
    // Set desktop width
    window.innerWidth = 1280; // xl breakpoint
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'chat-sessions') {
        return JSON.stringify([mockSession]);
      }
      if (key === 'chat-settings') {
        return JSON.stringify({
          apiKey: 'test-key',
          model: 'gpt-4.1-nano',
          developerPrompt: 'You are helpful',
          systemPrompt: 'You are an AI assistant',
        });
      }
      return null;
    });

    renderWithProviders(<ChatContainer />);

    // Check if the question is displayed (should only be one on desktop)
    const questions = screen.getAllByText('How can I help you today?');
    expect(questions).toHaveLength(1);
    expect(screen.getByText("Ask me anything, and I'll do my best to assist you.")).toBeInTheDocument();

    // Check if the input is present
    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
  });

  test('should display bottom layout for new empty chat on mobile', () => {
    // Set mobile width
    window.innerWidth = 768;
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'chat-sessions') {
        return JSON.stringify([mockSession]);
      }
      if (key === 'chat-settings') {
        return JSON.stringify({
          apiKey: 'test-key',
          model: 'gpt-4.1-nano',
          developerPrompt: 'You are helpful',
          systemPrompt: 'You are an AI assistant',
        });
      }
      return null;
    });

    renderWithProviders(<ChatContainer />);

    // Check if the question is displayed (should only be one on mobile)
    const questions = screen.getAllByText('How can I help you today?');
    expect(questions).toHaveLength(1);
    expect(screen.getByText("Ask me anything, and I'll do my best to assist you.")).toBeInTheDocument();

    // Check if the input is present
    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
  });

  test('should display bottom layout for chat with existing messages', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'chat-sessions') {
        return JSON.stringify([mockSessionWithMessages]);
      }
      if (key === 'chat-settings') {
        return JSON.stringify({
          apiKey: 'test-key',
          model: 'gpt-4.1-nano',
          developerPrompt: 'You are helpful',
          systemPrompt: 'You are an AI assistant',
        });
      }
      return null;
    });

    renderWithProviders(<ChatContainer />);

    // Check that the question is NOT displayed
    expect(screen.queryByText('How can I help you today?')).not.toBeInTheDocument();
    expect(screen.queryByText("Ask me anything, and I'll do my best to assist you.")).not.toBeInTheDocument();

    // Check if the input is present
    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();

    // Check if existing messages are displayed
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  test('should transition from centered to bottom layout after sending first message', async () => {
    const { sendChatMessage } = require('@/lib/api');
    sendChatMessage.mockResolvedValue(new ReadableStream({
      start(controller: any) {
        controller.enqueue(new TextEncoder().encode('Test response'));
        controller.close();
      },
    }));

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'chat-sessions') {
        return JSON.stringify([mockSession]);
      }
      if (key === 'chat-settings') {
        return JSON.stringify({
          apiKey: 'test-key',
          model: 'gpt-4.1-nano',
          developerPrompt: 'You are helpful',
          systemPrompt: 'You are an AI assistant',
        });
      }
      return null;
    });

    renderWithProviders(<ChatContainer />);

    // Initially, question should be visible
    const questions = screen.getAllByText('How can I help you today?');
    expect(questions).toHaveLength(1);

    // Find and fill the input (use first one if multiple)
    const inputs = screen.getAllByPlaceholderText('Ask me anything...');
    const input = inputs[0];
    fireEvent.change(input, { target: { value: 'Test message' } });

    // Find and click the send button
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    // Wait for the message to be processed
    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalled();
    });

    // After sending, the question should disappear and messages should appear
    await waitFor(() => {
      expect(screen.queryByText('How can I help you today?')).not.toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  test('should maintain input functionality after transition', async () => {
    const { sendChatMessage } = require('@/lib/api');
    sendChatMessage.mockResolvedValue(new ReadableStream({
      start(controller: any) {
        controller.enqueue(new TextEncoder().encode('Test response'));
        controller.close();
      },
    }));

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'chat-sessions') {
        return JSON.stringify([mockSession]);
      }
      if (key === 'chat-settings') {
        return JSON.stringify({
          apiKey: 'test-key',
          model: 'gpt-4.1-nano',
          developerPrompt: 'You are helpful',
          systemPrompt: 'You are an AI assistant',
        });
      }
      return null;
    });

    renderWithProviders(<ChatContainer />);

    // Send first message
    const inputs = screen.getAllByPlaceholderText('Ask me anything...');
    const input = inputs[0];
    fireEvent.change(input, { target: { value: 'First message' } });
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalled();
    });

    // Wait for transition
    await waitFor(() => {
      expect(screen.queryByText('How can I help you today?')).not.toBeInTheDocument();
    });

    // Send second message to verify input still works
    const inputAfterTransition = screen.getByPlaceholderText('Ask me anything...');
    fireEvent.change(inputAfterTransition, { target: { value: 'Second message' } });
    const sendButtonAfterTransition = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButtonAfterTransition);

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledTimes(2);
    });
  });

  test('should handle responsive breakpoints correctly', () => {
    // Test desktop layout
    window.innerWidth = 1280; // xl breakpoint
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'chat-sessions') {
        return JSON.stringify([mockSession]);
      }
      if (key === 'chat-settings') {
        return JSON.stringify({
          apiKey: 'test-key',
          model: 'gpt-4.1-nano',
          developerPrompt: 'You are helpful',
          systemPrompt: 'You are an AI assistant',
        });
      }
      return null;
    });

    const { rerender } = renderWithProviders(<ChatContainer />);

    // On desktop, question should be visible
    const questions = screen.getAllByText('How can I help you today?');
    expect(questions).toHaveLength(1);

    // Test mobile layout
    window.innerWidth = 768;
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
    
    // Re-render to capture the new width
    rerender(
      <ThemeProvider>
        <HealthCheckProvider>
          <ChatContainer />
        </HealthCheckProvider>
      </ThemeProvider>
    );

    // On mobile, question should still be visible but layout should be different
    const questionsAfterResize = screen.getAllByText('How can I help you today?');
    expect(questionsAfterResize).toHaveLength(1);
  });
}); 