import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { animate, m, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { currentTheme, toggleTheme } from '../theme';

// A little hanging lamp in the top bar, beside the cat. Pull its cord (drag
// the knob down, or just click it) and the page switches between dark and
// light: lamp lit = light theme, lamp off = dark theme.
//
// EASTER EGG: pull it 5 times within 2.5 seconds and the page goes into
// "disco mode" for a few seconds: coloured lights sweep in from the corners
// and confetti pops at random (see Disco.tsx). It announces itself with a
// "disco" window event, and with the class html.disco (the waves speed up).
//
// It is a button, so the keyboard works too (Tab to it, then Enter or Space).
// The same switch also exists as the sun/moon button, so nothing depends on
// finding the lamp.

const PULLS_FOR_DISCO = 5;
const PULL_WINDOW_MS = 2500;
const DISCO_MS = 4500;
const PULL_DISTANCE = 10; // px the knob must travel down to count as a pull

export function LampCord({ className = '' }: { className?: string }) {
  const [lit, setLit] = useState(() => currentTheme() === 'light');
  const [bubble, setBubble] = useState(false);
  const [status, setStatus] = useState('');
  const reduced = useReducedMotion();
  const y = useMotionValue(0);
  const cordHeight = useTransform(y, (v) => 18 + v); // the cord lengthens as the knob goes down
  const pulls = useRef<number[]>([]);
  const discoTimer = useRef(0);

  // Stay in step when the theme is changed from the sun/moon button.
  useEffect(() => {
    const sync = () => setLit(currentTheme() === 'light');
    window.addEventListener('themechange', sync);
    return () => {
      window.removeEventListener('themechange', sync);
      clearTimeout(discoTimer.current);
      setDisco(false);
    };
  }, []);

  // Switch disco mode on or off: the class speeds up the waves, the event tells Disco.tsx to draw.
  const setDisco = (on: boolean) => {
    document.documentElement.classList.toggle('disco', on);
    window.dispatchEvent(new CustomEvent('disco', { detail: on }));
  };

  const pull = () => {
    const next = toggleTheme();
    setStatus(next === 'light' ? 'Lamp on. Light theme.' : 'Lamp off. Dark theme.');

    const now = Date.now();
    pulls.current = [...pulls.current.filter((t) => now - t < PULL_WINDOW_MS), now];
    if (pulls.current.length >= PULLS_FOR_DISCO) {
      pulls.current = [];
      setDisco(true);
      setBubble(true);
      setStatus(reduced ? 'You found the secret! The lights stay off because you prefer reduced motion.' : 'You found the secret! Disco mode.');
      clearTimeout(discoTimer.current);
      discoTimer.current = window.setTimeout(() => {
        setDisco(false);
        setBubble(false);
      }, DISCO_MS);
    }
  };

  // A quick tug, for clicks and key presses that don't drag the knob.
  const tug = () => animate(y, [0, 12, 0], { duration: 0.3 });

  // Mouse and touch go through onTap (so a drag is not also counted as a click).
  // Keyboard presses and screen-reader "activate" produce a click with no
  // pointer behind it (detail is 0), which is what this handles.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail !== 0) return;
    tug();
    pull();
  };

  return (
    <div className={`relative h-16 w-11 ${className}`}>
      <svg viewBox="0 0 44 64" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        {/* Light thrown down by the lit lamp. */}
        {lit && <path d="M14 30 H30 L41 62 H3 Z" fill="#ffd166" opacity="0.16" />}
        <path d="M22 0 V8" stroke="var(--muted)" strokeWidth="1.5" />
        <path d="M10 28 L15 8 H29 L34 28 Z" fill="#ff7a2f" />
        <ellipse cx="22" cy="29" rx="7" ry="3.5" fill={lit ? '#ffd166' : 'var(--muted)'} />
      </svg>

      {/* The cord hangs from the shade's right edge; its length follows the knob. */}
      <m.span aria-hidden="true" className="absolute left-[29px] top-[28px] w-[1.5px] bg-muted" style={{ height: cordHeight }} />

      {/* The knob is the button. It is 44px square so it is easy to grab; only the small dot is drawn. */}
      <m.button
        type="button"
        aria-label="Pull the lamp cord to switch between dark and light theme"
        onClick={onClick}
        onTap={() => {
          tug();
          pull();
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 18 }}
        dragElastic={0.2}
        dragSnapToOrigin
        onDragEnd={(_, info) => info.offset.y > PULL_DISTANCE && pull()}
        style={{ y }}
        className="absolute left-[7px] top-[26px] grid size-11 cursor-grab touch-none justify-items-center rounded-full active:cursor-grabbing"
      >
        <span aria-hidden="true" className="mt-4 size-3 rounded-full bg-rose shadow-[0_1px_0_rgb(0_0_0_/_0.3)]" />
      </m.button>

      {bubble && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[calc(100%+0.6rem)] z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 text-small font-medium text-ink shadow-[var(--shadow)]"
        >
          {reduced ? 'You found the secret. Lights off (reduced motion).' : 'You found the secret. Disco!'}
        </span>
      )}
      <span role="status" className="sr-only">
        {status}
      </span>
    </div>
  );
}
