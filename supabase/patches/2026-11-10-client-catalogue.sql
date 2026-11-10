-- Client feedback 10.11.2026 (John). Run on production AFTER the matching code is deployed:
-- the old storefront only knows the fine categories, so 'tops'/'bottoms' would empty its nav.
-- Slugs stay unchanged so existing links and orders keep working.
begin;

-- Only two categories.
update public.products set category = 'tops'
 where category in ('hoodies', 'sweater', 'sweaters', 't-shirts', 'sweatsuits');
update public.products set category = 'bottoms'
 where category in ('pants', 'shorts', 'skirts');

-- Rename the Drop 002 set: TC Camo Sweater → Chosen1 Crewneck, Chosen Sweatpants → Chosen1 Pants.
update public.products set
  name = replace(name, 'TC Camo Sweater', 'Chosen1 Crewneck'),
  model = 'Chosen1 Crewneck',
  set_name = replace(set_name, 'Camo Set', 'Chosen1 Set'),
  description_de = replace(description_de, 'Chosen Sweatpants', 'Chosen1 Pants'),
  description_en = replace(description_en, 'Chosen Sweatpants', 'Chosen1 Pants')
 where model = 'TC Camo Sweater';
update public.products set
  name = replace(name, 'Chosen Sweatpants', 'Chosen1 Pants'),
  model = 'Chosen1 Pants',
  set_name = replace(set_name, 'Camo Set', 'Chosen1 Set'),
  description_de = replace(description_de, 'TC Camo Sweater', 'Chosen1 Crewneck'),
  description_en = replace(description_en, 'TC Camo Sweater', 'Chosen1 Crewneck')
 where model = 'Chosen Sweatpants';

-- No skirt and no crop top: hide them (not "coming soon").
update public.products set visible = false where slug in ('pleated-skirt-rose', 'tc-crop-tee-weiss');

commit;
