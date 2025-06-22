import React from 'react';
import { AVAILABLE_MODELS } from '@/types/chat';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  className?: string;
}

export function ModelSelector({ 
  selectedModel, 
  onModelChange, 
  className 
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleModelSelect = (model: string) => {
    onModelChange(model);
    setIsOpen(false);
  };

  const selectedModelLabel = AVAILABLE_MODELS.find(m => m === selectedModel) || selectedModel;

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
        aria-label="Select model"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{selectedModelLabel}</span>
        <ChevronDown 
          size={16} 
          className={cn(
            'transition-transform',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20">
            <ul role="listbox" className="py-1">
              {AVAILABLE_MODELS.map((model) => (
                <li key={model} role="option">
                  <button
                    onClick={() => handleModelSelect(model)}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none transition-colors text-gray-900 dark:text-gray-100',
                      selectedModel === model && 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                    )}
                  >
                    {model}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
} 