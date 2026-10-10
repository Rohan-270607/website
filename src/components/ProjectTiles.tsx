import { FaArrowUpRightFromSquare, FaGithub } from 'react-icons/fa6';
import { profile } from '../content/profile';
import { track } from '../track';
import { DemoPlayer } from './DemoPlayer';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';
import { Tilt } from './Tilt';

// Barely-there alternating tilts: the row looks placed, not generated.
const tilts = ['-1.2deg', '1deg', '-0.6deg'];

export function ProjectTiles() {
  return (
    <section id="projects" aria-labelledby="projects-heading" className="page relative pb-10 pt-14 sm:pb-12 sm:pt-16">
      <SectionHeading id="projects-heading" index={1} eyebrow={profile.projectsEyebrow} title={profile.projectsHeading} />

      {/* Three columns only from desktop width: on tablets three tiles get so
          narrow that titles wrap and the Live/Code buttons stack. */}
      <ul className="mt-10 grid gap-6 lg:grid-cols-3">
        {profile.projects.map((p, i) => (
          <li key={p.slug}>
            {/* Tilts in 3D toward the pointer; the glare follows it across the card. */}
            <Tilt max={6} className="h-full">
              <Reveal delay={i * 0.1} className="h-full">
                {/* Each tile has its own hue: it colours the number and the hard shadow behind it.
                    The number is 20px bold ("large text", 3:1 minimum) so its contrast
                    holds even while the tile is mid fade-in. */}
                <article
                  className="tile tilted paper relative flex h-full flex-col p-6"
                  style={{ '--c': `var(--${p.color})`, '--tilt': tilts[i % tilts.length] } as React.CSSProperties}
                >
                  {p.demo && <DemoPlayer demo={p.demo} title={p.title} />}
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-2xl">{p.title}</h3>
                    <span aria-hidden="true" className="font-display text-xl font-bold leading-none tabular-nums" style={{ color: 'var(--c)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="mt-2 max-w-[45ch] text-muted">{p.summary}</p>
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label="Built with">
                    {p.tech.map((t, ti) => (
                      <li key={ti} className="rounded-md border border-line bg-bg px-2.5 py-0.5 text-small font-medium text-muted">
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('project_click', p.slug)} className="btn btn-primary">
                      <FaArrowUpRightFromSquare aria-hidden="true" className="text-sm" />
                      Live<span className="sr-only"> demo of {p.title} (opens in a new tab)</span>
                    </a>
                    <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('project_click', p.slug)} className="btn btn-secondary">
                      <FaGithub aria-hidden="true" />
                      Code<span className="sr-only"> for {p.title} (opens in a new tab)</span>
                    </a>
                  </div>
                  <span aria-hidden="true" className="glare" />
                </article>
              </Reveal>
            </Tilt>
          </li>
        ))}
      </ul>
    </section>
  );
}
