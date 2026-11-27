alter table public.businesses
  add column if not exists public_listing_enabled boolean not null default false,
  add column if not exists public_phone_enabled boolean not null default false;

comment on column public.businesses.public_listing_enabled is 'Explicit owner opt-in to appear in LeadPilot public discovery directory; default off.';
comment on column public.businesses.public_phone_enabled is 'Explicit owner opt-in to display the business phone publicly; default off.';
