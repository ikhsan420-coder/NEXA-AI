// Input validation for the chat endpoint. Everything coming from the client is untrusted.

export const LIMITS = {
  maxMessages: 60,
  maxMessageChars: 16000,
  maxTotalChars: 120000,
  maxCustomInstructionChars: 1500,
};

const MODEL_ID_PATTERN = /^[A-Za-z0-9._\-/:]{1,100}$/;
const ALLOWED_ROLES = new Set(['user', 'assistant']);

/**
 * Validate and normalise the body of POST /api/chat.
 * The client may NOT send a "system" role message: the system prompt is owned by the server.
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function validateChatBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  const { messages, model, temperature, stream, customInstructions } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: '"messages" must be a non-empty array.' };
  }
  if (messages.length > LIMITS.maxMessages) {
    return { ok: false, error: `Too many messages (max ${LIMITS.maxMessages}).` };
  }

  const cleaned = [];
  let total = 0;
  for (const m of messages) {
    if (!m || typeof m !== 'object') return { ok: false, error: 'Invalid message entry.' };
    if (!ALLOWED_ROLES.has(m.role)) return { ok: false, error: 'Message role must be "user" or "assistant".' };
    if (typeof m.content !== 'string') return { ok: false, error: 'Message content must be a string.' };
    const content = m.content.trim();
    if (!content) continue; // silently drop empty turns (e.g. a failed assistant message)
    if (content.length > LIMITS.maxMessageChars) {
      return { ok: false, error: `A message is too long (max ${LIMITS.maxMessageChars} characters).` };
    }
    total += content.length;
    cleaned.push({ role: m.role, content });
  }

  if (cleaned.length === 0) return { ok: false, error: 'No non-empty messages were provided.' };
  if (cleaned[cleaned.length - 1].role !== 'user') {
    return { ok: false, error: 'The last message must come from the user.' };
  }
  if (total > LIMITS.maxTotalChars) {
    return { ok: false, error: 'The conversation is too long. Start a new chat.' };
  }

  let cleanModel;
  if (model !== undefined && model !== null && model !== '') {
    if (typeof model !== 'string' || !MODEL_ID_PATTERN.test(model)) {
      return { ok: false, error: 'Invalid model identifier.' };
    }
    cleanModel = model;
  }

  let cleanTemp;
  if (temperature !== undefined && temperature !== null) {
    if (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      return { ok: false, error: '"temperature" must be a number between 0 and 2.' };
    }
    cleanTemp = temperature;
  }

  let cleanInstructions = '';
  if (customInstructions !== undefined && customInstructions !== null) {
    if (typeof customInstructions !== 'string') {
      return { ok: false, error: '"customInstructions" must be a string.' };
    }
    cleanInstructions = customInstructions.trim().slice(0, LIMITS.maxCustomInstructionChars);
  }

  return {
    ok: true,
    value: {
      messages: cleaned,
      model: cleanModel,
      temperature: cleanTemp,
      stream: stream !== false, // streaming is the default
      customInstructions: cleanInstructions,
    },
  };
}
