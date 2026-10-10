import { useEffect, useState } from 'react';
import { profile } from '../content/profile';
import { CatMascot } from './CatMascot';
import { ColorWord } from './ColorWord';
import { LampCord } from './LampCord';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

// Which section is on screen: the last one whose top has scrolled above 40%
// of the viewport. Measured on scroll rather than with IntersectionObserver
// because the sections are lazy-loaded and may not exist yet when the nav
// mounts; reading two positions per frame costs nothing.
function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState('');
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) current = id;
      }
      setActive(current); // React skips the re-render when the value hasn't changed
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [ids.join()]);
  return active;
}

export function Nav() {
  const gutter = 'clamp(1rem, 4vw, 2rem)';
  const active = useActiveSection(profile.nav.map((item) => item.href.slice(1)));

  return (
    <header
      className="sticky top-0 z-40 border-b border-line bg-bg"
      // Keep content out from under a phone notch / rounded corners.
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* The four-colour stripe across the very top: the site's signature. */}
      <div aria-hidden="true" className="h-1" style={{ background: 'var(--stripe)' }} />
      <div
        className="page flex h-16 items-center justify-between gap-2"
        style={{ paddingLeft: `max(${gutter}, env(safe-area-inset-left))`, paddingRight: `max(${gutter}, env(safe-area-inset-right))` }}
      >
        <a href="#top" className="logo-link flex min-h-11 min-w-0 items-center gap-2.5 font-display text-[1.2rem] font-bold sm:text-xl">
          <Logo size={34} className="shrink-0" />
          <ColorWord text={profile.name} className="truncate" />
        </a>
        {/* Two toys for wider screens (on phones the bar needs the room): the
            cat, and a lamp whose cord switches the theme. */}
        <div className="hidden items-center gap-2 sm:flex">
          <CatMascot className="grid" />
          <LampCord />
        </div>
        {/* Two links fit at 320px, so no hamburger. */}
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          {profile.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={active === item.href.slice(1) ? 'true' : undefined}
              className="nav-link inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-muted transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
