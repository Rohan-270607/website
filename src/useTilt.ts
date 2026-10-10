import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

// Pointer-driven 3D tilt. While the mouse is over the element this writes
// four CSS variables on it, and CSS (.tilt3d in index.css) turns
// them into a rotation in 3D space:
//   --rx / --ry  rotation around the X / Y axis, up to `max` degrees
//   --gx / --gy  pointer position in % (used to place the light glare)
// Only for a real mouse (touch has no hover) and never with reduced motion.
// Updates are batched to one per animation frame, and nothing re-renders
// React: the values go straight onto the element's style.
export function useTilt<T extends HTMLElement>(max = 8) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0;
    let px = 0;
    let py = 0;

    const apply = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const x = (px - r.left) / r.width; // 0 at the left edge, 1 at the right
      const y = (py - r.top) / r.height;
      el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    // Settle back flat; the CSS transition makes the return smooth.
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced, max]);

  return ref;
}
