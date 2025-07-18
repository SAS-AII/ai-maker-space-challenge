// API configuration
// In production, use relative URLs since frontend and backend are on the same domain
// In development, use the environment variable or fallback to localhost
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Use relative URLs in production
  : process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function sendChatMessage(formData: FormData, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    body: formData,
    signal,
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
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to send message');
  }
  return response.json();
}

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/validate-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    return { valid: false, error: data.error || 'Could not validate API key.' };
  }

  return data;
} 