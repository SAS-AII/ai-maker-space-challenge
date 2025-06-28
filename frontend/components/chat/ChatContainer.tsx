'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, Message, Settings } from '@/types/chat';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SettingsModal } from './SettingsModal';
import { ModelSelector } from './ModelSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ErrorBanner } from './ErrorBanner';
import { sendChatMessage } from '@/lib/api';
import { generateId, generateChatTitle } from '@/lib/utils';
import { Settings as SettingsIcon, Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const DEFAULT_SETTINGS: Settings = {
  developerPrompt: 'You are a helpful AI assistant.',
  systemPrompt: 'You are a helpful AI assistant that provides accurate and helpful responses.',
  model: 'gpt-4.1-nano',
  apiKey: '',
};

export function ChatContainer() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [settingsModalMessage, setSettingsModalMessage] = useState<string>('');
  const [lastPrompt, setLastPrompt] = useState<string>('');

  // Handle responsive sidebar collapse
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 640) {
        setIsSidebarCollapsed(true);
      }
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('chat-sessions');
    const savedSettings = localStorage.getItem('chat-settings');
    
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions);
      setSessions(parsedSessions);
      
      if (parsedSessions.length > 0) {
        setCurrentSessionId(parsedSessions[0].id);
      }
    }
    
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chat-sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chat-settings', JSON.stringify(settings));
  }, [settings]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const createNewChat = () => {
    if (!settings.apiKey) {
      setSettingsModalMessage('Please set your ChatGPT API key to start a new chat.');
      setIsSettingsOpen(true);
      return;
    }
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      model: settings.model, // Default to global model
      messages: [],
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    if (currentSessionId === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setCurrentSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
    }
  };

  const handleSendMessage = async (content: string, images: File[]) => {
    if (!currentSessionId) return;
    if (!content.trim() && images.length === 0) return;
    if (!settings.apiKey) {
      setSettingsModalMessage('Please set your ChatGPT API key to send a message.');
      setIsSettingsOpen(true);
      return;
    }

    // Store the prompt for potential retry
    setLastPrompt(content);

    const imagePreviews = images.map(file => URL.createObjectURL(file));

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      images: imagePreviews,
    };

    // Update session with user message
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        const updatedMessages = [...session.messages, userMessage];
        return {
          ...session,
          title: session.messages.length === 0 ? generateChatTitle([userMessage]) : session.title,
          messages: updatedMessages,
        };
      }
      return session;
    }));

    // Prepare messages for API call
    const allMessages: Message[] = [
      { role: 'system', content: settings.systemPrompt || '' },
      { role: 'user', content: settings.developerPrompt || '' },
      ...currentSession?.messages || [],
      userMessage,
    ];

    const allMessagesForApi = allMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append('messages', JSON.stringify(allMessagesForApi));
      images.forEach(imageFile => {
        formData.append('images', imageFile);
      });
      // Remove duplicate apiKey append if present
      if (formData.has('apiKey')) {
        formData.delete('apiKey');
      }
      if (typeof settings.apiKey === 'string' && settings.apiKey) {
        formData.set('apiKey', settings.apiKey);
      }

      const stream = await sendChatMessage(formData);

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // Add initial assistant message
      const assistantMessageObj: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: [...session.messages, assistantMessageObj],
          };
        }
        return session;
      }));

      // Read stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        // Update the assistant message in real-time
        setSessions(prev => prev.map(session => {
          if (session.id === currentSessionId) {
            const updatedMessages = [...session.messages];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage.role === 'assistant') {
              lastMessage.content = assistantMessage;
            }
            return {
              ...session,
              messages: updatedMessages,
            };
          }
          return session;
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };

      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: [...session.messages, errorMessage],
          };
        }
        return session;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetryLastPrompt = () => {
    if (lastPrompt) {
      handleSendMessage(lastPrompt, []);
    }
  };

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    // If the modal was opened due to missing API key, close the message if key is now set
    if (newSettings.apiKey) {
      setSettingsModalMessage('');
    }
  };

  const handleSessionModelChange = (model: string) => {
    if (!currentSessionId) return;
    setSessions(prev => 
      prev.map(session => 
        session.id === currentSessionId ? { ...session, model } : session
      )
    );
  };

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSelectSession={setCurrentSessionId}
        onNewChat={createNewChat}
        onDeleteSession={deleteSession}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between relative">
          {/* Left side - Hamburger and Model Selector */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label="Toggle sidebar"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 sm:hidden"
            >
              <Menu size={20} />
            </Button>
            {/* Model Selector - Hidden on mobile */}
            <div className="hidden md:block">
              <ModelSelector
                selectedModel={currentSession?.model || settings.model}
                onModelChange={handleSessionModelChange}
              />
            </div>
          </div>
          
          {/* Center - Title */}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate px-2 max-w-[200px] sm:max-w-[300px]">
            {currentSession?.title || 'AI Chat'}
          </h1>
          
          {/* Right side - Settings and Theme Toggle */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <SettingsIcon size={20} />
            </Button>
          </div>
        </div>

        {/* Messages Area - Centered with max width like ChatGPT */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800">
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            {/* Error Banner */}
            <ErrorBanner onRetry={handleRetryLastPrompt} lastPrompt={lastPrompt} />
            
            {currentSession ? (
              <div className="space-y-4">
                {currentSession.messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    message={message}
                    isTyping={isTyping && index === currentSession.messages.length - 1 && message.role === 'assistant'}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Welcome to AI Chat</h3>
                  <p className="text-sm">Start a new conversation to begin chatting with the AI.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Centered with max width */}
        {currentSession && (
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto px-4 md:px-6">
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isTyping}
                selectedModel={currentSession.model || settings.model}
                onModelChange={handleSessionModelChange}
              />
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => { setIsSettingsOpen(false); setSettingsModalMessage(''); }}
        settings={settings}
        onSave={handleSaveSettings}
        message={settingsModalMessage}
      />
    </div>
  );
} 