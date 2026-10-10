import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { m, useAnimationControls, useReducedMotion } from 'framer-motion';
import { BRAND } from './logoShape';

// A small 3D cat head that lives in the top bar. It is a real box of six
// faces (plus ears) seen in perspective, so it genuinely turns:
// - It follows the mouse with its head (mouse only; touch has no pointer to follow).
// - Hover or focus it and the eyes turn into happy arcs and the ears wiggle.
// - EASTER EGG: pet it (click) 7 times in a row, each within 1.5s of the last,
//   and it falls asleep with a "zzz" and a small message. Click once more to wake it.
//
// Built from CSS 3D (perspective, preserve-3d, translateZ), no 3D library.
// The look lives in the .cat-* rules in index.css. The fur is a fixed brand
// orange (like the logo) so the cat looks the same in both themes.

const FUR = BRAND[0];
const NOSE = BRAND[3];
const INK = '#0c0c0d';
const PETS_TO_SLEEP = 7;
const PET_WINDOW_MS = 1500; // pets must follow each other quickly, or the count starts over

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function CatMascot({ className = '' }: { className?: string }) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const button = useRef<HTMLButtonElement>(null);
  const head = useRef<HTMLSpanElement>(null);
  const pets = useRef(0);
  const petTimer = useRef(0);
  const bubbleTimer = useRef(0);
  const [asleep, setAsleep] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [status, setStatus] = useState('');

  // Turn the head toward the pointer. Like the other pointer effects it only
  // runs for a real mouse without reduced motion, and batches to one update
  // per frame, writing straight to CSS variables (no React re-render).
  useEffect(() => {
    const box = button.current;
    const el = head.current;
    if (!box || !el || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0;
    let px = 0;
    let py = 0;

    const apply = () => {
      raf = 0;
      const r = box.getBoundingClientRect();
      const dx = px - (r.left + r.width / 2);
      const dy = py - (r.top + r.height / 2);
      // Positive Y-rotation turns the face to the right; a NEGATIVE X-rotation tips it down.
      el.style.setProperty('--ry', `${clamp(dx * 0.12, -40, 40).toFixed(1)}deg`);
      el.style.setProperty('--rx', `${clamp(-dy * 0.1, -30, 25).toFixed(1)}deg`);
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    // Mouse left the window: look straight ahead again.
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced]);

  useEffect(
    () => () => {
      clearTimeout(petTimer.current);
      clearTimeout(bubbleTimer.current);
    },
    [],
  );

  // A little squash-and-stretch hop on every pet.
  const boing = () => {
    if (!reduced) controls.start({ scaleY: [1, 0.82, 1.1, 1], scaleX: [1, 1.1, 0.96, 1], transition: { duration: 0.35 } });
  };

  const onClick = () => {
    if (asleep) {
      setAsleep(false);
      setBubble(false);
      setStatus('The cat woke up.');
      boing();
      return;
    }
    pets.current += 1;
    clearTimeout(petTimer.current);
    if (pets.current >= PETS_TO_SLEEP) {
      pets.current = 0;
      setAsleep(true);
      setBubble(true);
      setStatus('You found the secret! The cat fell asleep. Click it to wake it up.');
      clearTimeout(bubbleTimer.current);
      bubbleTimer.current = window.setTimeout(() => setBubble(false), 3500);
      return;
    }
    boing();
    petTimer.current = window.setTimeout(() => (pets.current = 0), PET_WINDOW_MS);
  };

  return (
    <button
      ref={button}
      type="button"
      onClick={onClick}
      aria-label={asleep ? 'Wake the cat' : 'Pet the cat'}
      className={`cat-btn relative size-11 place-items-center rounded-full ${className}`}
      style={{ '--fur': FUR } as CSSProperties}
    >
      {/* Squash-and-stretch wrapper, separate from the head so the two
          transforms (hop, head turn) never fight over one element. */}
      <m.span animate={controls} className="cat-hop" style={{ transformOrigin: '50% 100%', transformStyle: 'preserve-3d' }}>
        <span ref={head} className="cat-head" data-asleep={asleep}>
          {/* Ears: one flat triangle each, with a pink inner triangle in front. */}
          <span className="cat-ear cat-ear-left">
            <i />
            <i className="cat-ear-inner" style={{ background: NOSE }} />
          </span>
          <span className="cat-ear cat-ear-right">
            <i />
            <i className="cat-ear-inner" style={{ background: NOSE }} />
          </span>

          <span className="cat-face cat-back" />
          <span className="cat-face cat-left" />
          <span className="cat-face cat-right" />
          <span className="cat-face cat-top" />
          <span className="cat-face cat-bottom" />
          <span className="cat-face cat-front">
            <svg viewBox="0 0 34 34" className="size-full" fill="none" strokeLinecap="round">
              {/* Forehead stripes */}
              <path d="M17 4.5v4M12 5.5v3M22 5.5v3" stroke="rgb(0 0 0 / 0.28)" strokeWidth="1.2" />
              {asleep ? (
                // Closed, sleepy eyes.
                <path d="M9 14.5q2.5 2.8 5 0M20 14.5q2.5 2.8 5 0" stroke={INK} strokeWidth="1.6" />
              ) : (
                <>
                  <g className="cat-eyes-open">
                    <ellipse cx="11.5" cy="15" rx="2.4" ry="3.2" fill={INK} />
                    <ellipse cx="22.5" cy="15" rx="2.4" ry="3.2" fill={INK} />
                    <circle cx="12.3" cy="13.8" r="0.8" fill="#fff" />
                    <circle cx="23.3" cy="13.8" r="0.8" fill="#fff" />
                  </g>
                  {/* Shown instead of the open eyes while hovered or focused. */}
                  <path className="cat-eyes-happy" d="M9 16q2.5-3.6 5 0M20 16q2.5-3.6 5 0" stroke={INK} strokeWidth="1.6" />
                </>
              )}
              <path d="M15 20.5h4l-2 2.4z" fill={NOSE} stroke={NOSE} strokeWidth="0.6" strokeLinejoin="round" />
              <path d="M17 23v1.3q-2 1.6-4 .4M17 24.3q2 1.6 4 .4" stroke={INK} strokeWidth="1" />
              {/* Whiskers */}
              <path d="M7 21.5l-6-1.2M7 24l-6 1.2M27 21.5l6-1.2M27 24l6 1.2" stroke={INK} strokeOpacity="0.5" strokeWidth="0.8" />
            </svg>
          </span>
        </span>
      </m.span>

      {asleep && (
        <span aria-hidden="true" className="cat-zzz">
          <span style={{ '--n': 0 } as CSSProperties}>z</span>
          <span style={{ '--n': 1 } as CSSProperties}>z</span>
          <span style={{ '--n': 2 } as CSSProperties}>z</span>
        </span>
      )}

      {/* The reward: a short, visible note for a few seconds. */}
      {bubble && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 text-small font-medium text-ink shadow-[var(--shadow)]"
        >
          You found the secret. Shh, it's asleep.
        </span>
      )}
      {/* Spoken equivalent of the above, for screen readers. */}
      <span role="status" className="sr-only">
        {status}
      </span>
    </button>
  );
}
