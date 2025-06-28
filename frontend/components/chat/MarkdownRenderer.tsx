import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../ThemeProvider';

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

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-base sm:prose-lg max-w-none dark:prose-invert',
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
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : undefined;
            if (!inline) {
              // Code block: single gray background, language label at top-left
              return (
                <div className={`my-4 relative rounded-lg ${CODE_BLOCK_BG} p-0`}>
                  {lang && (
                    <span className="absolute top-2 left-4 text-xs font-mono text-gray-400 select-none">
                      {lang}
                    </span>
                  )}
                  <div className="pt-7 px-4 pb-4 overflow-x-auto">
                    <SyntaxHighlighter
                      language={lang}
                      style={customGray}
                      PreTag="div"
                      customStyle={{ background: 'transparent', borderRadius: '0.75rem', margin: 0, padding: 0, fontSize: '1em' }}
                      codeTagProps={{ className: 'text-sm sm:text-base bg-transparent' }}
                      showLineNumbers={false}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            }
            // Inline code: render in a small, rounded gray span that fits the word
            return (
              <code className={`inline-block align-middle ${INLINE_CODE_BG} px-2 py-0.5 rounded text-xs sm:text-sm font-mono`} {...props}>
                {children}
              </code>
            );
          },
          p({ children, ...props }) {
            return (
              <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed" {...props}>
                {children}
              </p>
            );
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