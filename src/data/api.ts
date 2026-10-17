// ─────────────────────────────────────────────────────────────────────────────
// Data access layer: every read/write the app performs against Supabase.
// Maps database rows (snake_case) to the frontend types (camelCase) so the
// UI components stay unchanged. All permission enforcement happens in the
// database via Row Level Security — these functions just make requests.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';
import type {
  AppNotification, Bubble, Member, OwnershipRequest, OwnershipStatus, Resource, Session, SessionSection, User, VideoEntry,
} from '../types';

// ─── Formatting helpers ──────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return 'TBD';
  // DATE columns arrive as 'YYYY-MM-DD'; parse as LOCAL date to avoid
  // the off-by-one-day bug in UTC-negative timezones.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Parse a display date ("Mar 14, 2026") back to 'YYYY-MM-DD', or null. */
export function toIsoDate(display: string | null | undefined): string | null {
  if (!display || display === 'TBD') return null;
  const d = new Date(display);
  if (isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Only allow real web links (blocks javascript: and friends). */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/** Throw if an update/delete matched no rows (RLS-blocked or missing). */
function assertTouched(rows: unknown[] | null, what: string): void {
  if (!rows || rows.length === 0) {
    throw new Error(`Not permitted: ${what}`);
  }
}

function fmtMonthYear(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ─── Row → frontend type mapping ─────────────────────────────────────────────

type ProfileRow = { id: string; name: string; avatar_url: string | null; title: string | null };

type MemberRow = {
  user_id: string; role: 'founder' | 'member'; joined_at: string;
  profiles: ProfileRow | null;
};

function mapMember(row: MemberRow): Member {
  return {
    id: row.user_id,
    name: row.profiles?.name ?? 'Member',
    role: row.role,
    avatar: row.profiles?.avatar_url ?? '',
    title: row.profiles?.title ?? '',
    joinDate: fmtMonthYear(row.joined_at),
    postCount: 0,
    online: false,
  };
}

type SectionRow = {
  id: string; session_id: string; type: SessionSection['type']; title: string;
  content: string | null; videos: VideoEntry[] | null; position: number;
  deleted_at: string | null;
};

function mapSection(row: SectionRow): SessionSection {
  const videos = Array.isArray(row.videos) ? row.videos : [];
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content ?? undefined,
    videos,
    videoUrl: videos[0]?.url,
    videoTitle: videos[0]?.title,
  };
}

type SessionRow = {
  id: string; bubble_id: string; number: number; title: string;
  status: Session['status']; session_date: string | null; duration: number;
  xp: number; level: Session['level'] | null;
  project_url: string | null; reflection_note: string | null;
  confidence_rating: number | null; deleted_at: string | null;
  session_sections: SectionRow[];
};

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    status: row.status,
    date: fmtDate(row.session_date),
    duration: row.duration,
    xp: row.xp,
    level: row.level ?? 'Beginner',
    sections: (row.session_sections ?? [])
      .filter(s => !s.deleted_at)
      .sort((a, b) => a.position - b.position)
      .map(mapSection),
    projectUrl: row.project_url ?? undefined,
    reflectionNote: row.reflection_note ?? undefined,
    confidenceRating: row.confidence_rating ?? undefined,
  };
}

type VoteRow = { resource_id: string; user_id: string; vote: 'up' | 'down' };

type ResourceRow = {
  id: string; bubble_id: string; type: Resource['type']; title: string;
  url: string | null; description: string; uploaded_by: string;
  watched: boolean; personal_rating: 'up' | 'down' | null; created_at: string;
};

function mapResource(row: ResourceRow, votes: VoteRow[]): Resource {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    url: row.url ?? '',
    description: row.description,
    uploadedById: row.uploaded_by,
    uploadedAt: fmtDate(row.created_at),
    watched: row.watched,
    personalRating: row.personal_rating,
    communityRatings: votes
      .filter(v => v.resource_id === row.id)
      .map(v => ({ userId: v.user_id, vote: v.vote })),
  };
}

type BubbleRow = {
  id: string; title: string; topic: string; description: string;
  level: Bubble['level']; status: Bubble['status'];
  max_seats: number; taken_seats: number;
  schedule_day: string; schedule_time: string; start_date: string | null;
  founder_id: string; hero_image: string | null;
  forked_from?: string | null;
  credit_chain?: Array<{ bubble_id: string; title: string; author: string }> | null;
};

