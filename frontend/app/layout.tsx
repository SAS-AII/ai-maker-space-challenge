import type { Metadata } from 'next';
import './globals.css';
import { HealthCheckProvider } from '@/components/HealthCheckProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'AI Chat Application',
  description: 'A modern chat interface for AI conversations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        <ThemeProvider>
          <HealthCheckProvider>
            {children}
          </HealthCheckProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 