import { useEffect, useRef, useState, type ReactNode } from 'react';
import { m, useInView, useReducedMotion } from 'framer-motion';

// Soft fade-up as content scrolls into view. It can never leave content
// stuck invisible: reduced motion renders a plain block, anything already on
// screen animates straight away, and a timeout reveals everything regardless
// if the observer never fires (print, odd embeds).
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' });
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setForced(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <m.div
      ref={ref}
      className={className}
      // Starts at 85% opacity, not 0: the content is never invisible, and text
      // keeps AA contrast at every moment of the animation (an audit or a
      // screenshot can catch it mid-fade). The rise does most of the work.
      initial={{ opacity: 0.85, y: 28 }}
      animate={inView || forced ? { opacity: 1, y: 0 } : undefined}
      transition={{ type: 'spring', stiffness: 120, damping: 16, delay }}
    >
      {children}
    </m.div>
  );
}