function mapBubble(row: BubbleRow, members: Member[] = []): Bubble {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    description: row.description,
    level: row.level,
    status: row.status,
    maxSeats: row.max_seats,
    takenSeats: row.taken_seats,
    scheduleDay: row.schedule_day,
    scheduleTime: row.schedule_time,
    startDate: fmtDate(row.start_date),
    founderId: row.founder_id,
    memberIds: members.map(m => m.id),
    members,
    sessions: [],   // loaded lazily via fetchBubbleDetail
    resources: [],  // loaded lazily via fetchBubbleDetail
    heroImage: row.hero_image ?? undefined,
    forkedFrom: row.forked_from ?? undefined,
    creditChain: (row.credit_chain ?? []).map(c => ({ bubbleId: c.bubble_id, title: c.title, author: c.author })),
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Load the signed-in user's profile + memberships + waitlist entries. */
export async function fetchCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: memberships }, { data: waits }] = await Promise.all([
    supabase.from('profiles')
      .select('id, name, avatar_url, title, notify_consent')
      .eq('id', user.id).single(),
    supabase.from('bubble_members').select('bubble_id').eq('user_id', user.id),
    supabase.from('waitlist').select('bubble_id').eq('user_id', user.id),
  ]);

  return {
    id: user.id,
    name: profile?.name ?? 'Member',
    email: user.email ?? '',
    avatar: profile?.avatar_url ?? '',
    title: profile?.title ?? '',
    joinedBubbles: (memberships ?? []).map(m => m.bubble_id),
    waitlistedBubbles: (waits ?? []).map(w => w.bubble_id),
    notifyConsent: profile?.notify_consent ?? false,
  };
}

export async function updateMyProfile(patch: {
  name?: string; title?: string; notifyConsent?: boolean;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.notifyConsent !== undefined) row.notify_consent = patch.notifyConsent;
  const { data, error } = await supabase
    .from('profiles').update(row).eq('id', user.id).select('id');
  if (error) throw error;
  assertTouched(data, 'profile update');
}

// ─── Bubbles ─────────────────────────────────────────────────────────────────

/**
 * List all bubbles. Works signed-out (cards only, no member details —
 * that's the privacy model). Signed in, you get: full member lists for
 * bubbles YOU belong to (privacy rules hide the rest), plus each bubble's
 * founder name for the "Founded by" line.
 */
export async function fetchBubbles(signedIn: boolean): Promise<Bubble[]> {
  const { data: rows, error } = await supabase
    .from('bubbles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const bubbleRows = (rows ?? []) as BubbleRow[];
  const membersByBubble = new Map<string, Member[]>();

  if (signedIn && bubbleRows.length) {
    const [{ data: memberRows }, { data: founderProfiles }] = await Promise.all([
      // Only returns rows for bubbles the caller belongs to (RLS-scoped).
      supabase
        .from('bubble_members')
        .select('bubble_id, user_id, role, joined_at, profiles(id, name, avatar_url, title)'),
      // Founder profiles are readable so cards can say "Founded by …".
      supabase
        .from('profiles')
        .select('id, name, avatar_url, title')
        .in('id', [...new Set(bubbleRows.map(b => b.founder_id))]),
    ]);

    if (memberRows) {
      for (const r of memberRows as unknown as (MemberRow & { bubble_id: string })[]) {
        const list = membersByBubble.get(r.bubble_id) ?? [];
        list.push(mapMember(r));
        membersByBubble.set(r.bubble_id, list);
      }
    }

    // Ensure every bubble at least lists its founder (for non-member viewers).
    const founderById = new Map((founderProfiles ?? []).map(p => [p.id, p as ProfileRow]));
    for (const b of bubbleRows) {
      const list = membersByBubble.get(b.id) ?? [];
      if (!list.some(m => m.id === b.founder_id)) {
        const fp = founderById.get(b.founder_id);
        if (fp) {
          list.unshift({
            id: fp.id, name: fp.name, role: 'founder',
            avatar: fp.avatar_url ?? '', title: fp.title ?? '',
            joinDate: '', postCount: 0, online: false,
          });
        }
      }
      membersByBubble.set(b.id, list);
    }
  }

  return bubbleRows.map(row => mapBubble(row, membersByBubble.get(row.id) ?? []));
}

/** Load one bubble's syllabus + resources (requires sign-in per security rules). */
export async function fetchBubbleDetail(bubbleId: string): Promise<{
  sessions: Session[]; resources: Resource[];
}> {
  const [sessionsRes, resourcesRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('*, session_sections(*)')
      .eq('bubble_id', bubbleId)
      .is('deleted_at', null)
      .order('number', { ascending: true }),
    supabase
      .from('resources')
      .select('*')
      .eq('bubble_id', bubbleId)
      .order('created_at', { ascending: true }),
  ]);

  if (sessionsRes.error) throw sessionsRes.error;
  // resources may be blocked for non-members — that's expected, not an error
  const resourceRows = (resourcesRes.data ?? []) as ResourceRow[];

  let votes: VoteRow[] = [];
  if (resourceRows.length) {
    const { data: voteRows } = await supabase
      .from('resource_votes')
      .select('resource_id, user_id, vote')
      .in('resource_id', resourceRows.map(r => r.id));
    votes = (voteRows ?? []) as VoteRow[];
  }

  const sessions = (sessionsRes.data as SessionRow[]).map(mapSession);

  // Merge MY per-member progress into each session (project/reflection/rating).
  const { data: { user } } = await supabase.auth.getUser();
  if (user && sessions.length) {
    const { data: progress } = await supabase
      .from('session_progress')
      .select('session_id, project_url, reflection_note, confidence_rating')
      .eq('user_id', user.id)
      .in('session_id', sessions.map(s => s.id));
    for (const p of progress ?? []) {
      const s = sessions.find(x => x.id === p.session_id);
      if (s) {
        s.projectUrl = p.project_url ?? undefined;
        s.reflectionNote = p.reflection_note ?? undefined;
        s.confidenceRating = p.confidence_rating ?? undefined;
      }
    }
  }

  return {
    sessions,
    resources: resourceRows.map(r => mapResource(r, votes)),
  };
}

