# Supabase setup for NEXA AI Developer Control

This is Phase 1 infrastructure. It does not change the existing chat UI or local conversation storage.

## 1. Apply the database migration

1. Open the NEXA-AI Supabase project.
2. Open **SQL Editor** and create a new query.
3. Paste the complete contents of `migrations/202611140001_developer_control.sql`.
4. Run it once and confirm the tables are created.

The migration enables RLS on every Developer Control table. Keep **Automatically expose new tables** disabled in the Supabase project settings.

## 2. Create the first Owner

Public sign-ups must remain disabled. In Supabase Dashboard, use Authentication > Users to invite the owner's email address manually. After the user accepts and appears in the Users list:

1. Copy that user's UUID from Authentication > Users.
2. Run the following SQL, replacing the UUID with the actual value:

```sql
insert into public.team_members (user_id, role)
values ('REPLACE-WITH-AUTH-USER-UUID', 'Owner')
on conflict (user_id) do update set role = excluded.role;
```

Do not guess the UUID and do not assign Owner from client-side metadata. This one-time bootstrap is intentionally manual.

## 3. Configure backend environment variables

Set these in the server host (for example Vercel Project > Settings > Environment Variables), then redeploy:

- `SUPABASE_URL`: Project URL, e.g. `https://PROJECT_REF.supabase.co`
- `SUPABASE_ANON_KEY`: the project's Publishable key (or legacy anon key)
- `SUPABASE_SERVICE_ROLE_KEY`: the server-only Secret key (or legacy service_role key)

Never prefix these with `VITE_`. Never place the service-role/secret key in frontend code, a public repository, or a mobile app. Do not commit a real `.env` file.

## 4. Current API endpoints

All endpoints are served by the existing Express app:

- `GET /api/developer/me`: validates the Supabase access token and returns the current user's team role.
- `POST /api/developer/invitations`: Owner-only; accepts JSON `{"email":"person@example.com","role":"Tester"}` and sends a Supabase Auth invitation for Admin, Publisher, or Tester.

Send the access token as `Authorization: Bearer <access_token>`.

The invitation endpoint sends the Auth email and records the role in `team_members`. Confirm the invited user appears in Authentication > Users and that the team role is present before treating onboarding as complete.

## 5. Important limitations of this phase

- The current NEXA frontend has not yet been wired to Supabase login.
- Owner bootstrap is manual and must be completed before the invite endpoint can work.
- Disable public sign-ups in Supabase Authentication settings; invite-only is the intended policy.
- The Beta artifact storage, candidate workflow UI, approval UI, audit-log writer, and stable-release promotion are later phases.
- Existing chats remain in local storage; this migration does not upload or delete chat history.
