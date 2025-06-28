import React from 'react';
import ReactDOM from 'react-dom';
import { AVAILABLE_MODELS } from '@/types/chat';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponseActionsProps {
  onRetry: (prompt: string) => void;
  currentModel: string;
  onModelChange: (model: string) => void;
  prompt: string;
}

const MODEL_DESCRIPTIONS: Record<string, string> = {
  'gpt-4.1-nano': 'Fast & lightweight – great for quick drafts',
  'gpt-4o-mini': 'Balanced speed and quality for everyday tasks',
  'gpt-4o': 'Highest quality – best reasoning & creativity',
  'gpt-3.5-turbo': 'Most affordable legacy model',
};

// Helper hook to create a portal container once
function usePortalContainer(id: string) {
  const [portalElement, setPortalElement] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    let element = document.getElementById(id);
    if (!element) {
      element = document.createElement('div');
      element.id = id;
      document.body.appendChild(element);
    }
    setPortalElement(element);
    return () => {
      // We purposely do NOT remove the element on unmount to avoid creating
      // multiple nodes over time if the component mounts/unmounts frequently.
    };
  }, [id]);

  return portalElement;
}

export function ResponseActions({ onRetry, currentModel, onModelChange, prompt }: ResponseActionsProps) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Dynamically calculated dropdown position when rendered in a portal
  const [dropdownStyles, setDropdownStyles] = React.useState<React.CSSProperties>({});

  // Container for the portal so we don\'t pollute the body directly with many nodes
  const portalContainer = usePortalContainer('chat-response-actions-portal');

  // Close menu on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // When menu opens, compute best position (above or below) to avoid being cut off
  React.useEffect(() => {
    if (!open || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 224; // w-56 => 14rem => 224px
    const gap = 8; // same as mb-2

    // Decide placement: prefer above (like ChatGPT) but if not enough space, place below.
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const preferredHeight = 300; // approximate dropdown height

    const placeAbove = spaceAbove >= preferredHeight || spaceAbove >= spaceBelow;

    const top = placeAbove ? rect.top - gap : rect.bottom + gap;
    const left = Math.max(8, rect.right - dropdownWidth); // ensure at least 8px from viewport left

    setDropdownStyles({
      position: 'fixed',
      top: Math.round(top),
      left: Math.round(left),
      width: dropdownWidth,
      zIndex: 9999,
    });
  }, [open]);

  const handleModelSelect = (model: string) => {
    if (model !== currentModel) {
      onModelChange(model);
      // Give React a tick
      setTimeout(() => {
        onRetry(prompt);
      }, 0);
    } else {
      onRetry(prompt);
    }
    setOpen(false);
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <RefreshCw size={18} />
        <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
        <span className="sr-only">Response actions</span>
      </button>

      {open && portalContainer && ReactDOM.createPortal(
        <div ref={dropdownRef} style={dropdownStyles} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-y-auto text-sm">
          {/* Try again */}
          <button
            onClick={() => { setOpen(false); onRetry(prompt); }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100"
          >
            Try again
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          {/* Model options */}
          <div className="max-h-60 overflow-y-auto">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model}
                onClick={() => handleModelSelect(model)}
                className={cn(
                  'w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100',
                  currentModel === model && 'font-semibold bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                )}
              >
                {currentModel === model ? `★ ${model}` : model}
              </button>
            ))}
          </div>
          {/* Description */}
          {MODEL_DESCRIPTIONS[currentModel] && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              {MODEL_DESCRIPTIONS[currentModel]}
            </div>
          )}
        </div>,
        portalContainer
      )}
      {open && !portalContainer && (
        <div ref={dropdownRef} className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-[9999] text-sm">
          {/* Try again */}
          <button
            onClick={() => { setOpen(false); onRetry(prompt); }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100"
          >
            Try again
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          {/* Model options */}
          <div className="max-h-60 overflow-y-auto">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model}
                onClick={() => handleModelSelect(model)}
                className={cn(
                  'w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100',
                  currentModel === model && 'font-semibold bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                )}
              >
                {currentModel === model ? `★ ${model}` : model}
              </button>
            ))}
          </div>
          {/* Description */}
          {MODEL_DESCRIPTIONS[currentModel] && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              {MODEL_DESCRIPTIONS[currentModel]}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 