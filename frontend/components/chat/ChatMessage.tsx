import React, { useState } from 'react';
import { Message } from '@/types/chat';
import { formatTimestamp } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping = false }: ChatMessageProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

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
            
            {message.images && message.images.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.images.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <img
                      src={imageUrl}
                      alt={`Image ${index + 1}`}
                      className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(imageUrl)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View image ${index + 1} in lightbox`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleImageClick(imageUrl);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <span className="text-xs text-gray-500 mt-1">
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