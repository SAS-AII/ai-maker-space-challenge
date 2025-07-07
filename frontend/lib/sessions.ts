import { ChatSession } from '@/types/chat';

const SESSIONS_KEY = 'chat-sessions';

export function getStoredSessions(): ChatSession[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading sessions from localStorage:', error);
  }

  return [];
}

export function saveStoredSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving sessions to localStorage:', error);
  }
} 