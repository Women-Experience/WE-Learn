import type { Bubble, Member, Resource, Session, SessionSection, User } from '../types';

// ─── Avatar URLs (Unsplash) ───────────────────────────────────────────────────

const AVATARS = {
  maya:    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
  noa:     'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop',
  dana:    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop',
  shir:    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop',
  tamar:   'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop',
  liat:    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop',
  ronit:   'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&h=80&fit=crop',
  hadas:   'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=80&h=80&fit=crop',
  you:     'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop',
};

const HERO_IMAGES = {
  ai:       'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&fit=crop',
  ux:       'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&fit=crop',
  research: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&fit=crop',
  product:  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&fit=crop',
  strategy: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&fit=crop',
  design:   'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&fit=crop',
  systems:  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&fit=crop',
};

// ─── Current User (mock "me") ─────────────────────────────────────────────────

export const MOCK_ME: User = {
  id: 'user-me',
  name: 'Maya Cohen',
  email: 'maya@welearn.co.il',
  avatar: AVATARS.maya,
  title: 'UX Designer',
  joinedBubbles: ['bubble-1', 'bubble-3'],
};

// ─── Members ─────────────────────────────────────────────────────────────────

export const MOCK_MEMBERS: Record<string, Member> = {
  'user-me': {
    id: 'user-me', name: 'Maya Cohen', role: 'member',
    avatar: AVATARS.maya, title: 'UX Designer',
    joinDate: 'Jan 2026', postCount: 12, online: true,
  },
  'user-noa': {
    id: 'user-noa', name: 'Noa Levi', role: 'founder',
    avatar: AVATARS.noa, title: 'Product Manager',
    joinDate: 'Dec 2025', postCount: 34, online: true,
  },
  'user-dana': {
    id: 'user-dana', name: 'Dana Shapiro', role: 'member',
    avatar: AVATARS.dana, title: 'Senior UX Researcher',
    joinDate: 'Jan 2026', postCount: 8, online: false,
  },
  'user-shir': {
    id: 'user-shir', name: 'Shir Ben-David', role: 'member',
    avatar: AVATARS.shir, title: 'Product Designer',
    joinDate: 'Feb 2026', postCount: 5, online: true,
  },
  'user-tamar': {
    id: 'user-tamar', name: 'Tamar Katz', role: 'founder',
    avatar: AVATARS.tamar, title: 'Head of Product',
    joinDate: 'Nov 2025', postCount: 47, online: false,
  },
  'user-liat': {
    id: 'user-liat', name: 'Liat Mizrahi', role: 'member',
    avatar: AVATARS.liat, title: 'UX Lead',
    joinDate: 'Jan 2026', postCount: 21, online: true,
  },
  'user-ronit': {
    id: 'user-ronit', name: 'Ronit Peretz', role: 'member',
    avatar: AVATARS.ronit, title: 'Design Researcher',
    joinDate: 'Feb 2026', postCount: 3, online: false,
  },
  'user-hadas': {
    id: 'user-hadas', name: 'Hadas Goldberg', role: 'founder',
    avatar: AVATARS.hadas, title: 'UX Strategy Consultant',
    joinDate: 'Oct 2025', postCount: 62, online: true,
  },
};

// ─── Sessions factory ─────────────────────────────────────────────────────────

const SESSION_TITLES = [
  'Introduction & Foundations',
  'Core Concepts Deep Dive',
  'Practical Frameworks',
  'Hands-On Workshop',
  'Guest Expert Session',
  'Mid-Program Review',
  'Advanced Techniques',
  'Real-World Case Studies',
  'Peer Feedback & Critique',
  'Final Project & Wrap-Up',
];

const LEARNING_OBJECTIVES = [
  'identify the core AI design principles that make AI-native products different from traditional software',
  'explain the key frameworks from this program and apply one to a real product example',
  'choose the right framework for a given design challenge and justify the choice to the group',
  'build a working prototype that demonstrates at least one AI design pattern',
  'evaluate an expert\'s approach and extract two insights to bring into our own work',
  'give structured peer feedback on three projects using the rubric from session 3',
  'apply at least one advanced technique to refine an existing design from an earlier session',
  'diagnose what worked and what failed in two real AI product launches',
  'run a 5-minute critique using the critique format we practiced in session 3',
  'present a complete project that incorporates at least three concepts from this program',
];

const DATES = [
  '2026-02-18', '2026-02-25', '2026-03-04', '2026-03-11',
  '2026-03-18', '2026-03-25', '2026-04-01', '2026-04-08',
  '2026-04-15', '2026-04-22',
];

