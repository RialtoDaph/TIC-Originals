// All storefront imagery goes through here so placeholders can be swapped for real photography:
// either replace the files in /public/img, change the paths below / on the product, or point
// NEXT_PUBLIC_IMAGE_BASE_URL at a CDN or Supabase Storage bucket that mirrors the same paths.

const base = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL || '').replace(/\/$/, '');

export function img(path: string | null | undefined): string {
  if (!path) return PLACEHOLDER;
  if (/^https?:\/\//.test(path)) return path;
  return base + (path.startsWith('/') ? path : '/' + path);
}

const PLACEHOLDER = '/img/hf_20261002_221632_5de61919-3487-471c-98da-f50f80165bf1.jpg';

/** Site imagery that isn't tied to a product (placeholders from the design handoff). */
export const SITE_IMAGES = {
  hero: '/img/hf_20261002_221632_5de61919-3487-471c-98da-f50f80165bf1.jpg',
  discountPopup: '/img/hf_20261002_221633_fe6973c9-e7dc-4616-9e89-50fcfbc41950.jpg',
  accountSide: '/img/hf_20261002_221532_446455cc-7ecc-4704-83c4-1f805f60b942.jpg',
  categories: {
    hoodies: '/img/hf_20261002_221633_fe6973c9-e7dc-4616-9e89-50fcfbc41950.jpg',
    sweatsuits: '/img/hf_20261002_221532_446455cc-7ecc-4704-83c4-1f805f60b942.jpg',
    't-shirts': '/img/hf_20261002_220517_3aab5855-7397-443f-9e2c-ee014634c6fb.jpg',
    pants: '/img/hf_20261002_220517_f90bd2e4-f4e3-439e-9e06-2782876f9653.jpg',
    shorts: '/img/hf_20261002_220517_85ea51c2-2c00-4308-b34b-5fd53b3b6fb3.jpg',
  } as Record<string, string>,
  gallery: [
    '/img/hf_20261002_221632_a439c645-049e-467c-87d4-3d1681e7f9d2.jpg',
    '/img/hf_20261002_221532_111db963-91e5-4f8a-b04a-f64506823f60.jpg',
    '/img/hf_20261002_221532_2eafc4e6-ab04-4246-8d37-5433d30bf223.jpg',
    '/img/hf_20261002_220517_082f8afe-4dc7-4949-90e3-64da97e3e8eb.jpg',
    '/img/hf_20261002_220517_fe64d566-1bc1-4485-b89c-76097138b52b.jpg',
    '/img/hf_20261002_221632_5de61919-3487-471c-98da-f50f80165bf1.jpg',
  ],
};
