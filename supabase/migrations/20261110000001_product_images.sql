-- Public bucket for product photos uploaded from the owner dashboard.
-- Anyone can read (the shop shows them); only the owner can upload, replace or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_owner_insert on storage.objects;
drop policy if exists product_images_owner_update on storage.objects;
drop policy if exists product_images_owner_delete on storage.objects;

create policy product_images_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_owner());
create policy product_images_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_owner())
  with check (bucket_id = 'product-images' and public.is_owner());
create policy product_images_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_owner());
