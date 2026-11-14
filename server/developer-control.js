import { createHash, randomBytes } from 'node:crypto';
import express from 'express';

const router = express.Router();

const config = () => ({
  url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  anon: process.env.SUPABASE_ANON_KEY || '',
  service: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
});

function requiredConfig(res, includeService = false) {
  const c = config();
  if (!c.url || !c.anon || (includeService && !c.service)) {
    res.status(503).json({
      error: {
        code: 'developer_control_not_configured',
        message: 'Developer Control is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY and the required server-only service key.',
      },
    });
    return null;
  }
  return c;
}

async function getAuthenticatedUser(req, res) {
  const c = requiredConfig(res);
  if (!c) return null;
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!match) {
    res.status(401).json({ error: { code: 'authentication_required', message: 'Sign in to continue.' } });
    return null;
  }
  const response = await fetch(`${c.url}/auth/v1/user`, {
    headers: { apikey: c.anon, Authorization: `Bearer ${match[1]}` },
  });
  if (!response.ok) {
    res.status(401).json({ error: { code: 'invalid_session', message: 'Your session is invalid or expired. Please sign in again.' } });
    return null;
  }
  return response.json();
}

async function getRole(userId, c) {
  const url = new URL(`${c.url}/rest/v1/team_members`);
  url.searchParams.set('select', 'role');
  url.searchParams.set('user_id', `eq.${userId}`);
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    headers: { apikey: c.service, Authorization: `Bearer ${c.service}` },
  });
  if (!response.ok) throw new Error('Could not read team membership.');
  const rows = await response.json();
  return rows[0]?.role || null;
}

router.get('/me', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;
    const c = requiredConfig(res, true);
    if (!c) return;
    const role = await getRole(user.id, c);
    res.json({
      authenticated: true,
      user: { id: user.id, email: user.email || null },
      member: Boolean(role),
      role,
    });
  } catch (error) {
    console.error('[developer-control/me]', error?.message || 'unknown error');
    res.status(502).json({ error: { code: 'membership_lookup_failed', message: 'Could not check Developer Control membership.' } });
  }
});

router.post('/invitations', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;
    const c = requiredConfig(res, true);
    if (!c) return;
    const actorRole = await getRole(user.id, c);
    if (actorRole !== 'Owner') {
      return res.status(403).json({ error: { code: 'owner_only', message: 'Only the Owner can invite team members.' } });
    }

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const role = req.body?.role;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: { code: 'invalid_email', message: 'Enter a valid email address.' } });
    }
    if (!['Admin', 'Publisher', 'Tester'].includes(role)) {
      return res.status(400).json({ error: { code: 'invalid_role', message: 'Role must be Admin, Publisher, or Tester.' } });
    }

    const inviteResponse = await fetch(`${c.url}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        apikey: c.service,
        Authorization: `Bearer ${c.service}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, data: { nexa_invited_role: role } }),
    });
    const inviteData = await inviteResponse.json().catch(() => ({}));
    if (!inviteResponse.ok) {
      return res.status(inviteResponse.status === 429 ? 429 : 400).json({
        error: { code: 'invite_failed', message: inviteData.msg || inviteData.message || 'Supabase could not send the invitation.' },
      });
    }

    const tokenHash = createHash('sha256').update(randomBytes(32)).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const saveResponse = await fetch(`${c.url}/rest/v1/invitations`, {
      method: 'POST',
      headers: {
        apikey: c.service,
        Authorization: `Bearer ${c.service}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        email,
        role,
        token_hash: tokenHash,
        invited_by: user.id,
        expires_at: expiresAt,
      }),
    });
    if (!saveResponse.ok) {
      console.error('[developer-control/invitations] invitation record save failed');
      return res.status(502).json({ error: { code: 'invite_record_failed', message: 'Invitation email was sent, but its team record could not be saved. Contact the Owner before retrying.' } });
    }

    res.status(201).json({ ok: true, email, role, expiresAt });
  } catch (error) {
    console.error('[developer-control/invitations]', error?.message || 'unknown error');
    res.status(502).json({ error: { code: 'invitation_failed', message: 'Could not complete the invitation.' } });
  }
});

export default router;
