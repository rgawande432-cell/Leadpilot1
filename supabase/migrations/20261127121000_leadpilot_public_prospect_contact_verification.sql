-- Add owner-verified contact details to public-intent prospects.
-- Contact details are recorded only after the business owner verifies them independently.
alter table public.leadpilot_public_prospects
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists contact_verified_at timestamptz,
  add column if not exists contact_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists contact_verification_source text,
  add column if not exists contact_verification_notes text;

alter table public.leadpilot_public_prospects
  add constraint leadpilot_public_prospects_contact_email_format
    check (contact_email is null or lower(trim(contact_email)) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  add constraint leadpilot_public_prospects_contact_phone_format
    check (contact_phone is null or contact_phone ~ '^[+0-9 ()-]{7,20}$'),
  add constraint leadpilot_public_prospects_contact_name_length
    check (contact_name is null or length(contact_name) <= 120),
  add constraint leadpilot_public_prospects_contact_source_length
    check (contact_verification_source is null or length(contact_verification_source) <= 500),
  add constraint leadpilot_public_prospects_contact_notes_length
    check (contact_verification_notes is null or length(contact_verification_notes) <= 1000),
  add constraint leadpilot_public_prospects_contact_verified_requires_contact
    check (
      status <> 'contact_verified'
      or (
        (nullif(trim(contact_phone), '') is not null or nullif(trim(contact_email), '') is not null)
        and contact_verified_at is not null
        and nullif(trim(contact_verification_source), '') is not null
      )
    );
