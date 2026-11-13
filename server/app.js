import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { validateChatBody } from './validate.js';
import {
  GroqError,
  getCachedModels,
  isConfigured,
  listChatModels,
  openChatCompletion,
  toGroqError,
} from './groq.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

// This module only builds the Express app. It never calls listen():
//  - server/index.js starts it as a normal long-running process (local dev, VPS, Docker...).
//  - api/*.js export it as Vercel Node.js Functions (serverless: one invocation per request).
const ON_VERCEL = Boolean(process.env.VERCEL);
const isProd = process.env.NODE_ENV === 'production' || ON_VERCEL;
const PORT = Number(process.env.PORT) || 8787;
const APP_VERSION = process.env.npm_package_version || '1.0.0';
// Vercel kills a function at its maxDuration (60s in vercel.json). Abort a little earlier so the user gets a clean error.
const UPSTREAM_TIMEOUT_MS = ON_VERCEL ? 55_000 : 120_000;

const PREFERRED_DEFAULT_MODEL = 'llama-3.3-70b-versatile'; // only used if present in the live Groq list

const csv = (v) =>
  (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const configuredModels = csv(process.env.GROQ_MODELS); // optional allow-list
const configuredDefault = (process.env.GROQ_DEFAULT_MODEL || '').trim();

const BASE_SYSTEM_PROMPT =
  (process.env.NEXA_SYSTEM_PROMPT || '').trim() ||
  [
    'You are NEXA AI, a premium, intelligent and friendly AI assistant.',
    'Be accurate, clear and genuinely helpful. Keep answers well organised and as concise as the question allows.',
    "Always reply in the same language the user writes in (for example Indonesian if they write Indonesian).",
    'Format answers with Markdown. Put code in fenced code blocks with a language tag.',
    'If you are not sure about something, say so instead of inventing facts.',
  ].join(' ');

const app = express();
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
else if (ON_VERCEL) app.set('trust proxy', 1); // Vercel sits in front: use the real client IP for rate limiting
app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // Allow plain-HTTP access on a LAN (phone -> laptop). Browsers would otherwise upgrade asset requests to https and fail.
        'upgrade-insecure-requests': null,
        // Shiki's regex engine (Oniguruma) runs as WebAssembly; this allows it without enabling eval().
        'script-src': ["'self'", "'wasm-unsafe-eval'"],
      },
    },
  }),
);

// ---------- CORS ----------
const explicitOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
  `http://localhost:${PORT}`,
  'http://localhost',
  'https://localhost', // Capacitor (androidScheme: https)
  'capacitor://localhost',
  ...csv(process.env.CORS_ORIGINS),
]);
const PRIVATE_NET = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

app.use(
  cors((req, cb) => {
    const origin = req.header('Origin');
    let allowed = false;
    if (!origin) allowed = true; // same-origin or non-browser client
    else if (explicitOrigins.has(origin)) allowed = true;
    else if (!isProd && PRIVATE_NET.test(origin)) allowed = true; // LAN dev (phone -> laptop)
    else {
      try {
        allowed = new URL(origin).host === req.header('Host'); // same-origin request
      } catch {
        allowed = false;
      }
    }
    cb(null, { origin: allowed, methods: ['GET', 'POST', 'OPTIONS'], maxAge: 600 });
  }),
);

app.use(express.json({ limit: '256kb' }));

// ---------- Rate limiting ----------
const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.API_RATE_LIMIT) || 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many requests. Please slow down.' } },
});
const chatLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.CHAT_RATE_LIMIT) || 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many messages. Please wait a minute and try again.' } },
});
app.use('/api', apiLimiter);

const sendError = (res, status, code, message, extra = {}) =>
  res.status(status).json({ error: { code, message, ...extra } });

// ---------- Routes ----------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: APP_VERSION, configured: isConfigured() });
});

function pickDefaultModel(models) {
  const ids = new Set(models.map((m) => m.id));
  if (configuredDefault && ids.has(configuredDefault)) return configuredDefault;
  if (ids.has(PREFERRED_DEFAULT_MODEL)) return PREFERRED_DEFAULT_MODEL;
  return models[0]?.id ?? null;
}

