import { profile, type StickerColor } from '../content/profile';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';
import { Tilt } from './Tilt';

// Where each note sits in the 12-column desktop grid, how far it tilts, and
// its accent hue. The column offsets (mt-*, col-start) are what stop it
// reading as a rigid grid. On phones everything stacks in one column.
const layout: { span: string; tilt: string; hue: StickerColor }[] = [
  { span: 'md:col-span-7', tilt: '-1.4deg', hue: 'rose' },
  { span: 'md:col-span-6 md:col-start-6 md:mt-10', tilt: '1.1deg', hue: 'gold' },
  { span: 'md:col-span-7 md:col-start-2 md:mt-2', tilt: '-0.8deg', hue: 'teal' },
];

export function AboutScatter() {
  return (
    <section id="about" aria-labelledby="about-heading" className="dots relative isolate pb-16 pt-12 sm:pb-24 sm:pt-16">
      <div className="page relative">
        <SectionHeading id="about-heading" index={2} eyebrow={profile.aboutEyebrow} title={profile.aboutHeading} />

        <ul className="mt-12 grid gap-8 md:grid-cols-12">
          {profile.aboutNotes.map((note, i) => {
            const l = layout[i % layout.length];
            return (
              <li key={i} className={l.span}>
                <Tilt max={5}>
                  <Reveal delay={i * 0.12}>
                    <article className="paper tilted relative px-6 pb-6 pt-7" style={{ '--tilt': l.tilt, '--c': `var(--${l.hue})` } as React.CSSProperties}>
                      <h3 className="text-2xl">{note.title}</h3>
                      <p className="mt-2 max-w-[65ch] text-muted">{note.text}</p>
                      <span aria-hidden="true" className="glare" />
                    </article>
                  </Reveal>
                </Tilt>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