function makeSeedSections(sessionIdx: number): SessionSection[] {
  const base: Omit<SessionSection, 'id'>[] = [
    { type: 'check-in',  title: 'Check-in',          minutes: 10, whatHappens: 'Go around: each person says in one sentence what she did since last time.' },
    { type: 'last-week', title: "Last week's task",   minutes: 15, whatHappens: 'Whoever submitted shows her work. Two minutes each, then one comment from the group.' },
    { type: 'learn',     title: 'Learn',              minutes: 30, whatHappens: 'Whoever is leading walks through the material. Stop for questions as they come.' },
    { type: 'discuss',   title: 'Discuss',            minutes: 25, whatHappens: 'Split into pairs for 10 minutes, then bring it back to the group.' },
    { type: 'wrap-up',   title: 'Wrap-up',            minutes: 10, whatHappens: 'Agree on the task for next time and who leads the next session.' },
  ];
  return base.map((s, i) => ({ ...s, id: `s${sessionIdx + 1}-${i}` }));
}

function makeSessions(count: number, doneTo: number, founderId: string): Session[] {
  return Array.from({ length: count }, (_, i) => {
    const isFirst = i === 0;
    const session: Session = {
      id: `s-${i + 1}`,
      number: i + 1,
      title: SESSION_TITLES[i] ?? `Session ${i + 1}`,
      status: (i < doneTo ? 'done' : i === doneTo ? 'this-week' : 'draft') as Session['status'],
      date: DATES[i] ?? '2026-05-01',
      duration: 90,
      xp: 150,
      level: (i < 2 ? 'Beginner' : i < 5 ? 'Intermediate' : 'Advanced') as Session['level'],
      learningObjective: LEARNING_OBJECTIVES[i] ?? 'apply the core concepts from this session to a real example',
      ledBy: founderId,
      submissionTypes: ['link'],
      sections: makeSeedSections(i),
      preMaterials: isFirst
        ? 'Come ready to introduce yourself in 60 seconds: your name, role, and one thing you want to get out of this Bubble.'
        : undefined,
      homework: isFirst
        ? 'Map one real AI product you use daily: what it does, where it surprises you, and one thing you\'d change. Bring it as a screenshot + 3 bullet points to share at the start of session 2.'
        : undefined,
    };
    return session;
  });
}

// ─── Resources ────────────────────────────────────────────────────────────────

function makeResources(founderId: string): Resource[] {
  return [
    {
      id: 'r-1', type: 'article', title: 'Designing for AI: A Practical Guide',
      url: 'https://nngroup.com/articles/ai-ux', description: 'NNg\'s comprehensive overview of UX patterns for AI-powered products.',
      uploadedById: founderId, uploadedAt: 'Feb 10, 2026',
      watched: true, personalRating: 'up',
      communityRatings: [{ userId: 'user-dana', vote: 'up' }, { userId: 'user-shir', vote: 'up' }],
    },
    {
      id: 'r-2', type: 'video', title: 'Figma Make Deep Dive — YouTube',
      url: 'https://youtube.com', description: 'Full walkthrough of Figma Make for AI-assisted design workflows.',
      uploadedById: 'user-dana', uploadedAt: 'Feb 14, 2026',
      watched: false, personalRating: null,
      communityRatings: [{ userId: founderId, vote: 'up' }],
    },
    {
      id: 'r-3', type: 'tool', title: 'Maze — Usability Testing Platform',
      url: 'https://maze.co', description: 'Great for unmoderated research on prototypes. Free tier is generous.',
      uploadedById: 'user-me', uploadedAt: 'Feb 20, 2026',
      watched: true, personalRating: 'up',
      communityRatings: [],
    },
  ];
}

// ─── Bubbles ─────────────────────────────────────────────────────────────────