app.get('/api/models', async (_req, res) => {
  if (!isConfigured()) {
    return sendError(res, 503, 'missing_api_key', 'The backend has no GROQ_API_KEY configured. Add it to the .env file and restart the server.');
  }
  try {
    let models = await listChatModels();
    if (configuredModels.length > 0) {
      const allow = new Set(configuredModels);
      const filtered = models.filter((m) => allow.has(m.id));
      if (filtered.length > 0) models = filtered;
    }
    if (models.length === 0) return sendError(res, 502, 'no_models', 'The AI provider returned no usable models.');
    res.json({ models, default: pickDefaultModel(models) });
  } catch (err) {
    if (err instanceof GroqError) {
      if (configuredModels.length > 0) {
        // Provider list unreachable: fall back to the operator-configured list.
        const models = configuredModels.map((id) => ({ id }));
        return res.json({ models, default: configuredDefault || models[0].id, stale: true });
      }
      return sendError(res, err.status, err.code, err.message);
    }
    console.error('[models] unexpected error:', err?.name || 'Error');
    sendError(res, 502, 'upstream_unreachable', 'Could not reach the AI provider.');
  }
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  if (!isConfigured()) {
    return sendError(res, 503, 'missing_api_key', 'The backend has no GROQ_API_KEY configured. Add it to the .env file and restart the server.');
  }

  const parsed = validateChatBody(req.body);
  if (!parsed.ok) return sendError(res, 400, 'invalid_request', parsed.error);
  const { messages, model: requestedModel, temperature, stream, customInstructions } = parsed.value;

  // Resolve + validate the model against the live list when we have it.
  let model = requestedModel;
  try {
    const models = getCachedModels().length ? getCachedModels() : await listChatModels().catch(() => []);
    if (models.length > 0) {
      const ids = new Set(models.map((m) => m.id));
      if (model && !ids.has(model)) {
        return sendError(res, 400, 'unknown_model', 'The selected model is not available. Pick another model in Settings.');
      }
      model = model || pickDefaultModel(models);
    }
  } catch {
    /* model validation is best-effort; Groq will reject unknown models itself */
  }
  if (!model) model = configuredDefault || PREFERRED_DEFAULT_MODEL;

  const today = new Date().toISOString().slice(0, 10);
  let system = `${BASE_SYSTEM_PROMPT}\nToday's date: ${today}.`;
  if (customInstructions) system += `\n\nUser's custom instructions (follow them when reasonable):\n${customInstructions}`;

  const payload = {
    model,
    messages: [{ role: 'system', content: system }, ...messages],
    stream,
  };
  if (temperature !== undefined) payload.temperature = temperature;
  const cap = Number(process.env.MAX_OUTPUT_TOKENS);
  if (Number.isFinite(cap) && cap > 0) payload.max_completion_tokens = cap;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  // Stop paying for tokens if the user closes the tab or presses "Stop".
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const upstream = await openChatCompletion(payload, controller.signal);
    if (!upstream.ok) {
      const err = await toGroqError(upstream);
      if (err.retryAfter) res.setHeader('Retry-After', err.retryAfter);
      return sendError(res, err.status, err.code, err.message);
    }

    if (!stream) {
      const data = await upstream.json();
      const choice = data?.choices?.[0];
      return res.json({
        content: choice?.message?.content ?? '',
        finish_reason: choice?.finish_reason ?? null,
        model: data?.model ?? model,
        usage: data?.usage ?? null,
      });
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const chunk of upstream.body) res.write(chunk);
    } catch (streamErr) {
      if (!controller.signal.aborted || res.writableEnded === false) {
        const msg = 'The response was interrupted. Please try again.';
        if (!res.destroyed) res.write(`data: ${JSON.stringify({ error: { code: 'stream_interrupted', message: msg } })}\n\n`);
      }
    }
    res.end();
  } catch (err) {
    if (res.headersSent) return res.end();
    if (controller.signal.aborted) {
      return sendError(res, 504, 'timeout', 'The AI provider took too long to respond. Please try again.');
    }
    console.error('[chat] upstream failure:', err?.name || 'Error');
    sendError(res, 502, 'upstream_unreachable', 'Could not reach the AI provider. Check the server internet connection.');
  } finally {
    clearTimeout(timeout);
  }
});

app.use('/api', (_req, res) => sendError(res, 404, 'not_found', 'Unknown API endpoint.'));

// ---------- Static frontend (single-process deployment only) ----------
// On Vercel the CDN serves /dist directly, so the function never needs to.
if (!ON_VERCEL && fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(
    express.static(DIST_DIR, {
      setHeaders(res, filePath) {
        // Service worker + HTML must always be revalidated; hashed assets can be cached forever.
        if (/(sw\.js|index\.html|manifest\.webmanifest)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
        else if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// ---------- Error handler ----------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') return sendError(res, 413, 'payload_too_large', 'Request is too large.');
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return sendError(res, 400, 'invalid_json', 'Request body is not valid JSON.');
  }
  console.error('[server] unhandled error:', err?.name || 'Error');
  sendError(res, 500, 'server_error', 'Something went wrong on the server.');
});

export { DIST_DIR, isConfigured };
export default app;
