// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  title: string; // professional title e.g. "UX Designer"
  joinedBubbles: string[]; // bubble IDs
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
  maxSeats: number;       // always 4–8
  takenSeats: number;
  scheduleDay: string;    // "Tuesday"
  scheduleTime: string;   // "7:00 PM"
  startDate: string;      // "Mar 14, 2026"
  founderId: string;
  memberIds: string[];
  sessions: Session[];
  resources: Resource[];
  heroImage?: string;
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