/** Save MY progress on a session (per-member; each woman's own). */
export async function saveMyProgress(sessionId: string, p: {
  projectUrl?: string | null; reflectionNote?: string | null;
  confidenceRating?: number | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('session_progress').upsert({
    session_id: sessionId,
    user_id: user.id,
    project_url: safeUrl(p.projectUrl ?? null),
    reflection_note: p.reflectionNote ?? null,
    confidence_rating: p.confidenceRating ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export interface CreateBubbleInput {
  title: string; topic: string; description: string;
  level: Bubble['level']; maxSeats: number;
  scheduleDay: string; scheduleTime: string;
  startDate?: string | null; heroImage?: string | null;
  /** null/undefined = auto (learn if the limit allows, else facilitate). */
  founderLearns?: boolean | null;
  sessions?: Array<{
    number: number; title: string; level?: Session['level'];
    date?: string | null;
    sections: Array<{ type: SessionSection['type']; title: string; content?: string; videos?: VideoEntry[] }>;
  }>;
}

/** Create a bubble (+ founder membership) and optionally its syllabus. */
export async function createBubble(input: CreateBubbleInput): Promise<string> {
  const { data: bubbleId, error } = await supabase.rpc('create_bubble', {
    p_title: input.title,
    p_topic: input.topic,
    p_description: input.description,
    p_level: input.level,
    p_max_seats: input.maxSeats,
    p_schedule_day: input.scheduleDay,
    p_schedule_time: input.scheduleTime,
    p_start_date: input.startDate ?? null,
    p_hero_image: input.heroImage ?? null,
    p_founder_learns: input.founderLearns ?? null,
  });
  if (error) throw error;

  if (input.sessions?.length) {
    const { data: sessionRows, error: sErr } = await supabase
      .from('sessions')
      .insert(input.sessions.map((s, i) => ({
        bubble_id: bubbleId,
        number: s.number ?? i + 1,
        title: s.title,
        status: i === 0 ? 'in-progress' : 'locked',
        level: s.level ?? input.level,
        session_date: s.date ?? null,
      })))
      .select('id, number');
    if (sErr) throw sErr;

    const sectionInserts = input.sessions.flatMap(s => {
      const dbSession = sessionRows!.find(r => r.number === s.number);
      if (!dbSession) return [];
      return s.sections.map((sec, i) => ({
        session_id: dbSession.id,
        type: sec.type,
        title: sec.title,
        content: sec.content ?? null,
        videos: sec.videos ?? [],
        position: i,
      }));
    });
    if (sectionInserts.length) {
      const { error: secErr } = await supabase.from('session_sections').insert(sectionInserts);
      if (secErr) throw secErr;
    }
  }

  return bubbleId as string;
}

export async function updateBubbleRow(id: string, patch: Partial<{
  title: string; description: string; scheduleDay: string; scheduleTime: string;
  status: Bubble['status']; maxSeats: number; heroImage: string;
}>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.scheduleDay !== undefined) row.schedule_day = patch.scheduleDay;
  if (patch.scheduleTime !== undefined) row.schedule_time = patch.scheduleTime;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.maxSeats !== undefined) row.max_seats = patch.maxSeats;
  if (patch.heroImage !== undefined) row.hero_image = patch.heroImage;
  if (!Object.keys(row).length) return;
  const { data, error } = await supabase
    .from('bubbles').update(row).eq('id', id).select('id');
  if (error) throw error;
  assertTouched(data, 'bubble update');
}

export async function deleteBubbleRow(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('bubbles').delete().eq('id', id).select('id');
  if (error) throw error;
  assertTouched(data, 'bubble delete');
}

// ─── Membership ──────────────────────────────────────────────────────────────

/** Join a bubble. Returns 'joined' or 'waitlisted' (decided server-side). */
export async function joinBubbleRpc(bubbleId: string): Promise<'joined' | 'waitlisted'> {
  const { data, error } = await supabase.rpc('join_bubble', { target_bubble: bubbleId });
  if (error) throw error;
  return data as 'joined' | 'waitlisted';
}

/**
 * Leave a bubble. A founder cannot leave (RLS blocks it) — she must hand over
 * leadership first; that case surfaces as a thrown error rather than a no-op.
 */
export async function leaveBubbleApi(bubbleId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('bubble_members')
    .delete()
    .eq('bubble_id', bubbleId)
    .eq('user_id', user.id)
    .select('user_id');
  if (error) throw error;
  assertTouched(data, 'leave bubble');
}

export async function removeMember(bubbleId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('bubble_members')
    .delete()
    .eq('bubble_id', bubbleId)
    .eq('user_id', userId)
    .select('user_id');
  if (error) throw error;
  assertTouched(data, 'remove member');
}

// ─── Syllabus persistence ────────────────────────────────────────────────────

export async function createSessionRow(bubbleId: string, s: {
  number: number; title: string; status?: Session['status'];
  level?: Session['level']; date?: string | null; xp?: number; duration?: number;
}): Promise<string> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      bubble_id: bubbleId,
      number: s.number,
      title: s.title,
      status: s.status ?? 'locked',
      level: s.level ?? null,
      session_date: s.date ?? null,
      xp: s.xp ?? 150,
      duration: s.duration ?? 90,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateSessionRow(id: string, patch: Partial<{
  number: number; title: string; status: Session['status'];
  level: Session['level']; date: string; duration: number; xp: number;
}>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.number !== undefined) row.number = patch.number;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.level !== undefined) row.level = patch.level;
  if (patch.date !== undefined) row.session_date = toIsoDate(patch.date);
  if (patch.duration !== undefined) row.duration = patch.duration;
  if (patch.xp !== undefined) row.xp = patch.xp;
  if (!Object.keys(row).length) return;
  const { data, error } = await supabase
    .from('sessions').update(row).eq('id', id).select('id');
  if (error) throw error;
  assertTouched(data, 'session update');
}

