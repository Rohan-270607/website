import { useState } from 'react';

// Thick, curvy ribbons of colour that sweep slowly across the page behind the
// content: they slide in from one side, cross the screen and slide out the
// other, forever. Each load draws a fresh random set.
//
// Design choices, so they can be explained:
// - Each ribbon is ONE stroked SVG path (a sine curve with a very thick,
//   round-capped line). It is drawn once and then only moved with the CSS
//   `translate` property, which the browser animates on the graphics card
//   without repainting. Five ribbons cost almost nothing.
// - The colours are solid, not see-through: each hue is mixed into the page
//   background (see --wave-mix in tokens.css). That keeps them clearly on
//   theme while leaving the text that sits on top at a contrast of 4.9:1 or
//   better in both themes. A brighter wave would make headlines unreadable.
// - The SVG is `overflow-visible`: the thick line and its rounded ends are
//   wider than the drawing box, and the default (clip to the box) cut them off
//   in straight edges. The fixed layer below still clips at the screen edge.
// - The layer is fixed, clipped to the screen (so it can never cause
//   sideways scrolling), click-through and hidden from assistive tech.
// - With prefers-reduced-motion the ribbons stop and stay where they are.

const HUES = ['--orange', '--teal', '--gold', '--rose'];
const W = 1600; // ribbon length in px (the SVG is drawn 1:1 with the screen)
const H = 420; // ribbon box height; the curve is centred in it

const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface Wave {
  d: string; // the curve
  hue: string;
  thickness: number;
  top: number; // vh: where the ribbon sits down the screen
  duration: number; // s: time to cross the screen
  delay: number; // s: negative, so the page starts mid-sweep instead of empty
  reverse: boolean; // some travel right to left
}

// A sine curve built from quadratic segments: "Q" bends towards a control
// point, and each "T" repeats the bend mirrored, so the line wiggles up and down.
function makeCurve(): string {
  const segment = rand(150, 320); // wavelength / 2
  const bend = rand(60, 200); // how far the control point sits off the centre line
  const mid = H / 2;
  let d = `M0 ${mid} Q${segment / 2} ${mid - bend} ${segment} ${mid}`;
  for (let x = segment * 2; x < W + segment; x += segment) d += ` T${x} ${mid}`;
  return d;
}

function makeWaves(count: number): Wave[] {
  // Shuffle the four hues, then deal them out so neighbours rarely match.
  const hues = [...HUES].sort(() => Math.random() - 0.5);
  return Array.from({ length: count }, (_, i) => {
    const duration = rand(50, 90);
    return {
      d: makeCurve(),
      hue: hues[i % hues.length],
      thickness: rand(70, 140),
      top: rand(2, 98),
      duration,
      delay: -rand(0, duration),
      reverse: Math.random() < 0.5,
    };
  });
}

export function Waves() {
  // Random once per page load, not on every re-render.
  const [waves] = useState(() => makeWaves(5));

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {waves.map((w, i) => (
        <svg
          key={i}
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="wave absolute left-0 overflow-visible"
          style={
            {
              top: `calc(${w.top}vh - ${H / 2}px)`,
              '--d': `${w.duration}s`,
              '--delay': `${w.delay}s`,
              '--dir': w.reverse ? 'reverse' : 'normal',
            } as React.CSSProperties
          }
        >
          <path
            d={w.d}
            fill="none"
            stroke={`color-mix(in srgb, var(${w.hue}) var(--wave-mix), var(--bg))`}
            strokeWidth={w.thickness}
            strokeLinecap="round"
          />
        </svg>
      ))}
    </div>
  );
}
