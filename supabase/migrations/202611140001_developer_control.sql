-- NEXA AI Developer Control - Phase 1 schema
-- Apply through Supabase SQL Editor after reviewing. No user is promoted to Owner automatically.
-- Bootstrap the first Owner manually using the Supabase Dashboard as described in the project setup notes.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('Owner', 'Admin', 'Publisher', 'Tester')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('Admin', 'Publisher', 'Tester')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.update_candidates (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  changelog text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'beta', 'review', 'approved', 'published', 'rejected', 'withdrawn')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version)
);

create table if not exists public.build_artifacts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.update_candidates(id) on delete cascade,
  storage_path text not null,
  sha256 text not null,
  build_number text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (candidate_id, sha256)
);

create table if not exists public.test_reports (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.update_candidates(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'bug',
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  description text not null,
  device_info text,
  status text not null default 'open'
    check (status in ('open', 'triaged', 'fixed', 'wont_fix')),
  created_at timestamptz not null default now()
);

create table if not exists public.release_approvals (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.update_candidates(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invitations_email_idx on public.invitations (lower(email));
create index if not exists update_candidates_status_idx on public.update_candidates (status, created_at desc);
create index if not exists build_artifacts_candidate_idx on public.build_artifacts (candidate_id, created_at desc);
create index if not exists test_reports_candidate_idx on public.test_reports (candidate_id, created_at desc);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

create or replace function public.current_team_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select tm.role
  from public.team_members tm
  where tm.user_id = (select auth.uid())
  limit 1
$$;

create or replace function public.has_team_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_team_role() = any (allowed_roles), false)
$$;

revoke all on function public.current_team_role() from public;
revoke all on function public.has_team_role(text[]) from public;
grant execute on function public.current_team_role() to authenticated;
grant execute on function public.has_team_role(text[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.invitations enable row level security;
alter table public.update_candidates enable row level security;
alter table public.build_artifacts enable row level security;
alter table public.test_reports enable row level security;
alter table public.release_approvals enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users can read/update their own profile; team managers can read team profiles.
create policy "profiles_read_self_or_managers"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.has_team_role(array['Owner', 'Admin'])
);

create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Team membership is private; only the Owner manages membership.
create policy "team_members_read_self_or_owner"
on public.team_members for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_team_role(array['Owner'])
);

create policy "team_members_owner_insert"
on public.team_members for insert to authenticated
with check (public.has_team_role(array['Owner']));

create policy "team_members_owner_update"
on public.team_members for update to authenticated
using (public.has_team_role(array['Owner']))
with check (public.has_team_role(array['Owner']));

create policy "team_members_owner_delete"
on public.team_members for delete to authenticated
using (public.has_team_role(array['Owner']));

-- Invitation metadata can be managed by Owner; invitees can inspect their own invitation.
create policy "invitations_read_owner_or_invitee"
on public.invitations for select to authenticated
using (
  public.has_team_role(array['Owner'])
  or lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

create policy "invitations_owner_insert"
on public.invitations for insert to authenticated
with check (public.has_team_role(array['Owner']));

create policy "invitations_owner_update"
on public.invitations for update to authenticated
using (public.has_team_role(array['Owner']))
with check (public.has_team_role(array['Owner']));

create policy "candidates_team_read"
on public.update_candidates for select to authenticated
using (public.has_team_role(array['Owner', 'Admin', 'Publisher', 'Tester']));

create policy "candidates_authorized_create"
on public.update_candidates for insert to authenticated
with check (public.has_team_role(array['Owner', 'Admin', 'Publisher']));

create policy "candidates_authorized_update"
on public.update_candidates for update to authenticated
using (public.has_team_role(array['Owner', 'Admin', 'Publisher']))
with check (public.has_team_role(array['Owner', 'Admin', 'Publisher']));

create policy "artifacts_team_read"
on public.build_artifacts for select to authenticated
using (public.has_team_role(array['Owner', 'Admin', 'Publisher', 'Tester']));

create policy "artifacts_publishers_insert"
on public.build_artifacts for insert to authenticated
with check (public.has_team_role(array['Owner', 'Admin', 'Publisher']));

create policy "reports_team_read"
on public.test_reports for select to authenticated
using (public.has_team_role(array['Owner', 'Admin', 'Publisher', 'Tester']));

create policy "testers_submit_own_reports"
on public.test_reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and public.has_team_role(array['Owner', 'Admin', 'Publisher', 'Tester'])
);

create policy "managers_update_reports"
on public.test_reports for update to authenticated
using (public.has_team_role(array['Owner', 'Admin']))
with check (public.has_team_role(array['Owner', 'Admin']));

create policy "approvals_owner_read"
on public.release_approvals for select to authenticated
using (public.has_team_role(array['Owner']));

create policy "approvals_owner_insert"
on public.release_approvals for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and public.has_team_role(array['Owner'])
);

create policy "audit_logs_owner_admin_read"
on public.audit_logs for select to authenticated
using (public.has_team_role(array['Owner', 'Admin']));

-- Audit log writes are intentionally reserved for trusted server-side code using the service role.
