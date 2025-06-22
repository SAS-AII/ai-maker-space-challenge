import React from 'react';
import { ChatSession } from '@/types/chat';
import { formatDate } from '../../lib/utils';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

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
  return (
    <div
      className={cn(
        'bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-80'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Chats</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={onNewChat}
          className={cn(
            'w-full',
            isCollapsed && 'w-12 h-12 p-0'
          )}
          aria-label="Start new chat"
        >
          {isCollapsed ? (
            <Plus size={20} />
          ) : (
            <>
              <Plus size={16} className="mr-2" />
              New Chat
            </>
          )}
        </Button>
      </div>

      {/* Chat Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {!isCollapsed && "No chats yet. Start a new conversation!"}
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
                onClick={() => onSelectSession(session.id)}
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
                {!isCollapsed ? (
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
                        {formatDate(session.createdAt)}
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
                ) : (
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                      {session.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 