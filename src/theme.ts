// The theme lives on <html data-theme="...">: the inline script in index.html
// puts the saved choice there before first paint, and the CSS reads it. This
// file is the one place that changes it, so the nav's toggle button and the
// lamp cord stay in step: whoever flips the theme announces it with a
// "themechange" event, and anything showing the theme listens for it.

export type Theme = 'light' | 'dark';

// What the page is showing right now; dark is the default.
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  // Saving is a nicety: storage can throw (private mode, blocked cookies),
  // and the switch must still work for the current visit.
  try {
    localStorage.setItem('theme', next);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('themechange'));
  return next;
}
