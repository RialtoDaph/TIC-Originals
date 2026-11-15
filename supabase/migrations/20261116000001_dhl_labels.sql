-- DHL shipping labels: created automatically after payment (src/lib/dhl.ts).
alter table public.orders
  add column if not exists label_path text,
  add column if not exists label_error text not null default '',
  add column if not exists label_started_at timestamptz;

-- Private bucket: labels contain customer addresses. Only the service role reads and writes it;
-- the owner downloads labels through /owner/label/[id], which checks the owner role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shipping-labels', 'shipping-labels', false, 2097152, array['application/pdf'])
on conflict (id) do nothing;