/** Soft-delete (sets deleted_at) — supports the 5-second undo. */
export async function softDeleteSession(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('sessions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertTouched(data, 'session delete');
}

export async function restoreSession(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('sessions').update({ deleted_at: null }).eq('id', id).select('id');
  if (error) throw error;
  assertTouched(data, 'session restore');
}

/** Persist new session numbering after move/duplicate/delete reflows. */
export async function renumberSessions(ordered: Array<{ id: string; number: number }>): Promise<void> {
  const results = await Promise.all(
    ordered.map(s =>
      supabase.from('sessions').update({ number: s.number }).eq('id', s.id).select('id'),
    ),
  );
  for (const r of results) {
    if (r.error) throw r.error;
    assertTouched(r.data, 'session reorder');
  }
}

export async function createSectionRow(sessionId: string, sec: {
  type: SessionSection['type']; title: string; content?: string;
  videos?: VideoEntry[]; position: number;
}): Promise<string> {
  const { data, error } = await supabase
    .from('session_sections')
    .insert({
      session_id: sessionId,
      type: sec.type,
      title: sec.title,
      content: sec.content ?? null,
      videos: sec.videos ?? [],
      position: sec.position,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateSectionRow(id: string, patch: Partial<{
  title: string; content: string | null; videos: VideoEntry[]; position: number;
}>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.videos !== undefined) {
    // Strip any non-web links (defense in depth vs stored XSS).
    row.videos = patch.videos.filter(v => safeUrl(v.url));
  }
  if (patch.position !== undefined) row.position = patch.position;
  if (!Object.keys(row).length) return;
  const { data, error } = await supabase
    .from('session_sections').update(row).eq('id', id).select('id');
  if (error) throw error;
  assertTouched(data, 'section update');
}

export async function softDeleteSection(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('session_sections')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertTouched(data, 'section delete');
}

export async function restoreSection(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('session_sections')
    .update({ deleted_at: null })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertTouched(data, 'section restore');
}

// ─── Resources ───────────────────────────────────────────────────────────────

export async function addResourceRow(bubbleId: string, r: {
  type: Resource['type']; title: string; url: string; description: string;
  watched: boolean; personalRating: 'up' | 'down' | null;
}): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const url = safeUrl(r.url);
  if (r.url && !url) throw new Error('Links must start with http:// or https://');
  const { data, error } = await supabase
    .from('resources')
    .insert({
      bubble_id: bubbleId,
      type: r.type,
      title: r.title,
      url,
      description: r.description,
      uploaded_by: user.id,
      watched: r.watched,
      personal_rating: r.personalRating,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateResourceRow(id: string, patch: Partial<{
  title: string; url: string; description: string; type: Resource['type'];
  watched: boolean; personalRating: 'up' | 'down' | null;
}>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.url !== undefined) row.url = safeUrl(patch.url);
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.watched !== undefined) row.watched = patch.watched;
  if (patch.personalRating !== undefined) row.personal_rating = patch.personalRating;
  if (!Object.keys(row).length) return;
  const { data, error } = await supabase
    .from('resources').update(row).eq('id', id).select('id');
  if (error) throw error;
  assertTouched(data, 'resource update');
}

export async function deleteResourceRow(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('resources').delete().eq('id', id).select('id');
  if (error) throw error;
  assertTouched(data, 'resource delete');
}

// ─── Waitlist & leadership (founder tools) ───────────────────────────────────

export interface WaitlistEntry { userId: string; name: string; avatar: string; title: string; since: string }

/** Founder: list who is waiting for a seat in her bubble. */
export async function fetchWaitlist(bubbleId: string): Promise<WaitlistEntry[]> {
  const { data, error } = await supabase
    .from('waitlist')
    .select('user_id, created_at, profiles(id, name, avatar_url, title)')
    .eq('bubble_id', bubbleId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((w: any) => ({
    userId: w.user_id,
    name: w.profiles?.name ?? 'Member',
    avatar: w.profiles?.avatar_url ?? '',
    title: w.profiles?.title ?? '',
    since: fmtDate(w.created_at),
  }));
}

/** Founder: admit a waitlisted woman into a free seat (server-checked). */
export async function admitFromWaitlist(bubbleId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('admit_from_waitlist', {
    target_bubble: bubbleId, target_user: userId,
  });
  if (error) throw error;
}

/** Leave a waitlist (self). */
export async function leaveWaitlist(bubbleId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  // Deliberately NOT assertTouched: you may always delete your own waitlist row,
  // so "0 rows" means it was already gone (e.g. the founder just admitted you) —
  // that is the desired end state, not a permission failure.
  const { error } = await supabase
    .from('waitlist').delete()
    .eq('bubble_id', bubbleId).eq('user_id', user.id);
  if (error) throw error;
}

/** Founder: hand the founder role to another member. */
export async function transferFounder(
  bubbleId: string, newFounderId: string, leaveBubble = false,
): Promise<void> {
  const { error } = await supabase.rpc('transfer_founder', {
    target_bubble: bubbleId, new_founder: newFounderId, leave_bubble: leaveBubble,
  });
  if (error) throw error;
}

/** Cast/replace/remove my vote on a resource. Pass null to remove. */
export async function voteOnResource(resourceId: string, vote: 'up' | 'down' | null): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  if (vote === null) {
    // Deliberately NOT assertTouched: removing a vote you never cast is a
    // no-op, not a failure. RLS always permits deleting your own vote.
    const { error } = await supabase
      .from('resource_votes')
      .delete()
      .eq('resource_id', resourceId)
      .eq('user_id', user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('resource_votes')
      .upsert({ resource_id: resourceId, user_id: user.id, vote });
    if (error) throw error;
  }
}

// ─── Fork, founder seat, closing ─────────────────────────────────────────────

/** Copy a Bubble's sessions into a new Bubble of my own. Returns the new id. */
export async function forkBubble(sourceId: string, opts: {
  title?: string; maxSeats?: number; scheduleDay?: string; scheduleTime?: string;
  startDate?: string | null; founderLearns?: boolean | null;
} = {}): Promise<string> {
  const { data, error } = await supabase.rpc('fork_bubble', {
    source_bubble: sourceId,
    p_title: opts.title ?? null,
    p_max_seats: opts.maxSeats ?? 8,
    p_schedule_day: opts.scheduleDay ?? null,
    p_schedule_time: opts.scheduleTime ?? null,
    p_start_date: opts.startDate ?? null,
    p_founder_learns: opts.founderLearns ?? null,
  });
  if (error) throw error;
  return data as string;
}

/** Founder: take or give up my own learning seat. */
export async function setFounderSeat(bubbleId: string, learns: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_founder_seat', {
    target_bubble: bubbleId, p_learns: learns,
  });
  if (error) throw error;
}

/** Founder: close the Bubble. The syllabus stays and can be forked. */
export async function closeBubble(id: string): Promise<void> {
  await updateBubbleRow(id, { status: 'closed' });
}

// ─── Ownership requests ──────────────────────────────────────────────────────

export async function requestOwnership(bubbleId: string, message = ''): Promise<string> {
  const { data, error } = await supabase.rpc('request_ownership', {
    p_bubble: bubbleId, p_message: message,
  });
  if (error) throw error;
  return data as string;
}

export async function respondOwnershipRequest(requestId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_ownership_request', {
    p_request: requestId, p_accept: accept,
  });
  if (error) throw error;
}

