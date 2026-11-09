'use client';

import { useEffect, useRef } from 'react';

/**
 * Moves the element vertically by `speed` × its distance from the viewport centre while it is on
 * screen (one rAF per frame, transform only). speed 0.15 = drifts 15 % slower than the page.
 * Off for reduced motion and on touch screens, where it tends to feel jittery.
 */
export function useParallax<T extends HTMLElement>(speed: number) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) onScroll();
    });
    io.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      el.style.transform = '';
    };
  }, [speed]);
  return ref;
}
