import type { IconType } from 'react-icons';
import { FaEnvelope, FaFileLines, FaGithub, FaInstagram, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';
import { profile, type StickerColor } from '../content/profile';
import { track } from '../track';

// Icons are imported one by one so the bundler ships only these six.
const items: { label: string; href: string; Icon: IconType; color: StickerColor; external: boolean }[] = [
  { label: 'GitHub', href: profile.socials.github, Icon: FaGithub, color: 'teal', external: true },
  { label: 'LinkedIn', href: profile.socials.linkedin, Icon: FaLinkedinIn, color: 'rose', external: true },
  { label: 'Instagram', href: profile.socials.instagram, Icon: FaInstagram, color: 'orange', external: true },
  { label: 'X (Twitter)', href: profile.socials.x, Icon: FaXTwitter, color: 'gold', external: true },
  { label: 'Email', href: `mailto:${profile.email}`, Icon: FaEnvelope, color: 'rose', external: false },
  { label: 'Resume', href: profile.resumeHref, Icon: FaFileLines, color: 'orange', external: true },
];

export function SocialDock({ className = '' }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-3 ${className}`} aria-label="Find me online">
      {items.map(({ label, href, Icon, color, external }) => (
        <li key={label}>
          <a
            href={href}
            aria-label={external ? `${label} (opens in a new tab)` : label}
            {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
            // Count resume downloads (src/track.ts).
            onClick={label === 'Resume' ? () => track('resume_download') : undefined}
            className="dock-btn"
            style={{ '--c': `var(--${color})` } as React.CSSProperties}
          >
            <Icon aria-hidden="true" />
            <span className="tip" aria-hidden="true">
              {label}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
