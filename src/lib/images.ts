// All storefront imagery goes through here (Drop 002 lookbook photos; the hero is a video):
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
  heroVideo: '/video/hero.mp4',
  heroVideoMobile: '/video/hero-mobile.mp4',
  discountPopup: '/img/products/drop002/look-weiss-01.jpg',
  accountSide: '/img/products/drop002/drop002-duo-02.jpg',
  /** Drop 002 editorial on the home page. */
  lookbook: {
    lead: '/img/products/drop002/drop002-duo-01.jpg',
    side: '/img/products/drop002/look-mural-02.jpg',
    detail: '/img/products/drop002/set-grau-detail.jpg',
    strip: ['/img/products/drop002/look-duo-05.jpg', '/img/products/drop002/set-weiss-02.jpg', '/img/products/drop002/look-duo-04.jpg', '/img/products/drop002/look-cafe-02.jpg'],
  },
  categories: {
    tops: '/img/products/drop002/set-grau-01.jpg',
    bottoms: '/img/products/drop002/pants-grau-01.jpg',
  } as Record<string, string>,
  gallery: [
    '/img/products/drop002/look-mural-01.jpg',
    '/img/products/drop002/look-duo-03.jpg',
    '/img/products/drop002/set-weiss-01.jpg',
    '/img/products/drop002/look-cafe-01.jpg',
    '/img/products/drop002/look-duo-06.jpg',
    '/img/products/drop002/look-tank-02.jpg',
    '/img/products/drop002/look-duo-07.jpg',
    '/img/products/drop002/look-grau-street.jpg',
  ],
};
