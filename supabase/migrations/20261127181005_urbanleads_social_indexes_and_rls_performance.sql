-- Improve owner-scoped draft RLS evaluation and index social OAuth foreign keys.
drop policy if exists "Owner manages campaign drafts" on public.leadpilot_campaign_drafts;
create policy "Owner manages campaign drafts"
on public.leadpilot_campaign_drafts
for all to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = leadpilot_campaign_drafts.business_id
      and b.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = leadpilot_campaign_drafts.business_id
      and b.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "Owner manages content drafts" on public.leadpilot_content_drafts;
create policy "Owner manages content drafts"
on public.leadpilot_content_drafts
for all to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = leadpilot_content_drafts.business_id
      and b.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = leadpilot_content_drafts.business_id
      and b.owner_user_id = (select auth.uid())
  )
);

create index if not exists urbanleads_social_connections_owner_user_id_idx
  on public.urbanleads_social_connections(owner_user_id);
create index if not exists urbanleads_social_oauth_states_business_id_idx
  on public.urbanleads_social_oauth_states(business_id);
create index if not exists urbanleads_social_oauth_states_user_id_idx
  on public.urbanleads_social_oauth_states(user_id);
