import { profile } from '../content/profile';
import { FloatingStickers } from './FloatingStickers';
import { SocialDock } from './SocialDock';
import { HoloCard } from './HoloCard';

export function Hero() {
  return (
    // Sized by its content, not 100vh, so there is no dead space on tall screens.
    <section id="top" className="page relative pb-10 pt-8 sm:pt-10">
      <div>
        {profile.availability && (
          <p className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-small font-medium text-muted">
            <span aria-hidden="true" className="pulse-dot" />
            {profile.availability}
          </p>
        )}
        <h1 className="text-display">
          {profile.greeting} <span className="marker">{profile.name}</span>
        </h1>
        <p className="mt-4 max-w-[40ch] text-lead">{profile.tagline}</p>
      </div>

      {/* The photo card sits in the middle of the stage; the fact stickers are scattered around it. */}
      <FloatingStickers actions={<SocialDock />}>
        <HoloCard />
      </FloatingStickers>
    </section>
  );
}
