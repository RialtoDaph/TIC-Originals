'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { registerLenis, resyncLenis } from './dialog';

/**
 * Storefront motion, mounted once in the store layout:
 * - inertial smooth scrolling on desktop pointers (touch keeps native scrolling)
 * - scroll reveals: any element with `data-reveal` fades/slides in the first time it enters the
 *   viewport. Elements already on screen when they appear are shown immediately, so nothing
 *   above the fold flashes, and without JS everything simply stays visible.
 * - the page fade-in plays on client-side navigation only, never on the first load (it would
 *   delay the largest paint)
 * All of it is skipped when the visitor prefers reduced motion.
 */
export function Motion() {
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPath.current) return;
    document.documentElement.classList.add('tic-nav');
    // Drop any momentum left over from the previous page so Lenis follows the router's scroll.
    resyncLenis();
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Smooth scroll: fine pointers only; scroll containers opt out with data-lenis-prevent.
    let lenis: Lenis | null = null;
    let raf = 0;
    if (window.matchMedia('(pointer: fine)').matches) {
      lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) });
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      document.documentElement.classList.add('tic-smooth');
      registerLenis(lenis);
    }

    // In-page anchors (e.g. "Shop now" → #shop) glide instead of jumping.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      const id = a?.getAttribute('href')?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!lenis || !target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -24 });
    };
    document.addEventListener('click', onClick);

    // Scroll reveals.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute('data-rv', 'in');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const arm = (el: Element) => {
      const state = el.getAttribute('data-rv');
      if (state === 'in') return;
      if (state === 'armed') {
        // Armed by an earlier run of this effect (React re-runs effects in development).
        io.observe(el);
        return;
      }
      const r = el.getBoundingClientRect();
      // State lives in data-rv, not className, so it never conflicts with React's own props.
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
        el.setAttribute('data-rv', 'in');
        return;
      }
      el.setAttribute('data-rv', 'armed');
      io.observe(el);
    };
    const scan = (root: ParentNode) => root.querySelectorAll('[data-reveal]').forEach(arm);
    scan(document);
    // Client-side navigation and lazily rendered sections add new elements later.
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && (n.matches('[data-reveal]') ? arm(n) : scan(n)));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('click', onClick);
      registerLenis(null);
      lenis?.destroy();
      document.documentElement.classList.remove('tic-smooth');
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
