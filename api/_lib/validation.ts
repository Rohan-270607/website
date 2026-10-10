import { z } from 'zod';
import { HttpError, type FieldIssue } from './http.js';

// Strip control characters. Single-line fields lose newlines too: a newline in
// the subject would let an attacker inject headers into the notification email.
const stripControlSingleLine = (s: string) => s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
// The message body may keep \n and \t, nothing else.
const stripControlMultiLine = (s: string) =>
  s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

const line = (max: number) =>
  z.string().transform(stripControlSingleLine).pipe(z.string().min(1, 'Required').max(max, `Max ${max} characters`));

export const contactSchema = z
  .object({
    name: line(100),
    email: z
      .string()
      .transform((s) => stripControlSingleLine(s).toLowerCase())
      .pipe(z.string().max(254, 'Max 254 characters').email('Invalid email address')),
    subject: line(150),
    message: z
      .string()
      .transform(stripControlMultiLine)
      .pipe(z.string().min(1, 'Required').max(5000, 'Max 5000 characters')),
    // Honeypot: hidden from humans in the form, filled in by dumb bots.
    website: z.string().optional(),
  })
  .strict(); // unknown fields are an error, not silently ignored

export const trackSchema = z
  .object({
    kind: z.enum(['pageview', 'resume_download', 'project_click']),
    // Query strings and fragments are dropped: they can carry tokens or
    // personal data (?email=...), and we never need them.
    path: z
      .string()
      .max(500)
      .startsWith('/', 'Must start with /')
      .transform((p) => p.split(/[?#]/)[0]),
    // Only origin + path of the referrer is kept, for the same reason.
    referrer: z
      .string()
      .max(500)
      .optional()
      .transform((r) => {
        if (!r) return null;
        try {
          const u = new URL(r);
          return u.protocol === 'http:' || u.protocol === 'https:' ? u.origin + u.pathname : null;
        } catch {
          return null;
        }
      }),
    ref_id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,100}$/, 'Letters, digits, _ and - only')
      .optional(),
  })
  .strict();

// zod's issues → a stable shape for the frontend. Only field names and our own
// messages are returned, never the submitted values.
export function validationError(error: z.ZodError): HttpError {
  const details: FieldIssue[] = error.issues.map((i) => ({
    field: i.path.join('.') || '(body)',
    message: i.message,
  }));
  return new HttpError(400, 'validation_error', 'Some fields are invalid.', details);
}
