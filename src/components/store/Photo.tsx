'use client';

import Image from 'next/image';
import { img } from '@/lib/images';

// Hosts next/image may optimise (must match images.remotePatterns in next.config.ts).
const hostOf = (u: string | undefined) => {
  try {
    return u ? new URL(u).host : null;
  } catch {
    return null;
  }
};
const OPTIMISED_HOSTS = new Set([hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL), hostOf(process.env.NEXT_PUBLIC_IMAGE_BASE_URL)].filter(Boolean));

/**
 * A storefront photo that fills its (position: relative) box: resized and converted to AVIF/WebP
 * per screen width instead of shipping the 1200 px JPEG everywhere. Photos from hosts that aren't
 * configured for optimisation are passed through unchanged.
 */
export function Photo({
  src,
  alt,
  sizes,
  className,
  style,
  preload = false,
  width,
  height,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  style?: React.CSSProperties;
  preload?: boolean;
  /** Fixed size (thumbnails) instead of filling the parent box. */
  width?: number;
  height?: number;
}) {
  const url = img(src);
  const host = hostOf(url);
  return (
    <Image
      src={url}
      alt={alt}
      {...(width && height ? { width, height } : { fill: true })}
      sizes={sizes}
      quality={75}
      className={className}
      style={style}
      preload={preload}
      unoptimized={!!host && !OPTIMISED_HOSTS.has(host)}
    />
  );
}
