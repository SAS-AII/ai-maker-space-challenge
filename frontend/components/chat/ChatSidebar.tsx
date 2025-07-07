import React, { useState } from 'react';
import { ChatSession } from '@/types/chat';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { PenLine, Trash2, ArrowLeftFromLine, ArrowRightFromLine, BookOpen, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KnowledgeManager } from './KnowledgeManager';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  isCollapsed,
  onToggleCollapse,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: ChatSidebarProps) {
  const [showKnowledgeManager, setShowKnowledgeManager] = useState(false);

  const handleUploadComplete = (filename: string, result: any) => {
    console.log('Knowledge uploaded:', filename, result);
    // Could add a toast notification here
  };
  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'bg-gray-100 dark:bg-gray-950 shadow-lg transition-all duration-300 flex flex-col hidden md:flex',
          isCollapsed ? 'w-16' : 'w-80'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center',
          isCollapsed ? 'h-16 justify-center' : 'p-4 justify-between'
        )}>
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chats</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
              isCollapsed && 'mx-auto'
            )}
          >
            {isCollapsed ? <ArrowRightFromLine size={20} /> : <ArrowLeftFromLine size={20} />}
          </Button>
        </div>

        {/* New Chat Button (always at the top, same position) */}
        <div className={cn(
          isCollapsed ? 'flex items-center justify-center h-16' : 'p-4'
        )}>
          <Button
            onClick={onNewChat}
            className={cn(
              isCollapsed ? 'w-12 h-12 p-0 flex items-center justify-center mx-auto' : 'w-full'
            )}
            aria-label="Start new chat"
          >
            {isCollapsed ? (
              <PenLine size={20} />
            ) : (
              <>
                <PenLine size={16} className="mr-2" />
                New Chat
              </>
            )}
          </Button>
        </div>

        {/* Knowledge Management Section */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Knowledge Base (Code + Docs)
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKnowledgeManager(!showKnowledgeManager)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <BookOpen size={16} />
              </Button>
            </div>
            
            {showKnowledgeManager && (
              <KnowledgeManager
                onUploadComplete={handleUploadComplete}
                className="mb-4"
              />
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKnowledgeManager(!showKnowledgeManager)}
              className="w-full"
            >
              <Upload size={16} className="mr-2" />
              {showKnowledgeManager ? 'Hide Manager' : 'Manage Files'}
            </Button>
          </div>
        )}

        {/* Chat Sessions List (hide when minimized) */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No chats yet. Start a new conversation!
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'sidebar-item group',
                      currentSessionId === session.id && 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700',
                      isCollapsed && 'justify-center p-2'
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectSession(session.id);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select chat: ${session.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectSession(session.id);
                      }
                    }}
                  >
                    <>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium truncate",
                          currentSessionId === session.id 
                            ? "text-primary-700 dark:text-primary-200" 
                            : "text-gray-900 dark:text-gray-100"
                        )}>
                          {session.title}
                        </div>
                        <div className={cn(
                          "text-xs",
                          currentSessionId === session.id 
                            ? "text-primary-600 dark:text-primary-300"
                            : "text-gray-500 dark:text-gray-400"
                        )}>
                          {formatDate(new Date(session.createdAt))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        aria-label={`Delete chat: ${session.title}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Overlay Drawer */}
      {!isCollapsed && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onToggleCollapse} />
          <div className="fixed left-0 top-0 h-full w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Mobile Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chats</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                aria-label="Close sidebar"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeftFromLine size={20} />
              </Button>
            </div>

            {/* Mobile New Chat Button */}
            <div className="p-4">
              <Button
                onClick={onNewChat}
                className="w-full"
                aria-label="Start new chat"
              >
                <PenLine size={16} className="mr-2" />
                New Chat
              </Button>
            </div>

            {/* Mobile Chat Sessions List */}
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No chats yet. Start a new conversation!
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        'sidebar-item group',
                        currentSessionId === session.id && 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700'
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectSession(session.id);
                        onToggleCollapse();
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectSession(session.id);
                        onToggleCollapse();
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select chat: ${session.title}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectSession(session.id);
                          onToggleCollapse();
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium truncate",
                          currentSessionId === session.id 
                            ? "text-primary-700 dark:text-primary-200" 
                            : "text-gray-900 dark:text-gray-100"
                        )}>
                          {session.title}
                        </div>
                        <div className={cn(
                          "text-xs",
                          currentSessionId === session.id 
                            ? "text-primary-600 dark:text-primary-300"
                            : "text-gray-500 dark:text-gray-400"
                        )}>
                          {formatDate(new Date(session.createdAt))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        aria-label={`Delete chat: ${session.title}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 