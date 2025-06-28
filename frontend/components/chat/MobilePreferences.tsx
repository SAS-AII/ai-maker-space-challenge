import React from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { AVAILABLE_MODELS } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface MobilePreferencesProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function MobilePreferences({ 
  selectedModel, 
  onModelChange 
}: MobilePreferencesProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleModelSelect = (model: string) => {
    onModelChange(model);
    setIsOpen(false);
  };

  const selectedModelLabel = AVAILABLE_MODELS.find(m => m === selectedModel) || selectedModel;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chat preferences"
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <Settings size={20} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown positioned above the input */}
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Chat Preferences
              </h3>
            </div>
            
            <div className="p-3">
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model
                </label>
                <div className="relative">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    aria-label="Select model"
                  >
                    <span>{selectedModelLabel}</span>
                    <ChevronDown size={14} />
                  </button>
                  
                  {/* Model options dropdown */}
                  <div className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                    <ul className="py-1">
                      {AVAILABLE_MODELS.map((model) => (
                        <li key={model}>
                          <button
                            onClick={() => handleModelSelect(model)}
                            className={cn(
                              'w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none transition-colors text-gray-900 dark:text-gray-100',
                              selectedModel === model && 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                            )}
                          >
                            {model}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Future preferences can be added here */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                More preferences coming soon...
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 