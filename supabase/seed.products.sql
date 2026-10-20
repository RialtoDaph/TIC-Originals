-- Starter catalogue: the 8 products from the design handoff with placeholder images.
-- Editable in the dashboard. Delete this file (and remove it from supabase/config.toml
-- db.seed.sql_paths) once the real catalogue is in place.

insert into public.products (slug, name, category, price_cents, color, material_de, material_en, weight_g, care_de, care_en, images, low_stock_threshold, sort_order)
values ('tic-heavyweight-hoodie', 'TIC Heavyweight Hoodie', 'hoodies', 6989, 'Schwarz', '100% Baumwolle', '100% cotton', 520, null, null, array['/img/hf_20261002_220416_25955af3-f2c4-4c5e-a561-8f3ab6be6105.jpg','/img/hf_20261002_220416_d40fc0a9-acb7-42ea-8f68-6ea1fcfe5971.jpg'], 3, 1)
on conflict (slug) do nothing;
insert into public.product_variants (product_id, size, stock, sort_order)
select p.id, v.size, v.stock, v.ord from public.products p, (values ('S', 6, 0), ('M', 4, 1), ('L', 9, 2), ('XL', 3, 3)) as v(size, stock, ord)
where p.slug = 'tic-heavyweight-hoodie' on conflict (product_id, size) do nothing;

insert into public.products (slug, name, category, price_cents, color, material_de, material_en, weight_g, care_de, care_en, images, low_stock_threshold, sort_order)
values ('tic-acid-wash-hoodie-grau', 'TIC Acid Wash Hoodie — Grau', 'hoodies', 7489, 'Grau', '100% Baumwolle', '100% cotton', 540, null, null, array['/img/hf_20261002_220416_d82a02f8-b352-445c-8b3b-ef201dc2cb97.jpg','/img/hf_20261002_220416_0a72b18f-7aaa-4a6a-b47f-4338f94e50ab.jpg'], 3, 2)
on conflict (slug) do nothing;
insert into public.product_variants (product_id, size, stock, sort_order)
select p.id, v.size, v.stock, v.ord from public.products p, (values ('S', 5, 0), ('M', 8, 1), ('L', 6, 2), ('XL', 2, 3)) as v(size, stock, ord)
where p.slug = 'tic-acid-wash-hoodie-grau' on conflict (product_id, size) do nothing;

insert into public.products (slug, name, category, price_cents, color, material_de, material_en, weight_g, care_de, care_en, images, low_stock_threshold, sort_order)
values ('till-i-collapse-piped-tracksuit', 'Till I Collapse Piped Tracksuit', 'sweatsuits', 11989, 'Schwarz', '100% Baumwolle', '100% cotton', 860, null, null, array['/img/hf_20261002_220458_aa851bd6-5645-4a4f-b2e9-c0ba98fd14d5.jpg','/img/hf_20261002_220517_804fc6b3-afd4-4c74-9796-dfb651aa478a.jpg'], 4, 3)
on conflict (slug) do nothing;
insert into public.product_variants (product_id, size, stock, sort_order)
select p.id, v.size, v.stock, v.ord from public.products p, (values ('S', 3, 0), ('M', 5, 1), ('L', 4, 2), ('XL', 0, 3)) as v(size, stock, ord)
where p.slug = 'till-i-collapse-piped-tracksuit' on conflict (product_id, size) do nothing;

insert into public.products (slug, name, category, price_cents, color, material_de, material_en, weight_g, care_de, care_en, images, low_stock_threshold, sort_order)
values ('tic-logo-tee', 'TIC Logo Tee', 't-shirts', 3489, 'Schwarz', '100% Baumwolle', '100% cotton', 240, null, null, array['/img/hf_20261002_220458_485ca0e5-84c8-4e38-a3f4-9f4805443a75.jpg','/img/hf_20261002_220517_c0c559d1-0f34-426e-8e6b-1e96532ed70e.jpg'], 3, 4)
on conflict (slug) do nothing;
insert into public.product_variants (product_id, size, stock, sort_order)
select p.id, v.size, v.stock, v.ord from public.products p, (values ('S', 12, 0), ('M', 18, 1), ('L', 15, 2), ('XL', 7, 3)) as v(size, stock, ord)
where p.slug = 'tic-logo-tee' on conflict (product_id, size) do nothing;

