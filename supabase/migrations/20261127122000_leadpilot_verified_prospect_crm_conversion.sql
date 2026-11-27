-- Idempotently convert an owner-verified public prospect into the CRM.
alter table public.leadpilot_public_prospects
  add column if not exists converted_lead_id uuid references public.leads(id) on delete set null,
  add column if not exists converted_at timestamptz,
  add constraint leadpilot_public_prospects_conversion_timestamp_check
    check (converted_at is null or converted_lead_id is not null);

create or replace function public.convert_verified_prospect_to_lead(p_prospect_id uuid)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  p public.leadpilot_public_prospects%rowtype;
  signal_intent text;
  new_lead_id uuid;
begin
  select * into p
  from public.leadpilot_public_prospects
  where id = p_prospect_id
  for update;

  if not found then raise exception 'Prospect not found'; end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p.business_id and b.owner_user_id = auth.uid()
  ) then
    raise exception 'Business access denied';
  end if;

  if p.converted_lead_id is not null then
    return p.converted_lead_id;
  end if;

  if p.status <> 'contact_verified'
     or (nullif(trim(p.contact_phone), '') is null and nullif(trim(p.contact_email), '') is null)
     or p.contact_verified_at is null
     or p.contact_verified_by is distinct from auth.uid()
     or nullif(trim(p.contact_verification_source), '') is null then
    raise exception 'Prospect contact must be independently verified before CRM conversion';
  end if;

  select s.intent_type into signal_intent
  from public.ai_discovery_signals s
  where s.id = p.signal_id and s.business_id = p.business_id and s.verification_status = 'verified';

  if signal_intent is null then
    raise exception 'Verified public intent signal is required';
  end if;

  insert into public.leads (
    business_id, name, email, phone, message, source, status, score,
    evidence_url, intent_summary, qualification_status, intent_level,
    score_breakdown, score_reasons, score_disclaimer
  ) values (
    p.business_id,
    coalesce(nullif(trim(p.contact_name), ''), p.title),
    p.contact_email,
    p.contact_phone,
    left('Public intent evidence; no direct enquiry consent recorded. ' || coalesce(p.evidence_summary, ''), 2000),
    'Public intent prospect (owner verified)',
    'New',
    greatest(0, least(100, coalesce(p.score, 0))),
    p.source_url,
    left('Owner-reviewed public intent; contact independently verified. Verification source: ' || coalesce(p.contact_verification_source, ''), 1000),
    'Unreviewed',
    signal_intent,
    jsonb_build_object('source', 'public_intent_prospect', 'contact_verified', true),
    jsonb_build_array('Owner-reviewed public intent evidence', 'Contact independently verified by business owner'),
    'Public prospect, not a direct enquiry. No direct enquiry consent is recorded; follow applicable privacy and outreach rules.'
  )
  returning id into new_lead_id;

  update public.leadpilot_public_prospects
  set converted_lead_id = new_lead_id, converted_at = now(), updated_at = now()
  where id = p.id and business_id = p.business_id;

  return new_lead_id;
end;
$function$;

revoke all on function public.convert_verified_prospect_to_lead(uuid) from public;
revoke all on function public.convert_verified_prospect_to_lead(uuid) from anon;
grant execute on function public.convert_verified_prospect_to_lead(uuid) to authenticated;
