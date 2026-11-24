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

// Per-session Learn / Discuss content and homework — written for the
// "AI-Native Product Design" demo course but intentionally concrete so
// every session reads like a real facilitator plan.
const SESSION_CONTENT: {
  learn: string;
  discuss: string;
  lastWeek: string;
  preMaterials: string;
  homework?: string;
}[] = [
  {
    // 0 — Introduction & Foundations
    lastWeek: 'First session — no task yet. Quick round of introductions instead: name, role, and one thing you want to get from this Bubble.',
    learn:    'Walk through what makes an AI-native product different from traditional software: latency as UX, probabilistic outputs, and progressive trust. Three live product examples — one that handles all three well, two that don\'t.',
    discuss:  'Pairs: pick one AI product you use every week. Where does it feel intentionally designed? Where does it feel like the AI was bolted on? 10 minutes, then share one finding with the group.',
    preMaterials: 'Watch the Figma AI deep-dive (15 min, linked in resources). Come ready to name one thing that surprised you and one thing that felt half-baked.',
    homework: 'Map one AI product you use daily: a screenshot, what the AI actually does, where it surprises you, and one specific thing you\'d change. Bring it as a screenshot + 3 bullet points to share at the start of session 2.',
  },
  {
    // 1 — Core Concepts Deep Dive
    lastWeek: 'Whoever submitted shows her product map. Two minutes each — screenshot on screen, walk through the three bullet points. One comment from the group after each.',
    learn:    'Go deeper on the three concepts from session 1. Latency: how Vercel\'s AI toolbar uses skeleton states and streaming to make 3-second waits feel fast. Probabilistic outputs: how Notion AI surfaces uncertainty without breaking flow. Progressive trust: how GitHub Copilot earns the right to autocomplete more over time.',
    discuss:  'Which of the three concepts shows up most in your own work right now? Pairs share a specific moment — a screen, a flow, a edge case — where it mattered or caused a problem.',
    preMaterials: 'Read the NN/g article "Designing AI: The UX of Machine Learning" (10 min, linked). Annotate one thing you agree with and one thing you\'d push back on.',
    homework: 'Pick one of the three concepts and find it in a product you work on or use regularly. Document what the product does well, where it breaks down, and one concrete change. Share as a Loom or annotated slide.',
  },
  {
    // 2 — Practical Frameworks
    lastWeek: 'Whoever submitted shows her Loom or slide. Two minutes, then one comment. Focus on: did the concept actually show up the way she expected?',
    learn:    'Two frameworks in depth. The AI confidence spectrum: five levels from silent to assertive, with a real product example at each level. The human-override pattern: when to surface a manual escape hatch, and three ways to do it without making users feel like they\'re fighting the AI.',
    discuss:  'Take a product from last week\'s homework. Run it through the confidence spectrum — where does it sit? Does it use the human-override pattern? Where does it fall short? Pairs annotate together, then report back.',
    preMaterials: 'Pick one product from your portfolio that has any AI or automation. Write 2 sentences: what does the AI do, and what does the user have to trust?',
    homework: 'Apply the AI confidence spectrum to your portfolio product. Mark every touchpoint where the system expresses confidence — or should. Bring a marked-up screenshot.',
  },
  {
    // 3 — Hands-On Workshop
    lastWeek: 'Marked-up screenshots on screen. Two minutes each — walk through one touchpoint you marked and why. The group picks the most interesting one to redesign together.',
    learn:    'Live redesign of the screenshot the group chose. The leader drives, everyone contributes. Apply the confidence spectrum and the override pattern. Work through three iterations in 25 minutes.',
    discuss:  'The group votes on the two changes from the redesign that would have the most impact. What would we do differently with 2 more hours?',
    preMaterials: 'Bring your marked-up screenshot from last week in a format you can share on screen. No new prep needed — the work you already did is the material.',
    homework: 'Take the redesign we did together and apply it to your own product. One screen, one specific change, same framework. Share a before/after — doesn\'t have to be polished.',
  },
  {
    // 4 — Guest Expert Session
    lastWeek: 'Before/afters on screen. Two minutes each. Focus on what changed and what the framework forced you to notice.',
    learn:    'Guest walks through a project from brief to shipped: what the AI was supposed to do, what actually happened in testing, and the two design decisions that made the difference. Leave 10 minutes for the prepared questions.',
    discuss:  'What surprised you about how the guest handled the hardest part of the project? Each pair picks one thing to steal and applies it to their own work.',
    preMaterials: 'Look up the guest\'s work before the session (link in resources). Write one specific question — something you can\'t google and that only someone who built it could answer.',
    homework: 'Take one idea from the guest\'s talk and apply it to something you\'re working on. Document the before and after in a slide or a written note.',
  },
  {
    // 5 — Mid-Program Review
    lastWeek: 'Guest follow-up: who applied something from the last session? Share what you tried, even if it didn\'t work.',
    learn:    'Look back at sessions 1–5 together. The leader maps the concepts on a whiteboard. The group votes on which ones landed cleanly and which are still fuzzy. Spend the last 15 minutes on the two fuzziest ones.',
    discuss:  'Each person answers: what is the one thing from the first half you are actually using in your work? What is still abstract? Be specific — name a screen or a decision, not a concept.',
    preMaterials: 'Skim your notes or deliverables from sessions 1–5. Flag one thing you feel confident about and one thing you\'re still not sure how to use.',
    homework: 'Write a 5-sentence brief for your project: what you\'re designing, what AI challenge it solves, what you\'ve already tried, and what you\'re still figuring out. This becomes your working brief for the second half.',
  },
  {
    // 6 — Advanced Techniques
    lastWeek: 'Briefs on screen. Two minutes each — read it aloud, then one clarifying question from the group.',
    learn:    'Three advanced patterns. Streaming UX: how to design for outputs that arrive word by word without making users feel they\'re watching a typewriter. Error recovery: how to surface when the AI got it wrong without destroying trust. Designing for model updates: how to build interfaces that don\'t break when the underlying model changes.',
    discuss:  'Which of the three patterns applies most to your project right now? Pairs sketch one specific change they could make this week — a note, a rough wireframe, a decision.',
    preMaterials: 'Read your project brief from last session. Come with one specific interaction where the AI output can be wrong and there\'s currently no recovery designed for it.',
    homework: 'Pick one of the three patterns and implement or prototype it in your project. Bring a working prototype or annotated mockup — doesn\'t need to be pixel-perfect.',
  },
  {
    // 7 — Real-World Case Studies
    lastWeek: 'Prototypes and mockups on screen. Two minutes each — show the interaction, name the pattern you applied, say what surprised you.',
    learn:    'Two case studies side by side. Case 1: a product that launched well — walk through the three design decisions that held up under real users. Case 2: a product that didn\'t — walk through the one decision that looked fine in testing and failed in production.',
    discuss:  'Take the failed case study. In pairs: identify the one design decision you would have changed, and what you\'d have done instead. Then bring it back — does anyone disagree?',
    preMaterials: 'Think of an AI product launch you remember — one that impressed you or one that flopped. Come ready to say what happened and why you think it did.',
    homework: 'Audit your own project against the two case studies: list two decisions you\'re making that match the successful one, and one that resembles the failure. Three bullet points.',
  },
  {
    // 8 — Peer Feedback & Critique
    lastWeek: 'Audits on screen. Two minutes each — read the three bullet points, say which failure pattern you spotted in your own work.',
    learn:    'Structured critique: each project gets 5 minutes of presentation and 5 minutes of feedback using this rubric — clarity of the AI\'s role, quality of the confidence signal, handling of errors. The leader models the first round.',
    discuss:  'After all critiques: what pattern of feedback showed up across every project? What is the group still not sure how to solve?',
    preMaterials: 'Prepare a 5-minute presentation of your project: problem, solution, one interaction that uses AI, and one thing you\'re still unsure about. Practice it once.',
    homework: 'Take the feedback from today and make one specific change to your project. Document what changed and why in a note or a slide. This is your penultimate version.',
  },
  {
    // 9 — Final Project & Wrap-Up
    lastWeek: 'Penultimate versions on screen. Two minutes each — what changed since the critique, and what you decided not to change.',
    learn:    'No new material today. Brief framing of what a finished project demonstrates — then straight into final presentations. Each person gets 8 minutes: 5 to present, 3 for questions.',
    discuss:  'After all presentations: what did this group get consistently right across projects? What would we do differently in a second run of this Bubble?',
    preMaterials: 'Finish your final project. It should include: the problem, your solution, at least one AI interaction you designed from scratch, and one paragraph on what you learned building it.',
    homework: undefined,
  },
];

