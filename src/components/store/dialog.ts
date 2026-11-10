'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type Lenis from 'lenis';

/*
 * Shared behaviour for the storefront's overlays (cart drawer, discount popup):
 * the page behind stops scrolling (Lenis and native), keyboard focus stays inside,
 * Escape closes, and focus returns to whatever opened the overlay.
 */

let lenis: Lenis | null = null;
let locks = 0;

/** Called by <Motion> when smooth scrolling starts/stops. */
export function registerLenis(l: Lenis | null) {
  lenis = l;
  if (l && locks > 0) l.stop();
}

/** Re-syncs Lenis with the real scroll position (after a route change), unless an overlay holds it. */
export function resyncLenis() {
  if (!lenis || locks > 0) return;
  lenis.stop();
  lenis.start();
}

function lockScroll() {
  if (locks++ > 0) return;
  const html = document.documentElement;
  // Keep the layout from shifting when the scrollbar disappears.
  const gap = window.innerWidth - html.clientWidth;
  html.style.overflow = 'hidden';
  if (gap > 0) html.style.paddingRight = gap + 'px';
  lenis?.stop();
}

function unlockScroll() {
  if (locks === 0 || --locks > 0) return;
  const html = document.documentElement;
  html.style.overflow = '';
  html.style.paddingRight = '';
  lenis?.start();
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** While `open`: scroll lock, focus trap, Escape → onClose, focus restored afterwards. */
export function useDialog(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const opener = document.activeElement as HTMLElement | null;
    lockScroll();

    const focusables = () => [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? el).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) {
        e.preventDefault();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !el.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !el.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, ref]);
}
