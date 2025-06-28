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
        'absolute -bottom-2 right-0 flex items-center gap-1 text-xs text-gray-500',
        'opacity-0 group-hover:opacity-100 transition-opacity'
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
        <>
          <Check size={14} className="text-green-600" /> Copied!
        </>
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
} 