import React from 'react';
import { Message } from '@/types/chat';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import NextImage from 'next/image';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CopyEntireResponseButton } from './CopyEntireResponseButton';
import { ResponseActions } from './ResponseActions';

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
  onRetry?: (prompt: string) => void;
  currentModel?: string;
  onModelChange?: (model: string) => void;
  originPrompt?: string;
}

export function ChatMessage({ message, isTyping = false, onRetry, currentModel, onModelChange, originPrompt }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <>
      <div
        className={cn(
          'flex mb-4',
          isUser ? 'sm:justify-end justify-start' : 'justify-start'
        )}
        role="article"
        aria-label={`${message.role} message`}
      >
        <div className="flex flex-col w-full">
          {/* Images above the chat bubble, not inside */}
          {message.images && message.images.length > 0 && (
            <div
              className={cn(
                isUser
                  ? 'grid grid-cols-2 gap-2 mb-2 md:flex md:flex-wrap md:justify-end'
                  : 'flex flex-wrap justify-start gap-2 mb-2'
              )}
            >
              {message.images.map((imageUrl, index) => (
                <div key={index} className="relative">
                  <NextImage
                    src={imageUrl}
                    alt={`Message image ${index + 1}`}
                    width={180}
                    height={180}
                    className="object-cover rounded-lg"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Message content - different rendering for user vs assistant */}
          {isUser ? (
            // User message with bubble styling
            <div className="chat-bubble chat-bubble-user">
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
            </div>
          ) : (
            // Assistant message with markdown rendering and no bubble
            <div className="w-full">
              <MarkdownRenderer 
                content={message.content + (isTyping ? '...' : '')} 
                className="text-gray-900 dark:text-gray-100"
              />
              {/* Action bar */}
              <div className="flex items-center gap-3 mt-3">
                <CopyEntireResponseButton markdown={message.content} />
                {/* Dropdown actions */}
                {onRetry && currentModel && onModelChange && (
                  <ResponseActions 
                    onRetry={onRetry} 
                    currentModel={currentModel} 
                    onModelChange={onModelChange}
                    prompt={originPrompt || ''}
                  />
                )}
              </div>
            </div>
          )}
          
          <span className={cn(
            'text-xs text-gray-500 mt-1 block',
            isUser ? 'text-right' : 'text-left'
          )}>
            {message.timestamp ? formatTimestamp(message.timestamp) : formatTimestamp(new Date())}
          </span>
        </div>
      </div>
      {/* Lightbox removed for now */}
    </>
  );
} 