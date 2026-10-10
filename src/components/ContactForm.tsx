import { useRef, useState, type FormEvent } from 'react';
import { FaCheck, FaPaperPlane } from 'react-icons/fa6';
import { profile } from '../content/profile';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';

// The contact form. It posts to our own /api/contact function (api/contact.ts),
// which validates the message, rate-limits it and stores it in Supabase
// (and emails it on, if email notifications are set up).
//
// Design choices, so they can be explained:
// - Three fields only (name, email, message). The API also wants a subject;
//   we make one from the name, so the visitor has one box less to fill in.
// - The browser checks the basics first (required, valid email, length
//   limits that match the server). The server checks again, and anything it
//   rejects is shown next to the right field.
// - A hidden "website" field is a honeypot: people never see it, but form-
//   filling bots do and fill it in, and the server then quietly drops the message.
// - If sending fails for any reason, the visitor is offered the email address,
//   so a message is never lost to a server problem.

type Status = 'idle' | 'sending' | 'sent' | 'error';
type Field = 'name' | 'email' | 'message';

// Same limits as the server (api/_lib/validation.ts).
const MAX = { name: 100, email: 254, message: 5000 };

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const thanks = useRef<HTMLDivElement>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    const name = value('name');

    setStatus('sending');
    setError('');
    setFieldErrors({});
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: value('email'),
          subject: `Portfolio message from ${name}`.slice(0, 150),
          message: value('message'),
          website: value('website'), // the honeypot: empty for real people
        }),
      });

      if (res.ok) {
        form.reset();
        setStatus('sent');
        // Move focus to the thank-you note so keyboard and screen-reader users land on it.
        requestAnimationFrame(() => thanks.current?.focus());
        return;
      }

      // The API's error shape is { error: { code, message, details? } } (docs/API.md).
      const body = (await res.json().catch(() => null)) as {
        error?: { code?: string; details?: { field: string; message: string }[] };
      } | null;
      const code = body?.error?.code;
      if (code === 'validation_error' && body?.error?.details) {
        const next: Partial<Record<Field, string>> = {};
        for (const d of body.error.details) {
          // The subject is built from the name, so a subject problem is shown on the name.
          const field = (d.field === 'subject' ? 'name' : d.field) as Field;
          if (field in MAX) next[field] ??= d.message;
        }
        setFieldErrors(next);
        setError('Please check the highlighted fields.');
      } else if (code === 'rate_limited') {
        setError("That's a lot of messages in a short time. Please try again later, or email me directly.");
      } else {
        setError("Sorry, the message couldn't be sent. Please email me directly instead.");
      }
      setStatus('error');
    } catch {
      setError("Couldn't reach the server. Check your connection, or email me directly.");
      setStatus('error');
    }
  };

  // Shared props for each field: its error is linked so screen readers read it out.
  const fieldProps = (field: Field) => ({
    id: `contact-${field}`,
    name: field,
    required: true,
    maxLength: MAX[field],
    'aria-invalid': fieldErrors[field] ? true : undefined,
    'aria-describedby': fieldErrors[field] ? `contact-${field}-error` : undefined,
    className: 'field',
  });
  const fieldError = (field: Field) =>
    fieldErrors[field] && (
      <p id={`contact-${field}-error`} className="mt-1.5 text-small font-medium" style={{ color: 'var(--rose)' }}>
        {fieldErrors[field]}
      </p>
    );

  return (
    <section id="contact" aria-labelledby="contact-heading" className="page pb-20 pt-6 sm:pb-24">
      <SectionHeading id="contact-heading" index={3} eyebrow={profile.contactEyebrow} title={profile.contactHeading} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:items-start">
        <Reveal>
          <p className="max-w-[40ch] text-lead">{profile.contactIntro}</p>
          <p className="mt-5 text-muted">
            Prefer email?{' '}
            <a href={`mailto:${profile.email}`} className="font-semibold text-ink underline decoration-[var(--teal)] decoration-2 underline-offset-4">
              {profile.email}
            </a>
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="paper relative p-6 sm:p-7" style={{ '--c': 'var(--teal)' } as React.CSSProperties}>
            {status === 'sent' ? (
              <div ref={thanks} tabIndex={-1} role="status" className="flex flex-col items-start gap-3 py-6 outline-none">
                <span className="grid size-11 place-items-center rounded-full text-lg" style={{ background: 'var(--teal)', color: 'var(--on-accent)' }}>
                  <FaCheck aria-hidden="true" />
                </span>
                <p className="font-display text-2xl font-bold">Message sent. Thank you!</p>
                <p className="text-muted">I'll get back to you at the email address you gave.</p>
                <button type="button" onClick={() => setStatus('idle')} className="btn btn-secondary mt-2">
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-1.5 block text-small font-semibold">
                      Name
                    </label>
                    <input type="text" autoComplete="name" {...fieldProps('name')} />
                    {fieldError('name')}
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-1.5 block text-small font-semibold">
                      Email
                    </label>
                    <input type="email" autoComplete="email" {...fieldProps('email')} />
                    {fieldError('email')}
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-small font-semibold">
                    Message
                  </label>
                  <textarea rows={5} {...fieldProps('message')} className="field min-h-32 resize-y py-3" />
                  {fieldError('message')}
                </div>

                {/* Honeypot: moved off screen (not display:none, which some bots skip),
                    out of the tab order and hidden from screen readers. */}
                <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
                  <label htmlFor="contact-website">Website</label>
                  <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button type="submit" disabled={status === 'sending'} className="btn btn-primary disabled:cursor-wait disabled:opacity-70">
                    <FaPaperPlane aria-hidden="true" className="text-sm" />
                    {status === 'sending' ? 'Sending…' : 'Send message'}
                  </button>
                  <p className="text-small text-muted">All fields are required.</p>
                </div>

                {/* Errors are announced as soon as they appear. */}
                <div role="alert" className="empty:hidden">
                  {error && (
                    <p className="rounded-lg border px-4 py-3 text-small font-medium" style={{ borderColor: 'var(--rose)' }}>
                      {error}{' '}
                      {/* Offer the address for anything except "fix this field". */}
                      {status === 'error' && Object.keys(fieldErrors).length === 0 && (
                        <a href={`mailto:${profile.email}`} className="underline underline-offset-4">
                          {profile.email}
                        </a>
                      )}
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
