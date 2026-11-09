-- Products with the same model are colour variants of one design: the shop shows one card per model
-- and the product page links the colours. Empty = standalone product.
alter table public.products add column if not exists model text not null default '';
