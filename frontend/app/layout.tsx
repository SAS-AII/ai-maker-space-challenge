import type { Metadata } from 'next';
import './globals.css';
import { HealthCheckProvider } from '@/components/HealthCheckProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import Head from 'next/head';

export const metadata: Metadata = {
  title: 'The Code Room - Internal Documentation Assistant',
  description: 'Your personal code documentation assistant for internal development',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <Head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <title>The Code Room</title>
      </Head>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased overflow-hidden">
        <ThemeProvider>
          <HealthCheckProvider>
            {children}
          </HealthCheckProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 