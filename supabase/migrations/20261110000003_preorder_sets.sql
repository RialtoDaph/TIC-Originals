-- Pre-orders and sets.
-- preorder: sold before the goods are in stock; variant stock is the pre-order quota (e.g. the production run).
-- ships_from: expected shipping date, shown on the product, in the cart, at checkout and on the order.
-- set_name: products with the same set name are offered together ("Komplettes Set") on the product page.
alter table public.products
  add column if not exists preorder boolean not null default false,
  add column if not exists ships_from date,
  add column if not exists set_name text not null default '';
