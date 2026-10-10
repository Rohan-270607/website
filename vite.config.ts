import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { profile } from './src/content/profile.ts';

// Crawlers and link-preview bots read index.html without running JavaScript,
// so the title/description/Open Graph tags must be in the static HTML. This
// plugin fills the {{placeholders}} in index.html from profile.ts at build
// time, which keeps profile.ts the single place to edit text.
const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function injectProfileMeta(): Plugin {
  const values: Record<string, string> = {
    title: profile.seo.title,
    description: profile.seo.description,
    siteUrl: profile.siteUrl,
    name: profile.name,
    photo: profile.photo.src,
  };

  // Structured data: tells search engines this site is about a person, and
  // which profiles elsewhere are theirs (the "sameAs" links).
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    url: profile.siteUrl,
    sameAs: Object.values(profile.socials),
  };
  // Inside a <script> tag HTML entities are NOT decoded, so this one must not
  // go through escapeAttr. Escaping "<" instead stops any value from closing
  // the script tag early.
  const jsonLd = JSON.stringify(person).replace(/</g, '\\u003c');

  return {
    name: 'inject-profile-meta',
    transformIndexHtml: (html) =>
      html.replace('{{jsonLd}}', jsonLd).replace(/\{\{(\w+)\}\}/g, (_, key: string) => escapeAttr(values[key] ?? '')),
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), injectProfileMeta()],
});
