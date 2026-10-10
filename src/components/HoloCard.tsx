import { useState } from 'react';
import { m, useAnimationControls, useReducedMotion } from 'framer-motion';
import { profile } from '../content/profile';
import { BRAND } from './logoShape';
import { Tilt } from './Tilt';

// Your photo as a collectible trading card. A colourful foil sheen slides
// across the picture as the card tilts toward the mouse, and the name and
// caption strips sit slightly in front of the photo, so they shift against it
// like a real layered card. Pressing the photo wiggles the card and swaps the
// caption for another line from profile.photo.lines.
//
// All the 3D and foil styling is in the .holo-* rules in index.css; the tilt
// itself is the shared Tilt / useTilt pair. Touch screens get the card without
// the tilt (there is no hover), and reduced motion also stops the floating.

const TILT = -2; // degrees: just enough that the card feels placed, not pasted

// Pick a random line that is different from the one currently showing.
function pickOther(lines: string[], current: string): string {
  const options = lines.filter((l) => l !== current);
  return options[Math.floor(Math.random() * options.length)] ?? current;
}

export function HoloCard({ className = '' }: { className?: string }) {
  const { src, alt, cutout, width, height, label, lines } = profile.photo;
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const [caption, setCaption] = useState(label);

  const poke = () => {
    if (!reduced) controls.start({ rotate: [TILT, TILT - 3, TILT + 3, TILT - 1, TILT], transition: { duration: 0.5 } });
    setCaption((c) => pickOther(lines, c));
  };

  return (
    // Two nested elements because one element can't be driven by both the
    // pop-in (this wrapper) and the wiggle controls (the next one) at once.
    <m.div
      className={`w-[min(80vw,17rem)] lg:w-[16rem] ${className}`}
      // Scale only, no fade: the photo is the biggest thing on the page, so it
      // must be visible from the very first paint.
      initial={reduced ? false : { scale: 0.92 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <m.div animate={controls} style={{ rotate: TILT }}>
        <div className="holo-float">
          <Tilt max={14}>
            {/* Frame: the four-colour stripe as a card border. */}
            <div className="holo-frame">
              <div className="holo-inner relative flex flex-col gap-2 p-2.5">
                {/* The name is already the page's h1, so here it is decoration only. */}
                <div className="flex items-center justify-between gap-2 [transform:translateZ(22px)]">
                  <p aria-hidden="true" className="truncate font-display text-small font-bold">
                    {profile.name}
                  </p>
                  <span aria-hidden="true" className="flex shrink-0 gap-1">
                    {BRAND.map((c) => (
                      <span key={c} className="size-2 rounded-full" style={{ background: c }} />
                    ))}
                  </span>
                </div>

                {/* The art window. Its tinted backdrop shows through a transparent cutout. */}
                <button
                  type="button"
                  onClick={poke}
                  aria-label="My photo. Press it to see a different message."
                  className="holo-art relative block aspect-square overflow-hidden rounded-lg border border-line [transform:translateZ(10px)]"
                >
                  {/* fetchPriority: the largest image on the page, so fetch it first. */}
                  <img
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    decoding="async"
                    fetchPriority="high"
                    className={`size-full ${cutout ? 'object-contain object-bottom' : 'object-cover object-[50%_25%]'}`}
                  />
                  <span aria-hidden="true" className="holo-foil" />
                </button>

                {/* The wrapper is a size container, so the caption can size its text from
                    the strip's own width (cqw units): even the longest line stays on one
                    row. aria-live announces a new line to screen readers when it changes. */}
                <div className="[container-type:inline-size] [transform:translateZ(22px)]">
                  <p
                    aria-live="polite"
                    className="flex items-center gap-1.5 rounded-lg bg-bg px-2 py-1.5 font-medium"
                    style={{ fontSize: 'clamp(11px, 5cqw, 12.5px)' }}
                  >
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
                    <span className="truncate">{caption}</span>
                  </p>
                </div>
                <span aria-hidden="true" className="glare" />
              </div>
            </div>
          </Tilt>
        </div>
      </m.div>
    </m.div>
  );
}