insert into public.products (slug, name, category, price_cents, color, material_de, material_en, weight_g, care_de, care_en, images, low_stock_threshold, sort_order)
values ('tic-logo-tee-sky', 'TIC Logo Tee — Sky', 't-shirts', 3489, 'Hellblau', '100% Baumwolle', '100% cotton', 240, null, null, array['/img/hf_20261002_220416_8d7fcc79-2d47-499d-b34b-77af8eaa63a6.jpg','/img/hf_20261002_221532_f755f043-9413-4510-9df5-f59d25de3f4e.jpg'], 3, 5)
on conflict (slug) do nothing;
insert into public.product_variants (product_id, size, stock, sort_order)
select p.id, v.size, v.stock, v.ord from public.products p, (values ('S', 9, 0), ('M', 4, 1), ('L', 11, 2), ('XL', 6, 3)) as v(size, stock, ord)
where p.slug = 'tic-logo-tee-sky' on conflict (product_id, size) do nothing;

insert into public.products (slug, name, category, price_cents, color, material_de, material_en, weight_g, care_de, care_en, images, low_stock_threshold, sort_order)
values ('tic-wide-sweatpants', 'TIC Wide Sweatpants', 'pants', 5989, 'Schwarz', '100% Baumwolle', '100% cotton', 480, null, null, array['/img/hf_20261002_220416_8de4b1a1-78af-47aa-be60-e436cbc40d50.jpg','/img/hf_20261002_220416_3e03758a-e7be-4d1c-9713-2fe811df2cc5.jpg'], 3, 6)
on conflict (slug) do nothing;
insert into public.product_variants (product_id, size, stock, sort_order)
select p.id, v.size, v.stock, v.ord from public.products p, (values ('S', 7, 0), ('M', 10, 1), ('L', 6, 2), ('XL', 4, 3)) as v(size, stock, ord)
where p.slug = 'tic-wide-sweatpants' on conflict (product_id, size) do nothing;

insert into public.products (slug, name, category, price_cents, color, material_de, material_en, weight_g, care_de, care_en, images, low_stock_threshold, sort_order)
values ('tic-acid-wash-sweatpants-grau', 'TIC Acid Wash Sweatpants — Grau', 'pants', 6489, 'Grau', '100% Baumwolle', '100% cotton', 500, null, null, array['/img/hf_20261002_220416_e7a41872-3805-49a0-aa1f-7e34be6378da.jpg','/img/hf_20261002_220458_9144940b-455d-46bb-a4ec-7f9c862943d1.jpg'], 3, 7)
on conflict (slug) do nothing;
insert into public.product_variants (product_id, size, stock, sort_order)
select p.id, v.size, v.stock, v.ord from public.products p, (values ('S', 5, 0), ('M', 6, 1), ('L', 7, 2), ('XL', 3, 3)) as v(size, stock, ord)
where p.slug = 'tic-acid-wash-sweatpants-grau' on conflict (product_id, size) do nothing;

insert into public.products (slug, name, category, price_cents, color, material_de, material_en, weight_g, care_de, care_en, images, low_stock_threshold, sort_order)
values ('tic-sweatshorts', 'TIC Sweatshorts', 'shorts', 4489, 'Schwarz', '100% Baumwolle', '100% cotton', 300, null, null, array['/img/hf_20261002_220416_3689968a-9eca-48bd-aea2-a2e10bf4041c.jpg','/img/hf_20261002_220517_462b5907-3b48-4e89-8f01-1c2fc3587714.jpg'], 3, 8)
on conflict (slug) do nothing;
insert into public.product_variants (product_id, size, stock, sort_order)
select p.id, v.size, v.stock, v.ord from public.products p, (values ('S', 4, 0), ('M', 7, 1), ('L', 5, 2), ('XL', 0, 3)) as v(size, stock, ord)
where p.slug = 'tic-sweatshorts' on conflict (product_id, size) do nothing;
