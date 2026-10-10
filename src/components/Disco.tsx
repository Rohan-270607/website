import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BRAND } from './logoShape';

// Disco mode, the lamp-cord easter egg (see LampCord.tsx, which announces it
// with a "disco" window event: detail true to start, false to stop).
// - Four coloured beams sweep in from the corners of the screen, like stage lights.
// - Confetti pops at random spots, drawn on a canvas.
// Both sit on top of the page but never catch the mouse. With
// prefers-reduced-motion none of this is shown.
//
// Why a canvas for the confetti: a burst is a few dozen tiny pieces that all
// move every frame. One canvas redraws them in a single pass, where that many
// DOM elements would each need their own layout and paint.

// Each beam is a long thin triangle pinned to a corner that swings back and
// forth over the screen. --from / --to are the angles it swings between
// (0deg points right, angles grow clockwise); --d is how long one swing takes.
const BEAMS = [
  { x: '0%', y: '0%', hue: '--orange', from: '5deg', to: '85deg', d: '2.1s' },
  { x: '100%', y: '0%', hue: '--teal', from: '95deg', to: '175deg', d: '2.6s' },
  { x: '100%', y: '100%', hue: '--gold', from: '185deg', to: '265deg', d: '2.3s' },
  { x: '0%', y: '100%', hue: '--rose', from: '-85deg', to: '-5deg', d: '2.8s' },
];

const COLORS = [...BRAND, '#f3f2ee'];
const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  age: number;
  life: number; // frames until it has faded away
}

// The canvas and its animation loop. While `spawning` is true it keeps
// popping new bursts; when that turns false it lets the last pieces fall,
// then calls onDone so the canvas can be removed.
function Confetti({ spawning, onDone }: { spawning: boolean; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const spawn = useRef(spawning);
  spawn.current = spawning;

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // sharp on retina, without drawing 4x the pixels
    const resize = () => {
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const pieces: Piece[] = [];
    let raf = 0;
    let timer = 0;

    // One burst: pieces shoot upward in a wide fan, then gravity pulls them down.
    const burst = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
        const speed = rand(4, 11);
        pieces.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rot: rand(0, Math.PI * 2),
          vr: rand(-0.3, 0.3),
          w: rand(6, 10),
          h: rand(3, 6),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          age: 0,
          life: rand(70, 110),
        });
      }
    };

    // Random pops at random moments, so it never feels like a loop.
    const pop = () => {
      if (!spawn.current) return;
      burst(rand(0.1, 0.9) * window.innerWidth, rand(0.25, 0.7) * window.innerHeight, 26);
      timer = window.setTimeout(pop, rand(250, 550));
    };
    burst(window.innerWidth * 0.25, window.innerHeight * 0.55, 30); // an opening salvo
    burst(window.innerWidth * 0.75, window.innerHeight * 0.55, 30);
    pop();

    const frame = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.vy += 0.28; // gravity
        p.vx *= 0.985; // air drag
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.age++;
        if (p.age > p.life || p.y > window.innerHeight + 20) {
          pieces.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.min(1, (p.life - p.age) / 25); // fade out at the end
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (!spawn.current && pieces.length === 0) {
        onDone();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
    };
    // onDone is a stable state setter wrapper; the loop must start once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[56] size-full" />;
}

export function Disco() {
  const reduced = useReducedMotion();
  const [on, setOn] = useState(false); // lights on and confetti popping
  const [active, setActive] = useState(false); // canvas mounted (stays until the last confetti lands)
  const [run, setRun] = useState(0); // a new value restarts the confetti cleanly

  useEffect(() => {
    const onDisco = (e: Event) => {
      const start = (e as CustomEvent<boolean>).detail;
      setOn(start);
      if (start) {
        setActive(true);
        setRun((r) => r + 1);
      }
    };
    window.addEventListener('disco', onDisco);
    return () => window.removeEventListener('disco', onDisco);
  }, []);

  if (reduced) return null;

  return (
    <>
      {on && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
          {BEAMS.map((b) => (
            <div
              key={b.hue}
              className="disco-beam"
              style={{ '--x': b.x, '--y': b.y, '--beam': `var(${b.hue})`, '--from': b.from, '--to': b.to, '--d': b.d } as React.CSSProperties}
            />
          ))}
        </div>
      )}
      {active && <Confetti key={run} spawning={on} onDone={() => setActive(false)} />}
    </>
  );
}
