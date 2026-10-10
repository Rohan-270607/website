// ALL personal text and links on the site live in this file. Components only
// read from it, so to make the site yours you edit here and nowhere else.
// Everything in [square brackets] is a placeholder: replace it, brackets included.

// The site's four colours (see tokens.css).
export type StickerColor = 'orange' | 'teal' | 'gold' | 'rose';
export type FactIcon = 'place' | 'study' | 'hobby' | 'build' | 'music' | 'fun';

export interface Fact {
  label: string; // the small caption
  value: string; // the fact itself
  color: StickerColor;
  icon: FactIcon;
}

// Shaped like a row of a future `projects` table (slug, title, summary, tech,
// live_url, repo_url, accent color), so this array can later be replaced by
// data fetched from the database without touching the components.
export interface Project {
  slug: string;
  title: string;
  summary: string;
  tech: string[];
  liveUrl: string;
  repoUrl: string;
  color: StickerColor;
  // Optional demo clip. src: a .gif, .mp4 or .webm in public/demos/ (leave ''
  // until you have one); poster: a still picture shown before Play.
  demo?: { src: string; poster: string; alt: string };
}

export const profile = {
  name: 'Rohan',
  greeting: "Hi, I'm",
  tagline: 'Computer Science student building practical software, from voice assistants to web apps.',
  // The small status pill above the headline. Set to '' to hide it.
  availability: '[Open to internships]',

  photo: {
    src: '/me.jpg', // replace public/me.jpg, or point this at another file in /public
    alt: 'Smiling person with glasses in a light blue shirt, sitting on a wall in front of green hills and low cloud',
    // Set true when the file is a transparent PNG cutout: it then gets an
    // outline that follows your silhouette instead of a blob-shaped frame.
    cutout: false,
    width: 800,
    height: 800,
    label: "Hi, it's me", // the caption chip by default...
    // ...and the lines it randomly switches to when someone pokes the photo.
    lines: ['Fueled by questionable decisions.', 'Making machines a little more human.', 'Life is a cycle.'],
  },

  // Six facts; each becomes a draggable sticker around the photo.
  facts: [
    { label: 'Based in', value: 'Chennai, India', color: 'teal', icon: 'place' },
    { label: 'Studying', value: 'BTech CSE, SRMIST', color: 'rose', icon: 'study' },
    { label: 'Outside of code', value: 'I love to cook', color: 'orange', icon: 'hobby' },
    { label: 'Currently building', value: 'Project Specula', color: 'gold', icon: 'build' },
    { label: 'On repeat', value: 'Javeda Zindagi', color: 'rose', icon: 'music' },
    { label: 'Fun fact', value: "6'4, yes, the weather is fine up here", color: 'orange', icon: 'fun' },
  ] as Fact[],

  // Social dock. Email and resume are built from the two fields below.
  email: 'rohannp2707@gmail.com',
  resumeHref: '/resume.pdf', // replace public/resume.pdf with your real file
  socials: {
    github: 'https://github.com/Rohan-270607/',
    linkedin: 'https://www.linkedin.com/in/rohan-nanda-p-bb5a3b372/',
    instagram: 'https://www.instagram.com/_rohan.p_/',
    x: 'https://x.com/Rohan_2707',
  },

  projectsEyebrow: 'Work', // the small label above the heading
  projectsHeading: 'Selected projects',
  projects: [
    {
      slug: 'project-one',
      title: '[Project One]',
      summary: '[One line about what it does.]',
      tech: ['[Tech]', '[Tech]', '[Tech]'],
      liveUrl: 'https://example.com/',
      repoUrl: 'https://github.com/',
      color: 'orange',
      demo: { src: '', poster: '', alt: '[Describe what the demo shows]' },
    },
    {
      slug: 'project-two',
      title: '[Project Two]',
      summary: '[One line about what it does.]',
      tech: ['[Tech]', '[Tech]'],
      liveUrl: 'https://example.com/',
      repoUrl: 'https://github.com/',
      color: 'rose',
      demo: { src: '', poster: '', alt: '[Describe what the demo shows]' },
    },
    {
      slug: 'project-three',
      title: '[Project Three]',
      summary: '[One line about what it does.]',
      tech: ['[Tech]', '[Tech]', '[Tech]'],
      liveUrl: 'https://example.com/',
      repoUrl: 'https://github.com/',
      color: 'gold',
      demo: { src: '', poster: '', alt: '[Describe what the demo shows]' },
    },
  ] as Project[],

  aboutEyebrow: 'About',
  aboutHeading: 'More about me',
  aboutNotes: [
    { title: '[Note title]', text: '[A short paragraph about you: where you started and what got you into building things.]' },
    { title: '[Note title]', text: '[A short paragraph about what you are into right now and what you want to learn next.]' },
    { title: '[Note title]', text: '[A short, friendly paragraph about life outside code, or what you would like to work on.]' },
  ],

  signoff: '[A friendly sign-off line. Thanks for stopping by!]',
  contactCta: 'Say hello', // the footer button that jumps to the contact form

  // The contact form section (ContactForm.tsx), which posts to /api/contact.
  contactEyebrow: 'Contact',
  contactHeading: 'Say hello',
  contactIntro: 'Questions, opportunities, or just want to say hi? Send me a message and I will get back to you.',

  // Privacy-friendly page-view and click counts through /api/track (see src/track.ts).
  // No cookies and no third parties. Set to false to switch it off.
  analytics: true,

  // Top-bar links. When you add a section, add a line here.
  nav: [
    { label: 'Projects', href: '#projects' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],

  // Used for <title>, meta description and social previews (see vite.config.ts).
  siteUrl: 'https://your-domain.example',
  seo: {
    title: 'Rohan | Computer Science student',
    description: 'Computer Science student building practical software, from voice assistants to web apps.',
  },
};
