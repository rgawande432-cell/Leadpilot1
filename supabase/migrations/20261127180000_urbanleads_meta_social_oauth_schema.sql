-- UrbanLeads Meta OAuth connection storage
create table if not exists public.urbanleads_social_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('facebook','instagram')),
  redirect_uri text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  consumed_at timestamptz
);
create index if not exists social_oauth_states_expiry_idx on public.urbanleads_social_oauth_states(expires_at);

create table if not exists public.urbanleads_social_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('facebook','instagram')),
  platform_account_id text not null,
  platform_account_name text,
  page_id text,
  page_name text,
  encrypted_access_token text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected','expired','revoked','error')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,provider,platform_account_id)
);
alter table public.urbanleads_social_oauth_states enable row level security;
alter table public.urbanleads_social_connections enable row level security;
revoke all on public.urbanleads_social_oauth_states from anon, authenticated;
revoke all on public.urbanleads_social_connections from anon, authenticated;
grant all on public.urbanleads_social_oauth_states to service_role;
grant all on public.urbanleads_social_connections to service_role;
