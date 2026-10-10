// Text with its letters coloured in turn by the four brand hues: orange,
// teal, gold, rose, then round again (spaces don't use up a colour). It uses
// the theme's hue variables, so in the light theme the letters switch to the
// deeper shades. Those reach about 4.2:1 on the light page, so use this only
// for large bold text (18.66px or more, which needs just 3:1).
//
// Screen readers get the plain text once; the coloured copy is hidden from
// them, otherwise each letter could be announced on its own.

const HUES = ['--orange', '--teal', '--gold', '--rose'];

export function ColorWord({ text, className = '' }: { text: string; className?: string }) {
  let letters = 0; // how many coloured letters so far
  const chars = [...text].map((ch, i) => {
    if (ch === ' ') return ' ';
    const hue = HUES[letters++ % HUES.length];
    return (
      <span key={i} style={{ color: `var(${hue})` }}>
        {ch}
      </span>
    );
  });

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={className}>
        {chars}
      </span>
    </>
  );
}
