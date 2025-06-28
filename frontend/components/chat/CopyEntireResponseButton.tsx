import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyEntireResponseButtonProps {
  markdown: string;
}

export function CopyEntireResponseButton({ markdown }: CopyEntireResponseButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy entire response"
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
        'px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(markdown);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch (err) {
          console.error('Clipboard copy failed', err);
        }
      }}
    >
      {copied ? (
        <Check size={18} className="text-green-600" />
      ) : (
        <Copy size={18} />
      )}
    </button>
  );
} 