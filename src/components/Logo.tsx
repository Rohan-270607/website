import { BACK_PEAK, BRAND, FRONT_FACE, GROUND, SUN } from './logoShape';

// The site's mark: a mountain with the sun behind it, in the four brand
// colours (orange, teal, gold, rose). Simple flat shapes on a 32-unit grid, so
// it stays crisp from 16px (favicon) up. Hovering the logo link lifts the sun
// (see .logo-sun in index.css).
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className={`logo-mark ${className}`}>
      <circle className="logo-sun" cx={SUN.cx} cy={SUN.cy} r={SUN.r} fill={BRAND[2]} />
      <path d={BACK_PEAK} fill={BRAND[1]} />
      <path d={FRONT_FACE} fill={BRAND[0]} />
      <path d={GROUND} fill={BRAND[3]} />
    </svg>
  );
}
