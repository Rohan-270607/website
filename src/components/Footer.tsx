import { useEffect, useState } from 'react';
import { FaArrowUp, FaCheck, FaEnvelope, FaRegCopy } from 'react-icons/fa6';
import { profile } from '../content/profile';
import { Logo } from './Logo';
import { SocialDock } from './SocialDock';

// The email address as a one-click "copy" button. Many visitors (especially
// on work computers) have no mail app set up, so a mailto link alone opens
// nothing for them.
function CopyEmail() {
  const [copied, setCopied] = useState(false);

  // Switch the label back after two seconds.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
    } catch {
      // Clipboard blocked (old browser, permissions). The address is still
      // visible to select by hand, and the contact form still works.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy email address ${profile.email}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-small text-muted transition-colors hover:text-ink"
      >
        {copied ? <FaCheck aria-hidden="true" style={{ color: 'var(--teal)' }} /> : <FaRegCopy aria-hidden="true" />}
        <span>{copied ? 'Copied!' : profile.email}</span>
      </button>
      <span role="status" className="sr-only">
        {copied ? 'Email address copied' : ''}
      </span>
    </>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="page pb-8 pt-14">
        {/* Sign-off and a clear "get in touch" action on the left, the social
            dock on the right at its natural width (so it never wraps). Below
            desktop width they simply stack. */}
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div aria-hidden="true" className="stripe" />
            <p className="mt-6 max-w-[22ch] font-display text-h2 font-bold">{profile.signoff}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
              <a href="#contact" className="btn btn-primary">
                <FaEnvelope aria-hidden="true" />
                {profile.contactCta}
              </a>
              <CopyEmail />
            </div>
          </div>
          <SocialDock className="lg:justify-end" />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-small text-muted">
          <p className="flex items-center gap-2.5">
            <Logo size={22} />
            <span>
              © {new Date().getFullYear()} {profile.name}
            </span>
          </p>
          <a href="#top" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-medium transition-colors hover:text-ink">
            Back to top
            <FaArrowUp aria-hidden="true" className="text-xs" />
          </a>
        </div>
      </div>
    </footer>
  );
}
