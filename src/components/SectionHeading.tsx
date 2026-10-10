import { Reveal } from './Reveal';

// One heading style for every section: a small numbered eyebrow ("01 — Work"),
// the heading itself, and the four-colour stripe. Shared so new sections
// (Skills, Timeline, Contact) look consistent with no extra effort.
export function SectionHeading({ id, index, eyebrow, title }: { id: string; index: number; eyebrow: string; title: string }) {
  return (
    <Reveal>
      <p className="flex items-center gap-3 text-small font-semibold uppercase tracking-[0.14em] text-muted">
        <span className="tabular-nums text-ink">{String(index).padStart(2, '0')}</span>
        <span aria-hidden="true" className="h-px w-8 bg-line" />
        {eyebrow}
      </p>
      <h2 id={id} className="mt-3 text-h2">
        {title}
      </h2>
      <div aria-hidden="true" className="stripe mt-4" />
    </Reveal>
  );
}
