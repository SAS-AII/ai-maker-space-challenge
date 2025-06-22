'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, Message, Settings } from '@/types/chat';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SettingsModal } from './SettingsModal';
import { sendChatMessage } from '@/lib/api';
import { generateId, generateChatTitle } from '@/lib/utils';
import { Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const DEFAULT_SETTINGS: Settings = {
  developerPrompt: 'You are a helpful AI assistant.',
  systemPrompt: 'You are a helpful AI assistant that provides accurate and helpful responses.',
  model: 'gpt-4.1-nano',
};

export function ChatContainer() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chat-sessions', JSON.stringify(sessions));
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
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      createdAt: new Date().toISOString(),
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

  const handleSendMessage = async (content: string, images?: string[]) => {
    if (!currentSessionId || !content.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      images,
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
      { role: 'system', content: settings.systemPrompt },
      { role: 'user', content: settings.developerPrompt },
      ...currentSession?.messages || [],
      userMessage,
    ];

    setIsTyping(true);

    try {
      const stream = await sendChatMessage({
        model: settings.model,
        messages: allMessages,
      });

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

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
  };

  return (
    <div className="h-screen flex bg-white">
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
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            {currentSession?.title || 'AI Chat'}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
          >
            <SettingsIcon size={20} />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
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
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Welcome to AI Chat</h3>
                <p className="text-sm">Start a new conversation to begin chatting with the AI.</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        {currentSession && (
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isTyping}
          />
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
} 