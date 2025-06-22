import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleString();
}

export function generateChatTitle(messages: any[]): string {
  const userMessages = messages.filter(msg => msg.role === 'user');
  if (userMessages.length === 0) return 'New Chat';
  
  const firstMessage = userMessages[0].content;
  return firstMessage.length > 30 
    ? firstMessage.substring(0, 30) + '...' 
    : firstMessage;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
} 