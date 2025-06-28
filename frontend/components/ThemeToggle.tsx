'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
    >
      {theme === 'light' ? (
        <>
          <Moon size={20} className="sm:mr-2" />
          <span className="hidden sm:inline">Dark</span>
        </>
      ) : (
        <>
          <Sun size={20} className="sm:mr-2" />
          <span className="hidden sm:inline">Light</span>
        </>
      )}
    </Button>
  );
} 