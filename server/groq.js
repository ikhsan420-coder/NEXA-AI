// Thin Groq client. The API key only ever lives in this process (process.env.GROQ_API_KEY).

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODELS_TTL_MS = 5 * 60 * 1000;

// Model IDs that are not chat/text models. Matched against the *live* list from Groq,
// so nothing here invents a model - it only hides non-chat ones (speech, safety classifiers...).
const NON_CHAT_PATTERN = /(whisper|tts|orpheus|playai|guard|safeguard|embed|moderation|transcri)/i;

export class GroqError extends Error {
  constructor(message, { status = 502, code = 'upstream_error', retryAfter } = {}) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export function getApiKey() {
  const key = process.env.GROQ_API_KEY;
  return key && key.trim() && !key.includes('your_groq_api_key') ? key.trim() : '';
}

export function isConfigured() {
  return getApiKey() !== '';
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

/** Turn a failed Groq response into a safe, user-presentable error. */
export async function toGroqError(res) {
  let detail = '';
  try {
    const data = await res.json();
    detail = typeof data?.error?.message === 'string' ? data.error.message : '';
  } catch {
    /* body was not JSON */
  }
  const retryAfter = res.headers.get('retry-after') || undefined;

  if (res.status === 401 || res.status === 403) {
    // Never reveal details about the server key to the browser.
    return new GroqError('The AI service rejected the server credentials. Check GROQ_API_KEY on the backend.', {
      status: 502,
      code: 'upstream_auth',
    });
  }
  if (res.status === 429) {
    return new GroqError(
      'Rate limit reached for the AI provider. Please wait a moment and try again.',
      { status: 429, code: 'upstream_rate_limit', retryAfter },
    );
  }
  if (res.status === 400 || res.status === 404 || res.status === 413 || res.status === 422) {
    return new GroqError(detail || 'The AI provider could not process this request.', {
      status: 400,
      code: 'upstream_bad_request',
    });
  }
  return new GroqError(detail || `The AI provider returned an error (${res.status}).`, {
    status: 502,
    code: 'upstream_error',
  });
}

let modelsCache = { at: 0, models: [] };

/** Fetch (and cache) the live model list from Groq's /models endpoint. */
export async function listChatModels({ force = false } = {}) {
  const fresh = Date.now() - modelsCache.at < MODELS_TTL_MS && modelsCache.models.length > 0;
  if (fresh && !force) return modelsCache.models;

  const res = await fetch(`${GROQ_BASE}/models`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw await toGroqError(res);

  const data = await res.json();
  const models = (Array.isArray(data?.data) ? data.data : [])
    .filter((m) => m && typeof m.id === 'string' && m.active !== false && !NON_CHAT_PATTERN.test(m.id))
    .map((m) => ({
      id: m.id,
      owned_by: typeof m.owned_by === 'string' ? m.owned_by : undefined,
      context_window: typeof m.context_window === 'number' ? m.context_window : undefined,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  modelsCache = { at: Date.now(), models };
  return models;
}

export function getCachedModels() {
  return modelsCache.models;
}

/** Open a chat completion request against Groq. Returns the raw fetch Response. */
export function openChatCompletion(payload, signal) {
  return fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
    signal,
  });
}
