'use client';

import { createClient } from '@/lib/supabase/client';

const BUCKET = 'product-images';
const MAX_EDGE = 1800;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type UploadError = 'type' | 'size' | 'failed';

/** Scales a photo down to at most MAX_EDGE px on the long side and re-encodes it as JPEG (phone photos are often 5+ MB). */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  // White background so transparent PNGs don't turn black as JPEG.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.85));
}

/** Uploads one product photo to Supabase Storage (owner only, enforced by storage RLS) and returns its public URL. */
export async function uploadProductImage(file: File): Promise<{ url: string } | { error: UploadError }> {
  if (!TYPES.includes(file.type)) return { error: 'type' };
  if (file.size > MAX_INPUT_BYTES) return { error: 'size' };
  try {
    const blob = await shrink(file);
    const supabase = createClient();
    const path = `products/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
    if (error) return { error: 'failed' };
    return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  } catch {
    return { error: 'failed' };
  }
}
