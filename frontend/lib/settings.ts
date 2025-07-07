import { Settings } from '@/types/chat';

const SETTINGS_KEY = 'chat-settings';

const DEFAULT_SETTINGS: Settings = {
  model: 'gpt-4o-mini',
  apiKey: '',
  systemPrompt: 'You are a helpful AI assistant.',
  developerPrompt: 'You are helping a developer with their questions.',
};

export function getSettings(): Settings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }

  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
} 