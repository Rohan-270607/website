import { profile } from './content/profile';

// Privacy-friendly analytics: sends one small event to our own /api/track
// endpoint (api/track.ts). No cookies, no third-party script; the server keeps
// only a salted, daily-changing hash of the visitor, never their IP.
//
// It is switched off:
// - when profile.analytics is false,
// - on localhost, where `npm run dev` / `npm run preview` have no /api to answer,
// - for visitors who have turned on "Do Not Track" in their browser.

export type EventKind = 'pageview' | 'resume_download' | 'project_click';

const enabled =
  profile.analytics && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) && navigator.doNotTrack !== '1';

export function track(kind: EventKind, refId?: string): void {
  if (!enabled) return;
  const body = JSON.stringify({
    kind,
    path: window.location.pathname,
    // Where the visitor came from, only on the first page view. The server keeps origin + path only.
    referrer: kind === 'pageview' && document.referrer ? document.referrer : undefined,
    ref_id: refId,
  });
  // sendBeacon is made for this: it survives the page being closed or a link
  // being followed, and never delays anything. fetch with keepalive is the fallback.
  try {
    if (navigator.sendBeacon?.('/api/track', body)) return;
  } catch {
    /* fall through to fetch */
  }
  fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {
    /* analytics must never break the page */
  });
}
