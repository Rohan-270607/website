import { lazy, Suspense, useEffect } from 'react';
import { LazyMotion } from 'framer-motion';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Waves } from './components/Waves';
import { Footer } from './components/Footer';
import { CursorTrail } from './components/CursorTrail';
import { Disco } from './components/Disco';
import { track } from './track';

// The big below-the-fold sections are split into their own chunks so the
// first screen downloads less JavaScript. The footer is tiny, so it is a
// normal import; making it lazy too let it load first and jump around.
const ProjectTiles = lazy(() => import('./components/ProjectTiles').then((m) => ({ default: m.ProjectTiles })));
const AboutScatter = lazy(() => import('./components/AboutScatter').then((m) => ({ default: m.AboutScatter })));
const ContactForm = lazy(() => import('./components/ContactForm').then((m) => ({ default: m.ContactForm })));

// The sections below the hero load a moment after the page, so a link like
// /#contact finds nothing to jump to on first load. This renders together
// with them (same Suspense boundary) and makes that jump once they exist.
function ScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  return null;
}

const loadFeatures = () => import('./motionFeatures').then((mod) => mod.default);

export default function App() {
  // Count one page view per visit (no-op on localhost; see src/track.ts).
  useEffect(() => track('pageview'), []);

  return (
    <LazyMotion features={loadFeatures} strict>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Waves />
      <Disco />
      <CursorTrail />
      <div className="relative z-10">
        <Nav />
        <main id="main">
          <Hero />
          {/* Sections in page order, each with a stable id. To add one: build
              it, render it here, and add its link to `nav` in profile.ts.
              Ids reserved for later: work, skills, timeline, contact. */}
          {/* The placeholder is one screen tall so the footer stays below the
              fold until the sections arrive; otherwise it would be pushed
              down on screen when they pop in (a layout shift). */}
          <Suspense fallback={<div aria-hidden="true" className="min-h-svh" />}>
            <ProjectTiles />
            <AboutScatter />
            <ContactForm />
            <ScrollToHash />
          </Suspense>
        </main>
        <Footer />
      </div>
    </LazyMotion>
  );
}
