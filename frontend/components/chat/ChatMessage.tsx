import React, { useState } from 'react';
import { Message } from '@/types/chat';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import NextImage from 'next/image';

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping = false }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <>
      <div
        className={cn(
          'flex mb-4',
          isUser ? 'justify-end' : 'justify-start'
        )}
        role="article"
        aria-label={`${message.role} message`}
      >
        <div className="flex flex-col max-w-[80%]">
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
          {/* Chat bubble with only text */}
          <div
            className={cn(
              'chat-bubble',
              isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'
            )}
          >
            <div className="whitespace-pre-wrap break-words">
              {message.content}
              {isTyping && (
                <span className="inline-block ml-1 animate-typing">...</span>
              )}
            </div>
          </div>
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