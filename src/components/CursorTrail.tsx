import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

// A comet of four coloured dots that chase the mouse. Over anything
// clickable the pointer turns into a cat emoji; the rest of the trail keeps
// chasing it. The cat shrinks while the button is held.
//
// Design choices, so they can be explained:
// - On plain areas it ADDS to the normal cursor. Only over clickable things
//   is the arrow swapped for the cat (centred on the pointer's exact spot, so
//   aiming is unchanged). The cat is decorative, so nothing is lost.
// - It only runs for a real mouse/pen ("hover: hover" and "pointer: fine")
//   and not with prefers-reduced-motion. Touch screens never see it.
// - One requestAnimationFrame loop moves everything with transforms only
//   (no layout work), and the loop stops by itself once the dots catch up.

const COLORS = ['var(--teal)', 'var(--orange)', 'var(--gold)', 'var(--rose)'];
const SIZES = [11, 10, 9, 8]; // px: the tail shrinks
const FOLLOW = [0.42, 0.3, 0.24, 0.19]; // how fast each dot catches up with the one in front
const CAT_SIZE = 30; // px
const CLICKABLE = 'a, button, [role="button"], input, textarea, select, summary, li[tabindex]';

export function CursorTrail() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const cat = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setEnabled(!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, [reduced]);

  useEffect(() => {
    if (!enabled) return;
    const els = dots.current.filter(Boolean) as HTMLSpanElement[];
    const catEl = cat.current;
    if (!catEl) return;
    const root = document.documentElement;
    const xs = els.map(() => -100);
    const ys = els.map(() => -100);
    const pointer = { x: -100, y: -100 };
    let raf = 0;
    let visible = false;
    let hovering = false;
    let pressed = false;

    const draw = () => {
      els.forEach((el, i) => {
        // Position with the `translate` property, NOT `transform`. The browser
        // applies `scale` after `transform` but before `translate`, so a
        // transform-based position would get multiplied by the hover scale
        // (1.6x the coordinates throws the dots down and to the right).
        // With `translate`, the dot grows around its own centre, then moves.
        el.style.translate = `${xs[i] - SIZES[i] / 2}px ${ys[i] - SIZES[i] / 2}px`;
        el.style.scale = pressed ? '0.8' : '1';
        // While the cat is out, a dot is hidden whenever it sits under the cat
        // (the lead dot always, the tail when it has caught up), so only dots
        // that trail clearly behind it are visible.
        const underCat = hovering && Math.hypot(xs[i] - pointer.x, ys[i] - pointer.y) < CAT_SIZE * 0.7;
        el.style.opacity = !visible || underCat ? '0' : String(0.95 - i * 0.15);
      });
      // The cat is not delayed: it sits exactly on the pointer, like a cursor.
      catEl.style.translate = `${pointer.x - CAT_SIZE / 2}px ${pointer.y - CAT_SIZE / 2}px`;
      catEl.style.scale = pressed ? '0.8' : '1';
      catEl.style.opacity = visible && hovering ? '1' : '0';
      // Hide the arrow only while the cat is shown.
      root.classList.toggle('cat-cursor', visible && hovering);
    };

    const tick = () => {
      raf = 0;
      let moving = false;
      els.forEach((_, i) => {
        // The lead dot chases the pointer; each other dot chases the one in front.
        const target = i === 0 ? pointer : { x: xs[i - 1], y: ys[i - 1] };
        const dx = target.x - xs[i];
        const dy = target.y - ys[i];
        xs[i] += dx * FOLLOW[i];
        ys[i] += dy * FOLLOW[i];
        if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) moving = true;
      });
      draw();
      if (moving) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const show = (on: boolean) => {
      visible = on;
      draw();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!visible) {
        // First move: start everything at the pointer instead of flying in from the corner.
        xs.fill(pointer.x);
        ys.fill(pointer.y);
        show(true);
      }
      hovering = !!(e.target as Element | null)?.closest?.(CLICKABLE);
      // Read the live button state instead of trusting pointerdown/up alone: a
      // release outside the window, or a cancelled drag, would otherwise leave
      // the dots stuck in their pressed size.
      pressed = (e.buttons & 1) === 1;
      draw();
      start();
    };
    const onDown = () => ((pressed = true), draw(), start());
    const onUp = () => ((pressed = false), draw(), start());
    const onLeave = () => show(false);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('blur', onUp);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove('cat-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    // Decorative and click-through: hidden from assistive tech, never intercepts the pointer.
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {/* Painted back to front so the lead dot sits on top of the tail. */}
      {[...COLORS.keys()].reverse().map((i) => (
        <span
          key={i}
          ref={(el) => void (dots.current[i] = el)}
          className="absolute left-0 top-0 rounded-full opacity-0 transition-[scale,opacity] duration-200"
          style={{ width: SIZES[i], height: SIZES[i], background: COLORS[i] }}
        />
      ))}
      {/* The cat: shown only over clickable things. Emoji font fallbacks are
          the system's own, so it costs no download. */}
      <span
        ref={cat}
        className="absolute left-0 top-0 select-none leading-none opacity-0 transition-[scale,opacity] duration-150"
        style={{ fontSize: CAT_SIZE - 4, width: CAT_SIZE, height: CAT_SIZE, display: 'grid', placeItems: 'center' }}
      >
        🐱
      </span>
    </div>
  );
}
