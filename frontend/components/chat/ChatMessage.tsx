import React, { useState } from 'react';
import { Message } from '@/types/chat';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping = false }: ChatMessageProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isUser = message.role === 'user';

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

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
                // Mobile: grid with 2 per row for user, flex for assistant
                isUser
                  ? 'grid grid-cols-2 gap-2 mb-2 md:flex md:flex-wrap md:justify-end'
                  : 'flex flex-wrap justify-start gap-2 mb-2'
              )}
            >
              {message.images.map((imageUrl, index) => (
                <div key={index} className="relative">
                  <img
                    src={imageUrl}
                    alt={`Image ${index + 1}`}
                    className="object-cover rounded-lg"
                    style={{
                      width: '180px',
                      height: '180px',
                      maxWidth: '100%',
                      maxHeight: '40vw',
                    }}
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

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeLightbox}
          role="dialog"
          aria-label="Image lightbox"
          aria-modal="true"
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              aria-label="Close lightbox"
            >
              <X size={24} />
            </button>
            <img
              src={selectedImage}
              alt="Full size image"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
} 