import { Capacitor } from '@capacitor/core';
import type { ModelInfo } from '../types';

/** Thrown for every failure; `message` is always safe to show in the UI. */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = 'error', status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

let serverUrlOverride = '';
export function setServerUrl(url: string): void {
  serverUrlOverride = url.trim().replace(/\/+$/, '');
}

/** Backend base URL: Settings override > build-time VITE_API_BASE_URL > same origin. */
export function apiBase(): string {
  const env = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  return serverUrlOverride || env || '';
}

export function needsServerUrl(): boolean {
  return Capacitor.isNativePlatform() && !apiBase();
}

async function readError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status}).`;
  let code = 'error';
  try {
    const data = await res.json();
    if (typeof data?.error?.message === 'string') message = data.error.message;
    if (typeof data?.error?.code === 'string') code = data.error.code;
  } catch {
    /* non-JSON body */
  }
  if (res.status === 429 && code === 'error') code = 'rate_limited';
  return new ApiError(message, code, res.status);
}

function networkError(): ApiError {
  return new ApiError(
    needsServerUrl()
      ? 'No server configured. Open Settings and enter your NEXA backend URL.'
      : 'Cannot reach the NEXA backend. Check that the server is running and your connection is working.',
    'network',
  );
}

export interface ModelsResponse {
  models: ModelInfo[];
  default: string | null;
}

export async function fetchModels(signal?: AbortSignal): Promise<ModelsResponse> {
  if (needsServerUrl()) throw networkError();
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/models`, { signal });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw networkError();
  }
  if (!res.ok) throw await readError(res);
  const data = await res.json();
  return { models: Array.isArray(data.models) ? data.models : [], default: data.default ?? null };
}

export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  customInstructions?: string;
}

/**
 * Stream a chat completion through the backend (/api/chat). Calls onDelta with each text chunk.
 * Resolves when the stream ends. Rejects with ApiError (partial text already delivered via onDelta is kept by the caller).
 */
export async function streamChat(req: ChatRequest, onDelta: (text: string) => void, signal: AbortSignal): Promise<void> {
  if (needsServerUrl()) throw networkError();

  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ ...req, stream: true }),
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw networkError();
  }
  if (!res.ok) throw await readError(res);
  if (!res.body) throw new ApiError('The server returned an empty response.', 'empty');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let received = false;

  const handleLine = (line: string): boolean => {
    if (!line.startsWith('data:')) return false;
    const payload = line.slice(5).trim();
    if (!payload) return false;
    if (payload === '[DONE]') return true;
    let json: any;
    try {
      json = JSON.parse(payload);
    } catch {
      return false; // ignore keep-alives / partial garbage
    }
    if (json?.error) throw new ApiError(json.error.message || 'The response was interrupted.', json.error.code || 'stream_error');
    const delta = json?.choices?.[0]?.delta?.content;
    if (typeof delta === 'string' && delta) {
      received = true;
      onDelta(delta);
    }
    return false;
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).replace(/\r$/, '');
        buffer = buffer.slice(nl + 1);
        if (handleLine(line)) return;
      }
    }
    if (buffer.trim()) handleLine(buffer.trim());
  } catch (e) {
    if ((e as Error)?.name === 'AbortError' || e instanceof ApiError) throw e;
    throw new ApiError('The connection was lost while receiving the answer.', 'network');
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }

  if (!received) throw new ApiError('The model returned an empty answer. Try again or pick another model.', 'empty');
}
