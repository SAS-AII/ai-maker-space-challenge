import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const CODE_BLOCK_BG = 'bg-gray-100 dark:bg-gray-800';
const INLINE_CODE_BG = 'bg-gray-200 dark:bg-gray-700';

// Custom style: remove all per-line and inner backgrounds
const customGray = {
  ...oneDark,
  'pre[class*="language-"]': {
    background: 'transparent',
    borderRadius: '0.75rem',
    margin: 0,
    padding: 0,
  },
  'code[class*="language-"]': {
    background: 'transparent',
  },
  'span.line': {
    background: 'transparent',
    display: 'block',
  },
};

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy code"
      className={cn('p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors', className)}
      onClick={async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch (err) {
          console.error('Clipboard copy failed', err);
        }
      }}
    >
      {copied ? (
        <Check size={16} className="text-green-600" />
      ) : (
        <Copy size={16} />
      )}
    </button>
  );
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-base sm:prose-base md:prose-base lg:prose-base max-w-none dark:prose-invert',
        'prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
        'prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6',
        'prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5',
        'prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4',
        'prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:mb-3 prose-p:leading-relaxed',
        'prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-3',
        'prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-3',
        'prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:mb-1',
        'prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-gray-100',
        'prose-em:italic prose-em:text-gray-700 dark:prose-em:text-gray-300',
        'prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
        'prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto',
        'prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700',
        'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600',
        'prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400',
        'prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:underline hover:prose-a:text-primary-700 dark:hover:prose-a:text-primary-300',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node: _node, inline, className, children, ...props }: { _node?: unknown; inline?: boolean; className?: string; children?: React.ReactNode }) {
            const match = /language-(\w+)/.exec(className || '');
            // Treat truly inline or language-less code as inline span
            if (inline || !match) {
              // Inline code: render as inline <code> with minimal styling
              return (
                <code
                  className={INLINE_CODE_BG + ' rounded px-1 text-sm font-mono'}
                  style={{ display: 'inline', fontSize: '0.95em', verticalAlign: 'baseline' }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            // Block code: render with syntax highlighting, language label (top-right), and copy button
            return (
              <div className="relative my-4 group">
                {/* Language label */}
                {match && (
                  <span className="absolute top-2 right-12 text-xs text-gray-500 uppercase tracking-wide select-none z-10">
                    {match[1]}
                  </span>
                )}
                {/* Copy button */}
                <CopyButton
                  text={String(children)}
                  className="absolute top-1.5 right-3 opacity-0 group-hover:opacity-100"
                />

                <div className={CODE_BLOCK_BG + ' rounded-lg p-4 overflow-x-auto'}>
                  <SyntaxHighlighter
                    style={customGray}
                    language={match ? match[1] : undefined}
                    PreTag="div"
                    customStyle={{ background: 'transparent', margin: 0, padding: 0 }}
                    codeTagProps={{ style: { background: 'transparent' } }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          },
          p({ children, ...props }) {
            // If a paragraph only contains a single <code> element (inline code), render without block <p> styling
            if (
              Array.isArray(children) &&
              children.length === 1 &&
              React.isValidElement(children[0]) &&
              (children[0] as React.ReactElement).type === 'code'
            ) {
              return <span {...props}>{children}</span>;
            }
            return <p {...props}>{children}</p>;
          },
          h1({ children, ...props }) {
            return (
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4 mt-6" {...props}>
                {children}
              </h1>
            );
          },
          h2({ children, ...props }) {
            return (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-5" {...props}>
                {children}
              </h2>
            );
          },
          h3({ children, ...props }) {
            return (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-4" {...props}>
                {children}
              </h3>
            );
          },
          ul({ children, ...props }) {
            return (
              <ul className="list-disc pl-6 mb-3" {...props}>
                {children}
              </ul>
            );
          },
          ol({ children, ...props }) {
            return (
              <ol className="list-decimal pl-6 mb-3" {...props}>
                {children}
              </ol>
            );
          },
          li({ children, ...props }) {
            return (
              <li className="text-gray-700 dark:text-gray-300 mb-1" {...props}>
                {children}
              </li>
            );
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400" {...props}>
                {children}
              </blockquote>
            );
          },
          strong({ children, ...props }) {
            return (
              <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
                {children}
              </strong>
            );
          },
          em({ children, ...props }) {
            return (
              <em className="italic text-gray-700 dark:text-gray-300" {...props}>
                {children}
              </em>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 