// Long-running server entry (local development, VPS, Docker, any Node host).
// Vercel does NOT use this file: it uses the functions in /api, which export the same app without listen().
import fs from 'node:fs';
import app, { DIST_DIR, isConfigured } from './app.js';

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`NEXA AI server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(isConfigured() ? 'Groq API key: configured' : 'Groq API key: MISSING - set GROQ_API_KEY in .env');
  console.log(fs.existsSync(DIST_DIR) ? 'Serving built frontend from /dist' : 'No /dist build found (run "npm run build" or use "npm run dev")');
});