export async function withdrawOwnershipRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('withdraw_ownership_request', { p_request: requestId });
  if (error) throw error;
}

type OwnershipRow = {
  id: string; bubble_id: string; requester_id: string; message: string | null;
  status: OwnershipStatus; due_at: string; profiles?: { name: string } | null;
};

/** Open (pending or escalated) requests for a Bubble I can see. */
export async function fetchOwnershipRequests(bubbleId: string): Promise<OwnershipRequest[]> {
  const { data, error } = await supabase
    .from('ownership_requests')
    .select('id, bubble_id, requester_id, message, status, due_at, profiles:requester_id(name)')
    .eq('bubble_id', bubbleId)
    .in('status', ['pending', 'escalated'])
    .order('created_at');
  if (error) throw error;
  return ((data ?? []) as unknown as OwnershipRow[]).map(r => ({
    id: r.id, bubbleId: r.bubble_id, requesterId: r.requester_id,
    requesterName: r.profiles?.name ?? 'A member', message: r.message ?? '',
    status: r.status, dueAt: r.due_at,
  }));
}

// ─── Notifications ───────────────────────────────────────────────────────────

type NotificationRow = {
  id: string; kind: AppNotification['kind']; bubble_id: string | null;
  message: string; read_at: string | null; created_at: string;
};

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, bubble_id, message, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map(r => ({
    id: r.id, kind: r.kind, bubbleId: r.bubble_id, message: r.message,
    read: r.read_at !== null, createdAt: r.created_at,
  }));
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase
    .from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
  if (error) throw error;
}

