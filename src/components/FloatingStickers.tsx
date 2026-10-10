import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { animate, m, useMotionValue, useReducedMotion } from 'framer-motion';
import type { IconType } from 'react-icons';
import { FaGraduationCap, FaHeadphones, FaHammer, FaLocationDot, FaPuzzlePiece, FaWandMagicSparkles } from 'react-icons/fa6';
import { profile, type Fact, type FactIcon } from '../content/profile';

const icons: Record<FactIcon, IconType> = {
  place: FaLocationDot,
  study: FaGraduationCap,
  hobby: FaPuzzlePiece,
  build: FaHammer,
  music: FaHeadphones,
  fun: FaWandMagicSparkles,
};

// Hand-placed spots around the card (desktop only), as percentages of the
// stage, plus each sticker's tilt. On phones these are ignored and the
// stickers wrap into a tidy cluster below the card instead.
const spots = [
  { left: '5%', top: '2%', tilt: -2.5 },
  { left: '71%', top: '0%', tilt: 2 },
  { left: '1%', top: '38%', tilt: 2 },
  { left: '73%', top: '36%', tilt: -2 },
  { left: '11%', top: '72%', tilt: 2.5 },
  { left: '65%', top: '70%', tilt: -2 },
];

type Command = { type: 'shuffle' | 'reset'; n: number };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
let topZ = 10; // each grabbed sticker goes to the front, like picking one up off the pile

function StickerItem({ fact, index, stageRef, command, coarse }: { fact: Fact; index: number; stageRef: RefObject<HTMLDivElement | null>; command: Command; coarse: boolean }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLLIElement>(null);
  // x and y are the sticker's offset from its resting spot. Drag writes to
  // them, and shuffle / reset / arrow keys animate them with a spring.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spot = spots[index % spots.length];
  const Icon = icons[fact.icon];

  // Where the sticker is heading. Arrow keys build on this rather than on the
  // in-flight x/y, otherwise two quick key presses would cancel each other out.
  const goal = useRef({ x: 0, y: 0 });

  const moveTo = (nx: number, ny: number) => {
    goal.current = { x: nx, y: ny };
    const transition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 120, damping: 13 };
    animate(x, nx, transition);
    animate(y, ny, transition);
  };

  // React to the Shuffle / Reset buttons (the parent bumps command.n).
  useEffect(() => {
    const el = ref.current;
    const stage = stageRef.current;
    if (!command.n || !el || !stage) return;
    if (command.type === 'reset') return moveTo(0, 0);
    // A random spot fully inside the stage, converted to an offset from the resting spot.
    const rx = Math.random() * (stage.clientWidth - el.offsetWidth);
    const ry = Math.random() * (stage.clientHeight - el.offsetHeight);
    moveTo(rx - el.offsetLeft, ry - el.offsetTop);
  }, [command]);

  // Keyboard alternative to dragging: arrows nudge, Shift+arrows nudge further.
  // The move is clamped so the sticker can't leave the stage.
  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    const step = e.shiftKey ? 64 : 16;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    const el = ref.current;
    const stage = stageRef.current;
    if (!delta || !el || !stage) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    // r is where the sticker is drawn *now*; the clamp limits are measured from there,
    // so convert them to limits on the offset from the goal.
    const dx = clamp(delta[0], s.left - r.left - (goal.current.x - x.get()), s.right - r.right - (goal.current.x - x.get()));
    const dy = clamp(delta[1], s.top - r.top - (goal.current.y - y.get()), s.bottom - r.bottom - (goal.current.y - y.get()));
    moveTo(goal.current.x + dx, goal.current.y + dy);
  };

  return (
    <m.li
      ref={ref}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={() => ref.current && (ref.current.style.zIndex = String(++topZ))}
      aria-label={`${fact.label}: ${fact.value}. Drag me, or use the arrow keys to move me.`}
      // Touch screens: sideways only. Framer then leaves vertical swipes to the
      // browser, so a finger that lands on a card still scrolls the page.
      drag={coarse ? 'x' : true}
      dragConstraints={stageRef}
      dragElastic={0.2}
      dragTransition={{ power: 0.25, timeConstant: 300, bounceStiffness: 300, bounceDamping: 22 }}
      // After a drag (and its fling) settles, remember where the sticker ended up.
      onDragTransitionEnd={() => (goal.current = { x: x.get(), y: y.get() })}
      style={{ x, y, '--l': spot.left, '--t': spot.top } as unknown as CSSProperties}
      // This outer element ONLY moves (drag). Pop-in, tilt and hover scale live
      // on the inner element below: if the draggable itself starts at scale 0,
      // Framer measures its drag boundary from that zero-size box and lets the
      // sticker escape the stage by half its width.
      className="max-w-[15rem] cursor-grab rounded-2xl active:cursor-grabbing lg:absolute lg:left-[var(--l)] lg:top-[var(--t)] lg:w-max lg:max-w-[15.5rem]"
    >
      <m.div
        // Pop in with a staggered spring. With reduced motion it is simply there.
        initial={reduced ? { rotate: spot.tilt } : { scale: 0.85, rotate: spot.tilt - 6, opacity: 0 }}
        animate={{ scale: 1, rotate: spot.tilt, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20, delay: reduced ? 0 : 0.25 + index * 0.08 }}
        className="sticker flex items-center gap-3 px-4 py-3 transition-[scale] hover:scale-[1.03] active:scale-[1.05]"
        style={{ '--c': `var(--${fact.color})` } as CSSProperties}
      >
        {/* The icon takes the card's hue; everything else stays neutral. */}
        <Icon aria-hidden="true" className="shrink-0 text-xl" style={{ color: 'var(--c)' }} />
        <span className="block leading-tight">
          <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{fact.label}</span>
          <span className="mt-0.5 block break-words font-semibold">{fact.value}</span>
        </span>
      </m.div>
    </m.li>
  );
}