export const MOCK_BUBBLES: Bubble[] = [
  {
    id: 'bubble-1',
    title: 'AI-Native Product Design',
    topic: 'AI-Native Product Design',
    description: 'Learn to design products that leverage AI capabilities from the ground up — prompts, patterns, and prototypes.',
    level: 'Intermediate',
    status: 'active',
    maxSeats: 8,
    takenSeats: 6,
    scheduleDay: 'Tuesday',
    scheduleTime: '7:00 PM',
    startDate: 'Feb 18, 2026',
    founderId: 'user-me',
    memberIds: ['user-me', 'user-noa', 'user-dana', 'user-shir', 'user-liat', 'user-ronit'],
    heroImage: HERO_IMAGES.ai,
    sessions: makeSessions(8, 3, 'user-me'),
    resources: makeResources('user-noa'),
  },
  {
    id: 'bubble-2',
    title: 'Prompt Engineering for PMs',
    topic: 'Prompt Engineering for PMs',
    description: 'Master the art of prompt engineering as a product manager — write better specs, conduct smarter research, and communicate with AI tools.',
    level: 'Beginner',
    status: 'open',
    maxSeats: 6,
    takenSeats: 3,
    scheduleDay: 'Thursday',
    scheduleTime: '6:00 PM',
    startDate: 'Mar 5, 2026',
    founderId: 'user-tamar',
    memberIds: ['user-tamar', 'user-hadas', 'user-ronit'],
    heroImage: HERO_IMAGES.product,
    sessions: makeSessions(6, 0, 'user-tamar'),
    resources: makeResources('user-tamar'),
  },
  {
    id: 'bubble-3',
    title: 'Designing AI UX Patterns',
    topic: 'Designing AI UX Patterns',
    description: 'Explore patterns for streaming outputs, loading states, feedback loops, and trust UX in AI-powered interfaces.',
    level: 'Intermediate',
    status: 'open',
    maxSeats: 8,
    takenSeats: 5,
    scheduleDay: 'Wednesday',
    scheduleTime: '6:00 PM',
    startDate: 'Mar 12, 2026',
    founderId: 'user-hadas',
    memberIds: ['user-hadas', 'user-me', 'user-liat', 'user-dana', 'user-shir'],
    heroImage: HERO_IMAGES.ux,
    sessions: makeSessions(7, 1, 'user-hadas'),
    resources: makeResources('user-hadas'),
  },
  {
    id: 'bubble-4',
    title: 'AI-Powered User Research',
    topic: 'AI-Powered User Research',
    description: 'Use AI tools to synthesize interviews, analyze patterns, and run research at scale. Practical, hands-on, and research-led.',
    level: 'Advanced',
    status: 'full',
    maxSeats: 6,
    takenSeats: 6,
    scheduleDay: 'Monday',
    scheduleTime: '7:30 PM',
    startDate: 'Feb 25, 2026',
    founderId: 'user-dana',
    memberIds: ['user-dana', 'user-noa', 'user-tamar', 'user-liat', 'user-ronit', 'user-hadas'],
    heroImage: HERO_IMAGES.research,
    sessions: makeSessions(8, 2, 'user-dana'),
    resources: makeResources('user-dana'),
  },
  {
    id: 'bubble-5',
    title: 'Product Strategy in the AI Era',
    topic: 'Product Strategy in the AI Era',
    description: 'Rethink roadmaps, prioritization, and strategy in a world where AI changes the rules every quarter.',
    level: 'Advanced',
    status: 'open',
    maxSeats: 8,
    takenSeats: 2,
    scheduleDay: 'Sunday',
    scheduleTime: '10:00 AM',
    startDate: 'Mar 19, 2026',
    founderId: 'user-tamar',
    memberIds: ['user-tamar', 'user-noa'],
    heroImage: HERO_IMAGES.strategy,
    sessions: makeSessions(6, 0, 'user-tamar'),
    resources: makeResources('user-tamar'),
  },
  {
    id: 'bubble-6',
    title: 'Design Systems for AI Products',
    topic: 'Design Systems for AI Products',
    description: 'Build scalable design systems that account for AI-generated content, dynamic interfaces, and component variability.',
    level: 'Intermediate',
    status: 'open',
    maxSeats: 8,
    takenSeats: 4,
    scheduleDay: 'Friday',
    scheduleTime: '1:00 PM',
    startDate: 'Mar 26, 2026',
    founderId: 'user-liat',
    memberIds: ['user-liat', 'user-shir', 'user-ronit', 'user-hadas'],
    heroImage: HERO_IMAGES.systems,
    sessions: makeSessions(8, 0, 'user-liat'),
    resources: makeResources('user-liat'),
  },
];

// ─── Helper: get bubble by id ─────────────────────────────────────────────────

export function getBubbleById(id: string): Bubble | undefined {
  return MOCK_BUBBLES.find(b => b.id === id);
}

// ─── Helper: get member by id ─────────────────────────────────────────────────

export function getMemberById(id: string): Member | undefined {
  return MOCK_MEMBERS[id];
}

// ─── Helper: get members of a bubble ─────────────────────────────────────────

export function getBubbleMembers(bubble: Bubble): Member[] {
  return bubble.memberIds
    .map(id => MOCK_MEMBERS[id])
    .filter(Boolean) as Member[];
}

// ─── Helper: status display ───────────────────────────────────────────────────

export const STATUS_LABELS: Record<Bubble['status'], string> = {
  open:   'Starting Soon',
  full:   'Full',
  active: 'In Progress',
  closed: 'Closed',
};

export const STATUS_COLORS: Record<Bubble['status'], { bg: string; text: string; border: string }> = {
  open:   { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD' },
  full:   { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
  active: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  closed: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' },
};