// ─── Syllabus import ─────────────────────────────────────────────────────────

export interface ImportIssue { path: string; message: string }

/** Check a pasted/uploaded syllabus against the server's rules. */
export async function validateSyllabusImport(
  payload: unknown,
): Promise<{ ok: boolean; errors: ImportIssue[] }> {
  const { data, error } = await supabase.rpc('validate_syllabus_import', { payload });
  if (error) throw error;
  const d = data as { ok: boolean; errors?: ImportIssue[] };
  return { ok: !!d.ok, errors: d.errors ?? [] };
}

/** Append the imported sessions (locked) to a Bubble. Returns how many were added. */
export async function importSyllabus(bubbleId: string, payload: unknown): Promise<number> {
  const { data, error } = await supabase.rpc('import_syllabus', {
    p_bubble: bubbleId, p_payload: payload,
  });
  if (error) throw error;
  return data as number;
}

/** Does the signed-in woman hold a learning seat in this Bubble? (null = not a member) */
export async function fetchMyHoldsSeat(bubbleId: string): Promise<boolean | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('bubble_members').select('holds_seat')
    .eq('bubble_id', bubbleId).eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data ? !!(data as { holds_seat: boolean }).holds_seat : null;
}

/** Supabase errors are plain objects with a `message`, not Error instances. */
export function errorMessage(err: unknown, fallback: string): string {
  const m = (err as { message?: unknown } | null)?.message;
  return typeof m === 'string' && m ? m : fallback;
}
