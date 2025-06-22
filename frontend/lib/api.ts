import { ChatRequest, ChatResponse } from '@/types/chat';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function sendChatMessage(formData: FormData): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.body!;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Sends a chat message (with optional image) to the backend
export async function sendMessage(formData: FormData) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to send message');
  }
  return response.json();
} 