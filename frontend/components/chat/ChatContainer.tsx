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
import { WelcomeBanner } from '@/features/WelcomeBanner';
import { ChatTitle } from './ChatTitle';
import { useAppStore } from '@/lib/store/appStore';
import { getSettings, saveSettings } from '@/lib/settings';
import { getStoredSessions, saveStoredSessions } from '@/lib/sessions';

export function ChatContainer() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [, setSettingsModalMessage] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const dragCounter = useRef(0);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [pendingImagesForRetry, setPendingImagesForRetry] = useState<File[]>([]);
  const [, setTitleGeneratedByAI] = useState<Record<string, boolean>>({});
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // App store for RAG settings
  const { /* userName: _userName,*/ ragEnabled } = useAppStore();

  // --- Smooth but throttled scroll helpers ---------------------------------
  // Instead of performing a smooth scroll **on every token**, we debounce the
  // scroll action. This dramatically reduces the number of scroll animations
  // triggered while the assistant streams its answer, eliminating the
  // "tremble" effect caused by repeated smooth-scroll resets.

  const scrollToBottomImmediate = () => {
    const el = scrollRef.current;
    if (!el) return;
    // Use an *instant* scroll. Using `behavior: 'smooth'` repeatedly causes the
    // browser to restart the animation each time, which is the root cause of
    // the jitter.
    el.scrollTop = el.scrollHeight;
  };

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
    const storedSessions = getStoredSessions();
    setSessions(storedSessions);
    
    if (storedSessions.length > 0) {
      setCurrentSessionId(storedSessions[0].id);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      saveStoredSessions(sessions);
    }
  }, [sessions]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Track user scroll position to control auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;

      // Determine whether the user is currently at (or extremely close to) the bottom
      const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= 10;

      // Detect upward user scroll: if the current scrollTop is smaller than the
      // previous one AND we're *not* at the absolute bottom, we assume the user
      // wants to read earlier messages, so we disable auto-scroll.
      const isScrollingUp = scrollTop < lastScrollTop.current;

      if (isScrollingUp && !isAtBottom) {
        setShouldAutoScroll(false);
      } else if (isAtBottom) {
        // Whenever the user reaches the bottom again we re-enable auto-scroll.
        setShouldAutoScroll(true);
      }

      // Update tracker for direction detection
      lastScrollTop.current = scrollTop;
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // ---------------------------------------------------------------------------
  // Mutation-observer + rAF based auto-scroll
  // ---------------------------------------------------------------------------
  // The goal is to *continuously* follow the streamed content while the user is
  // at (or near) the bottom, without starting/stopping native smooth-scroll
  // animations. We do this by:
  //  1. Watching DOM mutations inside the scroll container (new tokens).
  //  2. If the user hasn't scrolled away (`shouldAutoScroll === true`), flag
  //     that we need to scroll.
  //  3. A single rAF loop performs the scroll once per frame when flagged.

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Flag we toggle when new mutations arrive.
    let needsScroll = false;

    // Observe DOM changes (tokens appended).
    const observer = new MutationObserver(() => {
      // Only auto-scroll while we are *actively streaming* (`isTyping`) and the
      // user hasn't opted out (`shouldAutoScroll`). This prevents the jitter
      // that happened after generation finished.
      if (shouldAutoScroll && isTyping) {
        needsScroll = true;
      }
    });
    observer.observe(el, { childList: true, subtree: true });

    // rAF loop to perform the actual scroll.
    let rafId: number;
    const loop = () => {
      if (needsScroll) {
        needsScroll = false;
        scrollToBottomImmediate();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [shouldAutoScroll, isTyping]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Drag and drop overlay logic
  useEffect(() => {
    const chatBody = chatBodyRef.current;
    if (!chatBody) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current += 1;
      setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) setIsDragging(false);
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounter.current = 0;
      const files = e.dataTransfer?.files;
      if (!files) return;
      const newFiles = Array.from(files);
      setSelectedImages(prev => [...prev, ...newFiles]);
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    };

    chatBody.addEventListener('dragenter', handleDragEnter);
    chatBody.addEventListener('dragleave', handleDragLeave);
    chatBody.addEventListener('dragover', handleDragOver);
    chatBody.addEventListener('drop', handleDrop);

    // Prevent browser from opening files anywhere (sidebar, etc)
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);

    return () => {
      chatBody.removeEventListener('dragenter', handleDragEnter);
      chatBody.removeEventListener('dragleave', handleDragLeave);
      chatBody.removeEventListener('dragover', handleDragOver);
      chatBody.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  
  // Check if current session is empty (new chat)
  const isNewEmptyChat = currentSession && (!currentSession.messages || currentSession.messages.length === 0);

  const createNewChat = () => {
    if (!settings.apiKey) {
      setSettingsModalMessage('Please set your ChatGPT API key to start a new chat.');
      setIsSettingsOpen(true);
      return;
    }
    // Prevent creating a new chat if the current chat is empty
    if (currentSession && (!currentSession.messages || currentSession.messages.length === 0)) {
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
    
    // Clear AI-generated title flag for this new session
    setTitleGeneratedByAI(prev => ({ ...prev, [newSession.id]: false }));

    // Auto-collapse sidebar on mobile after creating new chat
    if (window.innerWidth < 768) {
      setIsSidebarCollapsed(true);
    }
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    if (currentSessionId === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setCurrentSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
    }
  };

  const handleSendMessage = async (content: string, images: File[]): Promise<boolean> => {
    if (!currentSessionId) return false;
    if (!content.trim() && images.length === 0) return false;
    if (!settings.apiKey) {
      // Store pending message and images for retry after API key is set
      setPendingMessage(content);
      setPendingImagesForRetry(images);
      setSettingsModalMessage('Please set your ChatGPT API key to send a message.');
      setIsSettingsOpen(true);
      return false;
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

    // Determine if this is the very first user message of the conversation
    const isFirstMsg = !currentSession || currentSession.messages.length === 0;

    // Update session with user message (and placeholder title if it's the first)
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          messages: [...session.messages, userMessage],
          title: session.messages.length === 0 ? generateChatTitle([userMessage]) : session.title,
        };
      }
      return session;
    }));

    // Clear selected images
    setSelectedImages([]);
    setPreviewUrls([]);

    // Add initial assistant message immediately to show loading animation
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

    setIsTyping(true);

    // Create abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);

    try {
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

      const formData = new FormData();
      formData.append('messages', JSON.stringify(allMessagesForApi));
      images.forEach(imageFile => {
        formData.append('images', imageFile);
      });
      if (typeof settings.apiKey === 'string' && settings.apiKey) {
        formData.set('apiKey', settings.apiKey);
      }
      // Include selected model so backend can use it
      formData.set('model', (currentSession?.model || settings.model) as string);
      // Include RAG setting from global store
      formData.set('useRAG', ragEnabled.toString());

      const stream = await sendChatMessage(formData, controller.signal);

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

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
      
      // Check if this was an abort error (user stopped generation)
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't add error message for user-initiated stops
        return true;
      }
      
      // Add error message for actual errors
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
      // Clean up abort controller and stop typing indicator
      setAbortController(null);
      setIsTyping(false);

      // Kick-off background title generation *after* the main reply finished.
      if (isFirstMsg && currentSessionId) {
        generateAIChatTitle(content, currentSessionId);
      }
    }

    // Indicate to the caller that the send operation was triggered.
    return true;
  };

  const handleRetryLastPrompt = () => {
    if (lastPrompt) {
      handleSendMessage(lastPrompt, []);
    }
  };

  const handleRetryPrompt = (prompt: string) => {
    if (prompt) {
      handleSendMessage(prompt, []);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsTyping(false);
      
      // Add a message indicating the generation was stopped
      if (currentSessionId) {
        setSessions(prev => prev.map(session => {
          if (session.id === currentSessionId) {
            const updatedMessages = [...session.messages];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage.role === 'assistant' && !lastMessage.content.trim()) {
              // Remove empty assistant message if no content was generated
              updatedMessages.pop();
            } else if (lastMessage.role === 'assistant') {
              // Mark the message as interrupted
              lastMessage.content += '\n\n*[Generation stopped by user]*';
            }
            return {
              ...session,
              messages: updatedMessages,
            };
          }
          return session;
        }));
      }
    }
  };

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    
    // Immediately save to localStorage for persistence
    saveSettings(newSettings);
    
    // If the modal was opened due to missing API key, close the message if key is now set
    if (newSettings.apiKey) {
      setSettingsModalMessage('');
      // Retry pending message if exists
      if (pendingMessage || pendingImagesForRetry.length > 0) {
        handleSendMessage(pendingMessage, pendingImagesForRetry);
        setPendingMessage('');
        setPendingImagesForRetry([]);
      }
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

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setSelectedImages(prev => [...prev, ...newFiles]);
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    const urlToRemove = previewUrls[index];
    URL.revokeObjectURL(urlToRemove);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Generates a short descriptive chat title by making a *separate* background
   * request to the same chat endpoint. It uses only the user's first prompt so
   * it never interferes with the main conversation flow.
   */
  const generateAIChatTitle = async (prompt: string, sessionId: string) => {
    try {
      const messagesForTitle = [
        {
          role: 'system',
          content:
            'Provide a concise 3-5 word title summarizing the following question. Respond with only the title text.',
        },
        { role: 'user', content: prompt },
      ];

      const fd = new FormData();
      fd.append('messages', JSON.stringify(messagesForTitle));
      fd.set('model', settings.model as string);
      if (typeof settings.apiKey === 'string' && settings.apiKey) {
        fd.set('apiKey', settings.apiKey);
      }

      const stream = await sendChatMessage(fd);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let raw = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value);
      }

      // Strip common SSE prefixes and DONE markers then trim/clip.
      const cleaned = raw
        .split('\n')
        .map((l) => l.replace(/^data:\s*/, '').trim())
        .filter((l) => l && l !== '[DONE]')
        .join(' ');

      const title = cleaned.replace(/^["']|["']$/g, '').slice(0, 40).trim();
      if (!title) return; // Nothing received.

      // Mark this title as AI-generated
      setTitleGeneratedByAI(prev => ({ ...prev, [sessionId]: true }));

      // Animate typing – ~35 ms per character for a quick but noticeable effect.
      let i = 0;
      const interval = setInterval(() => {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: title.slice(0, i + 1) } : s)),
        );
        i += 1;
        if (i >= title.length) clearInterval(interval);
      }, 35);
    } catch (err) {
      console.error('Failed to generate title:', err);
    }
  };

  // Handle RAG disabled message
  const handleRagDisabledMessage = () => {
    if (!ragEnabled && currentSession && currentSession.messages.length > 0) {
      const lastMessage = currentSession.messages[currentSession.messages.length - 1];
      if (lastMessage.role === 'user') {
        // Add system response for RAG disabled
        const ragDisabledMessage: Message = {
          role: 'assistant',
          content: 'RAG disabled; I have no context to answer.',
          timestamp: new Date().toISOString(),
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSession.id
              ? {
                  ...s,
                  messages: [...s.messages, ragDisabledMessage],
                  updatedAt: new Date().toISOString(),
                }
              : s
          )
        );
      }
    }
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
      <div ref={chatBodyRef} className="flex-1 flex flex-col relative">
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 select-none pointer-events-auto">
            <div className="text-center">
              <div className="text-lg font-semibold text-white mb-2">Add Files</div>
              <div className="text-base text-white">Drop any file here to add to the conversation</div>
            </div>
          </div>
        )}
        {/* Header – fixed on mobile, sticky/static on larger screens */}
        <div className="bg-white dark:bg-gray-900 px-4 sm:px-6 py-4 flex items-center justify-between fixed md:sticky top-0 inset-x-0 z-30 border-b border-gray-200 dark:border-gray-700 md:relative md:z-20">
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
            {/* RAG Toggle */}
            <div className="hidden md:flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                RAG Enabled
              </label>
              <input
                type="checkbox"
                checked={ragEnabled}
                onChange={(e) => {
                  useAppStore.getState().setRagEnabled(e.target.checked);
                  if (!e.target.checked) {
                    handleRagDisabledMessage();
                  }
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
          {/* Center - Title */}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate px-2 max-w-[60vw] sm:max-w-[420px] lg:max-w-[600px]">
            The Code Room
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

        {/* Chat Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-52 sm:pb-40 md:pb-0 overscroll-contain pt-28 md:pt-0">
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            {/* Error Banner */}
            <ErrorBanner onRetry={handleRetryLastPrompt} lastPrompt={lastPrompt} />
            {currentSession ? (
              <div className="space-y-4">
                {/* Chat Title - only show when there are messages and title is not default */}
                <ChatTitle title={currentSession.title} />
                
                {/* Welcome Banner for new chats */}
                {isNewEmptyChat && (
                  <WelcomeBanner isNewChat={true} />
                )}
                
                {currentSession.messages.map((message, index) => {
                  const prevMsg = index > 0 ? currentSession.messages[index - 1] : undefined;
                  const originPrompt = message.role === 'assistant' && prevMsg?.role === 'user' ? prevMsg.content : '';
                  return (
                    <ChatMessage
                      key={index}
                      message={message}
                      isTyping={isTyping && index === currentSession.messages.length - 1 && message.role === 'assistant'}
                      onRetry={handleRetryPrompt}
                      currentModel={currentSession.model || settings.model}
                      onModelChange={handleSessionModelChange}
                      originPrompt={originPrompt}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Welcome to The Code Room</h3>
                  <p className="text-sm">Start a new conversation to begin chatting with your documentation assistant.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Conditionally positioned based on chat state */}
        {currentSession && (
          <>
            {/* Chat input – render once to avoid unmounting/mounting that clears user text */}
            <div className="sticky bottom-0 w-full">
              <div className="max-w-4xl mx-auto">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={isTyping}
                  selectedModel={currentSession.model || settings.model}
                  onModelChange={handleSessionModelChange}
                  selectedImages={selectedImages}
                  previewUrls={previewUrls}
                  onImageUpload={handleImageUpload}
                  onRemoveImage={removeImage}
                  isGenerating={isTyping}
                  onStopGeneration={handleStopGeneration}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => { setIsSettingsOpen(false); setSettingsModalMessage(''); }}
        settings={settings}
        onSave={handleSaveSettings}
        message={!settings.apiKey ? 'Please set your OpenAI API key to start chatting.' : ''}
      />
    </div>
  );
} 