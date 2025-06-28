export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
  images?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  model: string;
  messages: Message[];
}

export interface ChatRequest {
  model: string;
  messages: Message[];
}

export interface ChatResponse {
  content: string;
}

export interface Settings {
  developerPrompt?: string;
  systemPrompt?: string;
  model: string;
  apiKey: string;
}

export const AVAILABLE_MODELS = [
  'gpt-4.1-nano',
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-3.5-turbo',
] as const;

export type ModelType = typeof AVAILABLE_MODELS[number]; 