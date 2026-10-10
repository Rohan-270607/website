// Database types, in the same shape `supabase gen types typescript` produces.
//
// HAND-WRITTEN to match supabase/migrations/0001_schema.sql because no Supabase
// project existed when this was written. Once your project exists, regenerate
// it (`npm run types`, see README) and diff against this file. The generated
// version is the source of truth.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Insert = required columns + everything else optional (columns with defaults).
type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProjectStatus = 'planned' | 'in_progress' | 'shipped';
export type TimelineKind = 'education' | 'experience' | 'hackathon' | 'certification' | 'other';
export type MessageStatus = 'new' | 'read' | 'archived';
export type EventKind = 'pageview' | 'resume_download' | 'project_click';

export type ProfileRow = {
  id: 1;
  name: string;
  headline: string;
  bio_md: string;
  location: string | null;
  public_email: string | null;
  avatar_path: string | null;
  resume_path: string | null;
  socials: Json;
  open_to: string[];
  created_at: string;
  updated_at: string;
}

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description_md: string;
  role: string | null;
  tech: string[];
  status: ProjectStatus;
  featured: boolean;
  sort_order: number;
  live_url: string | null;
  repo_url: string | null;
  cover_path: string | null;
  gallery: Json;
  accent_color: string | null;
  started_on: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type SkillRow = {
  id: string;
  name: string;
  category: string;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type TimelineRow = {
  id: string;
  kind: TimelineKind;
  org: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description_md: string;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  tags: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ServiceRow = {
  id: string;
  title: string;
  description: string;
  price_hint: string | null;
  turnaround: string | null;
  link_url: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type MessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  ip_hash: string | null;
  user_agent: string | null;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
}

export type EventRow = {
  id: number;
  kind: EventKind;
  path: string | null;
  referrer: string | null;
  ref_id: string | null;
  ua_hash: string | null;
  ip_hash: string | null;
  created_at: string;
}

export type RateLimitRow = {
  key: string;
  window_start: string;
  count: number;
}

export type AdminEmailRow = {
  email: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profile: Table<ProfileRow, 'name'>;
      projects: Table<ProjectRow, 'slug' | 'title'>;
      skills: Table<SkillRow, 'name'>;
      timeline: Table<TimelineRow, 'org' | 'title' | 'start_date'>;
      posts: Table<PostRow, 'slug' | 'title'>;
      services: Table<ServiceRow, 'title'>;
      messages: Table<MessageRow, 'name' | 'email' | 'subject' | 'body'>;
      events: Table<EventRow, 'kind'>;
      rate_limits: Table<RateLimitRow, 'key' | 'window_start'>;
      admin_emails: Table<AdminEmailRow, 'email'>;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      rate_limit_hit: { Args: { p_key: string; p_window_seconds: number }; Returns: number };
    };
    Enums: {
      project_status: ProjectStatus;
      timeline_kind: TimelineKind;
      message_status: MessageStatus;
      event_kind: EventKind;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