// The card (children) sits in the middle of a "stage"; the stickers are
// scattered around it. The stage is also the drag boundary, which is what
// keeps every sticker on screen.
export function FloatingStickers({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [command, setCommand] = useState<Command>({ type: 'reset', n: 0 });
  const [status, setStatus] = useState('');
  // A finger rather than a mouse (phones, tablets). Read once: it doesn't change mid-visit.
  const [coarse] = useState(() => window.matchMedia('(pointer: coarse)').matches);

  const send = (type: Command['type']) => {
    setCommand((c) => ({ type, n: c.n + 1 }));
    setStatus(type === 'shuffle' ? 'Cards shuffled.' : 'Cards reset.');
  };

  return (
    <div className="mt-14 lg:mt-12">
      {/* Fixed stage height on desktop keeps the whole hero (headline, card,
          stickers, dock) inside a 800px-tall window without scrolling. */}
      <div ref={stageRef} className="relative flex flex-col items-center gap-8 lg:block lg:h-[24.5rem]">
        <div className="lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">{children}</div>
        {/* On phones: a wrapped cluster. On desktop `lg:contents` dissolves
            this box so each sticker is positioned against the stage itself. */}
        <ul className="flex flex-wrap justify-center gap-3 lg:contents" aria-label="Facts about me, as draggable cards">
          {profile.facts.map((fact, i) => (
            <StickerItem key={fact.label} fact={fact} index={i} stageRef={stageRef} command={command} coarse={coarse} />
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => send('shuffle')} className="btn btn-primary">
            Shuffle cards
          </button>
          <button type="button" onClick={() => send('reset')} className="btn btn-secondary">
            Reset layout
          </button>
          {/* Kept short so buttons, tip and social dock share one row on desktop. */}
          <p className="basis-full text-small text-muted lg:basis-auto">
            {coarse ? 'Tip: swipe a card sideways to fling it.' : 'Tip: drag the cards, or Tab + arrow keys.'}
          </p>
        </div>
        {actions}
      </div>
      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  );
}
