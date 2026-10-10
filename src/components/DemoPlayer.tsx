import { useState } from 'react';
import { FaPause, FaPlay } from 'react-icons/fa6';
import type { Project } from '../content/profile';

// A short demo clip inside a project tile.
//
// It shows a still picture first and only starts the clip when the visitor
// presses Play. That is deliberate:
// - A 10-second GIF is several megabytes. Because it is not requested until
//   Play is pressed, it cannot slow the page down.
// - A GIF can't be paused, and moving content that lasts over 5 seconds must
//   be stoppable (WCAG 2.2.2). Swapping back to the still picture is the stop.
// - It works the same for people who prefer reduced motion: nothing moves
//   until they ask for it.
//
// Accepts a .gif (shown as an image) or an .mp4 / .webm (a muted looping video,
// usually 10x smaller than the same GIF).

type Demo = NonNullable<Project['demo']>;

export function DemoPlayer({ demo, title }: { demo: Demo; title: string }) {
  const [playing, setPlaying] = useState(false);
  const hasClip = demo.src !== '';
  const isVideo = /\.(mp4|webm)$/i.test(demo.src);
  const media = 'absolute inset-0 size-full object-cover';

  return (
    <div className="relative mb-5 aspect-video overflow-hidden rounded-lg border border-line bg-bg">
      {playing && hasClip ? (
        isVideo ? (
          <video src={demo.src} aria-label={demo.alt} autoPlay loop muted playsInline className={media} />
        ) : (
          <img src={demo.src} alt={demo.alt} className={media} />
        )
      ) : demo.poster ? (
        <img src={demo.poster} alt={demo.alt} loading="lazy" decoding="async" className={media} />
      ) : (
        // Obvious placeholder until you add your own files.
        <p className="grid size-full place-items-center p-4 text-center text-small text-muted">
          {hasClip ? '[Still picture: set demo.poster]' : '[10-second demo: put your file in public/demos/ and set demo.src]'}
        </p>
      )}

      {hasClip && (
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="btn btn-primary absolute bottom-3 left-3 !min-h-11 !px-4 text-small shadow-[var(--shadow)]"
        >
          {playing ? <FaPause aria-hidden="true" className="text-xs" /> : <FaPlay aria-hidden="true" className="text-xs" />}
          {playing ? 'Stop' : 'Play demo'}
          <span className="sr-only"> of {title}</span>
        </button>
      )}
    </div>
  );
}
