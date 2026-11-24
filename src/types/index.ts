// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  title: string; // professional title e.g. "UX Designer"
  joinedBubbles: string[];     // bubble IDs
  waitlistedBubbles: string[]; // bubble IDs where I'm on the waitlist
  notifyConsent: boolean;
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

export type BubbleStatus = 'open' | 'full' | 'active' | 'closed';
export type BubbleLevel  = 'Beginner' | 'Intermediate' | 'Advanced';
export type BubbleTopic  =
  | 'AI-Native Product Design'
  | 'Prompt Engineering for PMs'
  | 'Designing AI UX Patterns'
  | 'AI-Powered User Research'
  | 'Product Strategy in the AI Era'
  | 'Design Systems for AI Products'
  | string;

export interface Bubble {
  id: string;
  title: string;
  topic: BubbleTopic;
  description: string;
  level: BubbleLevel;
  status: BubbleStatus;
  maxSeats: number;       // always 2–8 (4 recommended)
  takenSeats: number;
  scheduleDay: string;    // "Tuesday"
  scheduleTime: string;   // "7:00 PM"
  startDate: string;      // "Mar 14, 2026"
  founderId: string;
  forkedFrom?: string;    // bubble id this one was forked from
  creditChain?: CreditEntry[]; // oldest first; immutable
  memberIds: string[];
  members?: Member[];     // populated from the database when signed in
  sessions: Session[];
  resources: Resource[];
  heroImage?: string;
  whatsappLink?: string;
  detailLoaded?: boolean; // true once sessions/resources have been fetched
}

export interface CreditEntry { bubbleId: string; title: string; author: string }

// ─── Notifications & ownership requests ───────────────────────────────────────

export type NotificationKind =
  | 'ownership_request' | 'ownership_accepted' | 'ownership_declined'
  | 'ownership_escalated' | 'ownership_for_admin' | 'info';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  bubbleId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export type OwnershipStatus = 'pending' | 'escalated' | 'accepted' | 'declined' | 'withdrawn';

export interface OwnershipRequest {
  id: string;
  bubbleId: string;
  requesterId: string;
  requesterName: string;
  message: string;
  status: OwnershipStatus;
  dueAt: string;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export type SessionStatus = 'draft' | 'this-week' | 'done';

export type SectionType = 'check-in' | 'last-week' | 'learn' | 'discuss' | 'practice' | 'wrap-up';

export interface SessionSection {
  id: string;
  type: SectionType;
  title: string;
  minutes: number;
  whatHappens?: string;
  notes?: string;
}

export interface ExtraResource {
  id: string;
  title: string;
  url: string;
  description: string;
}

export type SubmissionType = 'text' | 'file' | 'link' | 'image';

export interface Session {
  id: string;
  number: number;       // 1, 2, 3... → displayed as S01, S02...
  title: string;
  status: SessionStatus;
  date: string;         // YYYY-MM-DD
  duration: number;     // minutes total (sum of section minutes)
  xp: number;
  level: BubbleLevel;
  learningObjective: string; // "By the end, we'll be able to…"
  ledBy: string;             // member id
  submissionTypes: SubmissionType[];
  sections: SessionSection[];
  preMaterials?: string;
  homework?: string;
  extraResources?: ExtraResource[];
  /** Member ids who marked this session done (group progress). */
  completedBy?: string[];
  // progress state
  projectUrl?: string;
  reflectionNote?: string;
  confidenceRating?: number; // 1–5
}

// ─── Member ───────────────────────────────────────────────────────────────────

export type MemberRole = 'founder' | 'member';

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  avatar: string;
  title: string;       // professional title
  joinDate: string;    // "Jan 2026"
  postCount: number;
  online: boolean;
}

// ─── Resource ─────────────────────────────────────────────────────────────────

export type ResourceType = 'video' | 'article' | 'book' | 'tool' | 'podcast' | 'other';

export interface CommunityRating {
  userId: string;
  vote: 'up' | 'down';
}

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  description: string;
  uploadedById: string;
  uploadedAt: string;  // "Mar 1, 2026"
  watched: boolean;    // did uploader watch/read it?
  personalRating: 'up' | 'down' | null;
  communityRatings: CommunityRating[];
}
