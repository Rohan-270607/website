import { z } from 'zod';

// Empty strings in a .env file (`RESEND_API_KEY=`) should mean "not set".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  // A short salt makes hashed IPs easy to brute-force (IPv4 is only 2^32 values).
  IP_HASH_SALT: z.string().min(16),
  ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  RESEND_API_KEY: optional(z.string()),
  NOTIFY_TO_EMAIL: optional(z.string().email()),
  NOTIFY_FROM_EMAIL: optional(z.string()),
});

export type Env = z.infer<typeof envSchema>;

// Read on every call (not cached) so tests can change process.env. Parsing
// six strings costs nothing.
export function getEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // Name the broken variables but never print their values.
    const names = [...new Set(result.error.issues.map((i) => i.path.join('.')))];
    throw new Error(`Invalid environment variables: ${names.join(', ')}`);
  }
  return result.data;
}
