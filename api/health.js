// Vercel Node.js Function. Routed by filesystem: this file serves /api/health.
// It reuses the exact same Express app (validation, rate limit, CORS, Helmet, error handling) as the local server.
import app from '../server/app.js';

export default app;
