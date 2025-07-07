import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Send, Image as LucideImage, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobilePreferences } from './MobilePreferences';
import NextImage from 'next/image';

interface ChatInputProps {
  onSendMessage: (content: string, images: File[]) => Promise<boolean>;
  disabled?: boolean;
  placeholder?: string;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  selectedImages?: File[];
  previewUrls?: string[];
  onImageUpload?: (files: FileList | null) => void;
  onRemoveImage?: (index: number) => void;
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "You can ask me to create things based on your current workload, or check if there is deprecated code among your projects …",
  selectedModel,
  onModelChange,
  selectedImages = [],
  previewUrls = [],
  onImageUpload,
  onRemoveImage
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(message.trim() || selectedImages.length > 0)) return;

    const success = await onSendMessage(message.trim(), selectedImages);
    if (success) {
      setMessage('');
      if (onImageUpload) onImageUpload(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Support both Enter (legacy) and Cmd/Ctrl+Enter for sending
    if (e.key === 'Enter') {
      if (!e.shiftKey && !(e.metaKey || e.ctrlKey)) {
        // Regular Enter still works
        e.preventDefault();
        handleSubmit(e);
      } else if (e.metaKey || e.ctrlKey) {
        // Cmd/Ctrl+Enter also works
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Selected Images Preview */}
        {previewUrls.length > 0 && (
          <div className="flex flex-row gap-2 mb-2 w-full">
            {previewUrls.map((url, index) => (
              <div key={url} className="relative">
                <NextImage
                  src={url}
                  alt={selectedImages[index]?.name || `Selected image ${index + 1}`}
                  width={64}
                  height={64}
                  className="object-cover rounded-lg"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage && onRemoveImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div
          className={cn(
            'flex items-end gap-2 p-3 border rounded-lg transition-colors',
            disabled && 'opacity-50'
          )}
        >
          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full resize-none border-none outline-none bg-transparent text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 min-h-[48px]"
              rows={1}
              disabled={disabled}
              aria-label="Message input"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onImageUpload && onImageUpload(e.target.files)}
              className="hidden"
              disabled={disabled}
            />
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              aria-label="Upload image"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <LucideImage size={20} className="sm:mr-2" />
              <span className="hidden sm:inline">Image</span>
            </Button>
            
            {/* Mobile Preferences Button */}
            {selectedModel && onModelChange && (
              <div className="md:hidden">
                <MobilePreferences
                  selectedModel={selectedModel}
                  onModelChange={onModelChange}
                />
              </div>
            )}
            
            <Button
              type="submit"
              size="sm"
              disabled={disabled || (!message.trim() && selectedImages.length === 0)}
              aria-label="Send message"
            >
              <Send size={20} className="sm:mr-2" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
        </div>

        {/* Keyboard shortcut hint */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Press Enter or {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to send
        </p>
      </form>
    </div>
  );
} 