function makeSeedSections(sessionIdx: number): SessionSection[] {
  const c = SESSION_CONTENT[sessionIdx] ?? SESSION_CONTENT[SESSION_CONTENT.length - 1];
  const base: Omit<SessionSection, 'id'>[] = [
    { type: 'check-in',  title: 'Check-in',          minutes: 10, whatHappens: 'Go around: each person says in one sentence what she did since last time.' },
    { type: 'last-week', title: "Last week's task",   minutes: 15, whatHappens: c.lastWeek },
    { type: 'learn',     title: 'Learn',              minutes: 30, whatHappens: c.learn    },
    { type: 'discuss',   title: 'Discuss',            minutes: 25, whatHappens: c.discuss  },
    { type: 'wrap-up',   title: 'Wrap-up',            minutes: 10, whatHappens: 'Agree on the task for next time and who leads the next session.' },
  ];
  return base.map((s, i) => ({ ...s, id: `s${sessionIdx + 1}-${i}` }));
}

function makeSessions(count: number, doneTo: number, founderId: string): Session[] {
  return Array.from({ length: count }, (_, i) => {
    const c = SESSION_CONTENT[i] ?? SESSION_CONTENT[SESSION_CONTENT.length - 1];
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
      preMaterials: c.preMaterials,
      homework: c.homework,
    };
    return session;
  });
}

// ─── Resources ────────────────────────────────────────────────────────────────

function makeResources(founderId: string): Resource[] {
  return [
    {
      id: 'r-1', type: 'article', title: '10 Usability Heuristics Applied to AI',
      url: 'https://www.nngroup.com/articles/ai-ux-heuristics/', description: 'NNg maps Nielsen\'s 10 heuristics to AI-specific failure modes — good frame for auditing any AI interface.',
      uploadedById: founderId, uploadedAt: 'Feb 10, 2026',
      watched: true, personalRating: 'up',
      communityRatings: [{ userId: 'user-dana', vote: 'up' }, { userId: 'user-shir', vote: 'up' }],
    },
    {
      id: 'r-2', type: 'video', title: 'Designing with AI — Google I/O 2024',
      url: 'https://www.youtube.com/watch?v=4mAlFCxoAn4', description: '45-min talk on how Google redesigned Workspace features around Gemini. Strong on latency UX and trust signals.',
      uploadedById: 'user-dana', uploadedAt: 'Feb 14, 2026',
      watched: false, personalRating: null,
      communityRatings: [{ userId: founderId, vote: 'up' }],
    },
    {
      id: 'r-3', type: 'tool', title: 'Maze — Rapid Usability Testing',
      url: 'https://maze.co/usability-testing/', description: 'Run unmoderated tests on prototypes in hours. We used this for session 3\'s redesign — free tier covers most of what you need.',
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
