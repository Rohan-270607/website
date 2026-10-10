import { useEffect, useState } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa6';
import { currentTheme, toggleTheme } from '../theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme);
  const next = theme === 'dark' ? 'light' : 'dark';

  // The lamp cord can change the theme too, so follow the shared event
  // instead of trusting only our own clicks.
  useEffect(() => {
    const sync = () => setTheme(currentTheme());
    window.addEventListener('themechange', sync);
    return () => window.removeEventListener('themechange', sync);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      className="grid size-11 place-items-center rounded-full border border-line bg-surface text-base text-ink transition-colors hover:border-muted"
    >
      {theme === 'dark' ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
    </button>
  );
}
