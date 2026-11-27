-- Capture the customer area supplied voluntarily through the public enquiry form.
alter table public.leads
  add column if not exists customer_location text;

alter table public.leads
  add constraint leads_customer_location_length
    check (customer_location is null or length(customer_location) <= 160);
