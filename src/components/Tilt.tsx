import type { ReactNode } from 'react';
import { useTilt } from '../useTilt';

// Wraps anything in a box that tilts in 3D toward the mouse (see useTilt and
// .tilt3d in index.css). Children can sit at different depths with a
// translateZ(...) of their own, which makes them parallax as it tilts.
export function Tilt({ children, max = 8, className = '' }: { children: ReactNode; max?: number; className?: string }) {
  const ref = useTilt<HTMLDivElement>(max);
  return (
    <div ref={ref} className={`tilt3d ${className}`}>
      {children}
    </div>
  );
}
