import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Bot, Brain, Sparkles, Search, Rocket, Layout,
  Sprout, TrendingUp, Award,
  Check, CheckCircle2, Pencil, ChevronLeft, PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { Bubble, Session, BubbleLevel } from "../../types";
import { BabelTransition } from "./BabelTransition";
import { AuthModal } from "./AuthModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepKey = "topic" | "description" | "level" | "schedule" | "seats" | "image" | "sessions";
type Frequency = 'weekly' | 'biweekly' | 'monthly';

interface BubbleData {
  topic: string;
  description: string;
  level: BubbleLevel;
  day: string;
  time: string;
  frequency: Frequency;
  seats: number;
  heroImage?: string;
}

type FeedItem =
  | { kind: "ai";     id: number; step: StepKey; text: string }
  | { kind: "widget"; id: number; step: StepKey; locked: boolean };

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_ORDER: StepKey[] = ["topic", "description", "level", "schedule", "seats", "image", "sessions"];

const STEP_LABELS: Record<StepKey, string> = {
  topic:       'Topic',
  description: 'Description',
  level:       'Level',
  schedule:    'Schedule',
  seats:       'Group size',
  image:       'Cover image',
  sessions:    'Syllabus',
};

const TOPICS: { label: string; icon: typeof Bot; tag: string }[] = [
  { label: "AI-Native Product Design",       icon: Bot,      tag: "Design"   },
  { label: "Prompt Engineering for PMs",     icon: Brain,    tag: "AI"       },
  { label: "Designing AI UX Patterns",       icon: Sparkles, tag: "UX"       },
  { label: "AI-Powered User Research",       icon: Search,   tag: "Research" },
  { label: "Product Strategy in the AI Era", icon: Rocket,   tag: "Product"  },
  { label: "Design Systems for AI Products", icon: Layout,   tag: "Design"   },
];

const LEVELS: { label: BubbleLevel; desc: string; icon: typeof Sprout }[] = [
  { label: "Beginner",     desc: "No prior experience needed",   icon: Sprout      },
  { label: "Intermediate", desc: "Some foundational knowledge",  icon: TrendingUp  },
  { label: "Advanced",     desc: "Experienced practitioners",    icon: Award       },
];

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const FULL_DAYS: Record<string, string> = {
  Mon:"Monday",Tue:"Tuesday",Wed:"Wednesday",Thu:"Thursday",
  Fri:"Friday",Sat:"Saturday",Sun:"Sunday",
};
const TIMES = [
  "07:00 AM","08:00 AM","09:00 AM","10:00 AM",
  "12:00 PM","02:00 PM","05:00 PM","06:00 PM","07:00 PM","08:00 PM",
];
const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'weekly',   label: 'Every week'      },
  { value: 'biweekly', label: 'Every 2 weeks'   },
  { value: 'monthly',  label: 'Once a month'    },
];

const PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&fit=crop',
  'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&fit=crop',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&fit=crop',
  'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&fit=crop',
];

const AI_PROMPTS: Record<StepKey, string> = {
  topic:       "I'm your Bubble guide. What topic do you want to teach or facilitate? Choose one below or type your own.",
  description: "How would you describe this Bubble to someone who's never heard of it? What will members walk away knowing or doing?",
  level:       "Great choice! Who is this Bubble for? What's the experience level of your participants?",
  schedule:    "Perfect. When will your group meet? Pick a day, time, and how often — sessions are 90 minutes.",
  seats:       "Almost there! How many members do you want in your Bubble?",
  image:       "Want to add a cover image? Pick one below or skip.",
  sessions:    "Last step — I'll set up a draft syllabus you can edit.",
};

// ─── Session generator ────────────────────────────────────────────────────────

/** The next date (YYYY-MM-DD, local time) that falls on the given weekday, from tomorrow on. */
function nextWeekday(day: string, from = new Date()): Date {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const target = days.indexOf(day);
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  if (target >= 0) d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7));
  return d;
}

function toLocalIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function generateMockSessions(
  topic: string, level: BubbleLevel, frequency: Frequency = 'weekly',
  start: Date = nextWeekday('Monday'), ledBy = '',
): Session[] {
  const sessionTitles = [
    "Introduction & Foundations",
    "Core Concepts Deep Dive",
    "Practical Frameworks",
    "Hands-On Workshop",
    "Guest Expert Session",
    "Final Project & Wrap-Up",
  ];
  const intervalDays = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30;
  const objectives = [
    `identify the core concepts that make ${topic} different from traditional approaches`,
    `explain the key frameworks from this program and apply one to a real example`,
    `choose the right framework for a given challenge and justify the choice to the group`,
    `build a working prototype that demonstrates at least one pattern from ${topic}`,
    `evaluate an expert's approach and extract two insights to bring into our own work`,
    `present a complete project that incorporates at least three concepts from this program`,
  ];
  return sessionTitles.map((title, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * intervalDays);
    return {
      id: `new-s-${i + 1}`,
      number: i + 1,
      title,
      status: (i === 0 ? 'this-week' : 'draft') as Session['status'],
      date: toLocalIso(d),
      duration: 90,
      xp: 150,
      level,
      learningObjective: objectives[i],
      ledBy,
      submissionTypes: ['link' as const],
      sections: [
        { id: `ns-${i}-0`, type: 'check-in'  as const, title: 'Check-in',        minutes: 10, whatHappens: 'Go around: each person says in one sentence what she did since last time.' },
        { id: `ns-${i}-1`, type: 'last-week' as const, title: "Last week's task", minutes: 15, whatHappens: 'Whoever submitted shows her work. Two minutes each, then one comment from the group.' },
        { id: `ns-${i}-2`, type: 'learn'     as const, title: 'Learn',            minutes: 30, whatHappens: 'Whoever is leading walks through the material. Stop for questions as they come.' },
        { id: `ns-${i}-3`, type: 'discuss'   as const, title: 'Discuss',          minutes: 25, whatHappens: 'Split into pairs for 10 minutes, then bring it back to the group.' },
        { id: `ns-${i}-4`, type: 'wrap-up'   as const, title: 'Wrap-up',          minutes: 10, whatHappens: 'Agree on the task for next time and who leads the next session.' },
      ],
    };
  });
}

// ─── Widgets ──────────────────────────────────────────────────────────────────

function TopicWidget({ onSelect, locked }: { onSelect: (t: string) => void; locked: boolean }) {
  const [custom, setCustom] = useState('');
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {TOPICS.map(t => (
          <button key={t.label} onClick={() => !locked && onSelect(t.label)} disabled={locked}
            className="flex items-start gap-2 p-3 rounded-xl border border-[#E9ECEF] text-left hover:border-[#00a79d] hover:bg-[#E5F5F4] transition-all disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}>
            <t.icon className="size-5 shrink-0 text-[#00a79d]" strokeWidth={1.75} />
            <div>
              <p className="text-[12px] font-semibold text-[#212529] leading-snug">{t.label}</p>
              <span className="text-[10px] bg-[#F1F3F5] text-[#6C757D] px-1.5 py-0.5 rounded-full">{t.tag}</span>
            </div>
          </button>
        ))}
      </div>
      {!locked && (
        <div className="flex gap-2">
          <input
            type="text" value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="Or type your own topic..."
            className="flex-1 px-3 py-2 rounded-xl border border-[#E9ECEF] text-[13px] bg-white focus:outline-none focus:border-[#00a79d]"
            style={{ fontFamily: 'var(--font-body)' }}
            onKeyDown={e => e.key === 'Enter' && custom.trim() && onSelect(custom.trim())}
          />
          <button onClick={() => custom.trim() && onSelect(custom.trim())}
            disabled={!custom.trim()}
            className="px-4 py-2 rounded-xl bg-[#00a79d] text-white text-[13px] font-medium disabled:opacity-40 hover:bg-[#008f86] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function LevelWidget({ onSelect, locked }: { onSelect: (l: BubbleLevel) => void; locked: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {LEVELS.map(l => (
        <button key={l.label} onClick={() => !locked && onSelect(l.label)} disabled={locked}
          className="flex items-center gap-3 p-4 rounded-xl border border-[#E9ECEF] text-left hover:border-[#00a79d] hover:bg-[#E5F5F4] transition-all disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body)' }}>
          <l.icon className="size-6 text-[#00a79d] shrink-0" strokeWidth={1.75} />
          <div>
            <p className="font-semibold text-[14px] text-[#212529]">{l.label}</p>
            <p className="text-[12px] text-[#6C757D]">{l.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function ScheduleWidget({ onSelect, locked }: {
  onSelect: (day: string, time: string, frequency: Frequency) => void;
  locked: boolean;
}) {
  const [day, setDay]   = useState('');
  const [time, setTime] = useState('');
  const [freq, setFreq] = useState<Frequency>('weekly');
  const submitted = useRef(false);

  function tryAdvance(d: string, t: string, f: Frequency) {
    if (!d || !t || submitted.current || locked) return;
    submitted.current = true;
    onSelect(FULL_DAYS[d], t, f);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[12px] text-[#6C757D] mb-2" style={{ fontFamily: 'var(--font-body)' }}>Day of week</p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(d => (
            <button key={d} onClick={() => { if (!locked) { setDay(d); tryAdvance(d, time, freq); } }} disabled={locked}
              className="px-3 py-2 rounded-xl border text-[13px] font-medium transition-all disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-body)',
                borderColor: day === d ? '#00a79d' : '#E9ECEF',
                background: day === d ? '#E5F5F4' : 'white',
                color: day === d ? '#008f86' : '#495057',
              }}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[12px] text-[#6C757D] mb-2" style={{ fontFamily: 'var(--font-body)' }}>Time</p>
        <div className="flex flex-wrap gap-2">
          {TIMES.map(t => (
            <button key={t} onClick={() => { if (!locked) { setTime(t); tryAdvance(day, t, freq); } }} disabled={locked}
              className="px-3 py-2 rounded-xl border text-[13px] font-medium transition-all disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-body)',
                borderColor: time === t ? '#00a79d' : '#E9ECEF',
                background: time === t ? '#E5F5F4' : 'white',
                color: time === t ? '#008f86' : '#495057',
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[12px] text-[#6C757D] mb-2" style={{ fontFamily: 'var(--font-body)' }}>Frequency</p>
        <div className="flex gap-2">
          {FREQUENCIES.map(f => (
            <button key={f.value} onClick={() => { if (!locked) { setFreq(f.value); tryAdvance(day, time, f.value); } }} disabled={locked}
              className="flex-1 py-2 rounded-xl border text-[13px] font-medium transition-all disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-body)',
                borderColor: freq === f.value ? '#00a79d' : '#E9ECEF',
                background: freq === f.value ? '#E5F5F4' : 'white',
                color: freq === f.value ? '#008f86' : '#495057',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bubbles hold 2–8 learners (the database enforces it). Four is recommended,
// not required: a Bubble can start with fewer and keeps accepting members.
const SEAT_OPTIONS = [
  { key: 'tiny',     label: 'Tiny',     range: '2–3 members',  desc: 'A study pair or trio',       value: 3, recommended: false },
  { key: 'standard', label: 'Standard', range: '4 members',    desc: 'Our recommendation',         value: 4, recommended: true  },
  { key: 'medium',   label: 'Roomy',    range: '5–6 members',  desc: 'More voices, more energy',   value: 6, recommended: false },
  { key: 'large',    label: 'Full',     range: '7–8 members',  desc: 'The widest a Bubble goes',   value: 8, recommended: false },
] as const;

type SeatKey = typeof SEAT_OPTIONS[number]['key'];

function SeatsWidget({ onSelect, locked }: { onSelect: (n: number) => void; locked: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
        We recommend 4. You can start with fewer, and others can join any time until it's full.
      </p>
      <div className="flex flex-col gap-2">
        {SEAT_OPTIONS.map(opt => (
          <button key={opt.key}
            onClick={() => !locked && onSelect(opt.value)}
            disabled={locked}
            className="flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all hover:border-[#00a79d] hover:bg-[#E5F5F4] disabled:opacity-50"
            style={{ borderColor: '#E9ECEF', background: 'white' }}>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-[14px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                  {opt.label}
                </p>
                {opt.recommended && (
                  <span className="text-[11px] bg-[#FFF3CD] text-[#856404] px-2 py-0.5 rounded-full font-medium"
                    style={{ fontFamily: 'var(--font-body)' }}>
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                {opt.range} · {opt.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DescriptionWidget({ onSelect, locked }: { onSelect: (desc: string) => void; locked: boolean }) {
  const [text, setText] = useState('');
  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={locked}
        rows={5}
        placeholder="In this Bubble, we'll explore... By the end, members will be able to..."
        className="w-full px-3 py-3 rounded-xl border border-[#E9ECEF] text-[14px] bg-white focus:outline-none focus:border-[#00a79d] resize-none disabled:opacity-50"
        style={{ fontFamily: 'var(--font-body)' }}
      />
      {!locked && (
        <button
          onClick={() => text.trim() && onSelect(text.trim())}
          disabled={!text.trim()}
          className="w-full py-2.5 rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors disabled:opacity-40"
          style={{ fontFamily: 'var(--font-body)' }}>
          Continue →
        </button>
      )}
    </div>
  );
}

function ImageWidget({ onSelect, locked }: { onSelect: (url?: string) => void; locked: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {PRESET_IMAGES.map(url => (
          <button key={url} onClick={() => !locked && setSelected(selected === url ? null : url)} disabled={locked}
            className="rounded-xl overflow-hidden border-2 transition-all aspect-video disabled:opacity-50"
            style={{ borderColor: selected === url ? '#00a79d' : 'transparent' }}>
            <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      {!locked && (
        <div className="flex gap-2">
          <button
            onClick={() => onSelect(selected ?? undefined)}
            disabled={!selected}
            className="flex-1 py-2.5 rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors disabled:opacity-40"
            style={{ fontFamily: 'var(--font-body)' }}>
            Use this image →
          </button>
          <button
            onClick={() => onSelect(undefined)}
            className="px-4 py-2.5 rounded-xl border border-[#E9ECEF] text-[14px] text-[#6C757D] hover:bg-[#F8F9FA] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}>
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

function SessionsWidget({ topic, level, onConfirm, locked }: {
  topic: string; level: BubbleLevel;
  onConfirm: () => void;
  locked: boolean;
}) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [phases, setPhases] = useState<string[]>([]);

  const AI_PHASES = [
    "Analyzing topic scope...",
    "Structuring learning path...",
    "Generating session titles...",
    "Adding resources & exercises...",
    "Finalizing syllabus...",
  ];

  useEffect(() => {
    if (locked) return;
    setGenerating(true);
    let i = 0;
    const interval = setInterval(() => {
      setPhases(p => [...p, AI_PHASES[i]]);
      i++;
      if (i >= AI_PHASES.length) {
        clearInterval(interval);
        setTimeout(() => { setGenerating(false); setDone(true); }, 400);
      }
    }, 600);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <div className="bg-[#E5F5F4] rounded-xl p-4 text-[13px] text-[#008f86]"
          style={{ fontFamily: 'var(--font-body)' }}>
          <CheckCircle2 className="size-4 inline mr-1.5 text-[#008f86]" strokeWidth={2} />
          6-session draft syllabus ready for <strong>{topic}</strong> ({level}).
        </div>
        <button
          onClick={() => !locked && onConfirm()}
          disabled={locked}
          className="w-full py-2.5 rounded-xl bg-[#00a79d] text-white text-[14px] font-bold hover:bg-[#008f86] transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}>
          Launch Bubble →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      {phases.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[13px] text-[#495057]"
          style={{ fontFamily: 'var(--font-body)' }}>
          <Check className="size-3.5 text-[#00a79d] shrink-0" strokeWidth={2.5} /> {p}
        </div>
      ))}
      {generating && (
        <div className="flex items-center gap-2 text-[13px] text-[#ADB5BD]"
          style={{ fontFamily: 'var(--font-body)' }}>
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#00a79d] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          Building...
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreateBabelFlow() {
  const navigate = useNavigate();
  const { createBubble, currentUser, isLoggedIn, authReady } = useApp();
  const [data, setData]           = useState<Partial<BubbleData>>({});
  const [currentStep, setCurrentStep] = useState<StepKey>('topic');
  const [feed, setFeed]           = useState<FeedItem[]>([
    { kind: 'ai',     id: 0, step: 'topic', text: AI_PROMPTS.topic },
    { kind: 'widget', id: 1, step: 'topic', locked: false },
  ]);
  const [summaries, setSummaries] = useState<Partial<Record<StepKey, string>>>({});
  const [reEditStep, setReEditStep] = useState<StepKey | null>(null);
  const [phase, setPhase]         = useState<'wizard' | 'done'>('wizard');
  const [createdBubble, setCreatedBubble] = useState<{ id: string; title: string; sessionCount: number } | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const activeWidgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeWidgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [feed, phase]);

  function advanceTo(nextStep: StepKey | null, summary: string, newData: Partial<BubbleData>) {
    const updatedData = { ...data, ...newData };
    setData(updatedData);
    setSummaries(s => ({ ...s, [currentStep]: summary }));
    setFeed(f => f.map(item =>
      item.kind === 'widget' && item.step === currentStep ? { ...item, locked: true } : item
    ));
    if (!nextStep) {
      handleLaunch(updatedData as BubbleData);
      return;
    }
    setTimeout(() => {
      setCurrentStep(nextStep);
      setFeed(f => [
        ...f,
        { kind: 'ai',     id: Date.now() + 1, step: nextStep, text: AI_PROMPTS[nextStep] },
        { kind: 'widget', id: Date.now() + 2, step: nextStep, locked: false },
      ]);
    }, 300);
  }

  function reAdvance(step: StepKey, summary: string, newData: Partial<BubbleData>) {
    setData(d => ({ ...d, ...newData }));
    setSummaries(s => ({ ...s, [step]: summary }));
    setFeed(f => f.map(item =>
      item.kind === 'widget' && item.step === step ? { ...item, locked: true } : item
    ));
    setReEditStep(null);
  }

  function unlockStep(step: StepKey) {
    setFeed(f => f.map(item =>
      item.kind === 'widget' && item.step === step ? { ...item, locked: false } : item
    ));
    setReEditStep(step);
    setCurrentStep(step);
  }

  function handleLaunch(finalData: BubbleData) {
    const sessions = generateMockSessions(
      finalData.topic, finalData.level, finalData.frequency ?? 'weekly',
      nextWeekday(finalData.day), currentUser?.id ?? '',
    );
    createBubble({
      title: finalData.topic,
      topic: finalData.topic,
      description: finalData.description,
      level: finalData.level,
      maxSeats: finalData.seats,
      scheduleDay: finalData.day,
      scheduleTime: finalData.time,
      startDate: sessions[0]?.date ?? null,
      heroImage: finalData.heroImage ?? null,
      sessions,
    })
      .then(newId => {
        setCreatedBubble({ id: newId, title: finalData.topic, sessionCount: sessions.length });
        setPhase('done');
      })
      .catch(err => {
        console.error('Failed to create bubble', err);
        toast.error(
          err?.message?.includes('signed in')
            ? 'Please sign in to create a Bubble.'
            : 'Something went wrong creating your Bubble — nothing was lost, try again.',
        );
        // Unlock the last widget so she can retry.
        setFeed(f => f.map(item =>
          item.kind === 'widget' && item.step === 'sessions' ? { ...item, locked: false } : item,
        ));
      });
  }

  const stepIndex  = STEP_ORDER.indexOf(currentStep);
  const progress   = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100);
  const lockedSteps = new Set(
    feed
      .filter((i): i is Extract<FeedItem, { kind: 'widget' }> => i.kind === 'widget' && i.locked)
      .map(i => i.step)
  );

  function renderWidget(item: Extract<FeedItem, { kind: 'widget' }>) {
    const isReEdit = reEditStep === item.step;

    switch (item.step) {
      case 'topic':
        return <TopicWidget locked={item.locked}
          onSelect={t => isReEdit
            ? reAdvance('topic', t, { topic: t })
            : advanceTo('description', t, { topic: t })} />;

      case 'description':
        return <DescriptionWidget locked={item.locked}
          onSelect={desc => {
            const summary = desc.length > 60 ? desc.slice(0, 60) + '…' : desc;
            isReEdit
              ? reAdvance('description', summary, { description: desc })
              : advanceTo('level', summary, { description: desc });
          }} />;

      case 'level':
        return <LevelWidget locked={item.locked}
          onSelect={l => isReEdit
            ? reAdvance('level', l, { level: l })
            : advanceTo('schedule', l, { level: l })} />;

      case 'schedule':
        return <ScheduleWidget locked={item.locked}
          onSelect={(day, time, frequency) => {
            const freqLabel = frequency === 'weekly' ? 'weekly' : frequency === 'biweekly' ? 'every 2 wks' : 'monthly';
            const summary = `${day} @ ${time} · ${freqLabel}`;
            isReEdit
              ? reAdvance('schedule', summary, { day, time, frequency })
              : advanceTo('seats', summary, { day, time, frequency });
          }} />;

      case 'seats':
        return <SeatsWidget locked={item.locked}
          onSelect={seats => isReEdit
            ? reAdvance('seats', `${seats} participants`, { seats })
            : advanceTo('image', `${seats} participants`, { seats })} />;

      case 'image':
        return <ImageWidget locked={item.locked}
          onSelect={url => {
            const summary = url ? 'Image set' : 'Skipped';
            isReEdit
              ? reAdvance('image', summary, { heroImage: url })
              : advanceTo('sessions', summary, { heroImage: url });
          }} />;

      case 'sessions':
        return <SessionsWidget
          topic={data.topic ?? ''}
          level={data.level ?? 'Intermediate'}
          locked={item.locked}
          onConfirm={() => advanceTo(null, '6-session draft syllabus', {})} />;

      default:
        return null;
    }
  }

  // Creating a Bubble requires an account — gate the wizard up front,
  // not after six answered steps. (Placed after all hooks per React rules.)
  if (authReady && !isLoggedIn) {
    return <AuthModal onClose={() => navigate('/')} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-[#E9ECEF] sticky top-0 z-20">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-[#6C757D] hover:text-[#212529] transition-colors">
            <ChevronLeft className="size-5" strokeWidth={1.75} />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[13px] font-semibold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                Create a Bubble
              </p>
              {phase === 'wizard' && (
                <p className="text-[12px] text-[#ADB5BD]" style={{ fontFamily: 'var(--font-body)' }}>
                  Step {stepIndex + 1} of {STEP_ORDER.length}
                </p>
              )}
            </div>
            <div className="h-1.5 bg-[#F1F3F5] rounded-full">
              <div className="h-full rounded-full bg-[#00a79d] transition-all duration-500"
                style={{ width: phase === 'done' ? '100%' : `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      {/* Confirmation screen */}
      {phase === 'done' && createdBubble && (
        <div className="flex-1 max-w-xl mx-auto w-full px-4 flex flex-col items-center justify-center gap-6 text-center py-16">
          <div className="size-16 bg-[#E5F5F4] rounded-2xl flex items-center justify-center">
            <PartyPopper className="size-8 text-[#00a79d]" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[22px] font-bold text-[#212529] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Your Bubble is ready!
            </p>
            <p className="text-[16px] font-semibold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
              {createdBubble.title}
            </p>
            <p className="text-[13px] text-[#6C757D] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              {createdBubble.sessionCount} sessions drafted · ready to edit in Course Guide
            </p>
          </div>
          <button
            onClick={() => {
              setShowTransition(true);
              setTimeout(() => navigate(`/group/${createdBubble.id}`), 1800);
            }}
            className="w-full max-w-xs py-3.5 rounded-xl bg-[#00a79d] text-white text-[15px] font-bold hover:bg-[#008f86] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}>
            Open my Bubble →
          </button>
        </div>
      )}

      {/* Feed */}
      {phase === 'wizard' && (
        <div className="flex-1 max-w-xl mx-auto w-full overflow-y-auto flex flex-col">

          {/* ── Sticky completed-steps strip ── */}
          {feed.some(i => i.kind === 'widget' && i.locked) && (
            <div className="sticky top-0 z-10 bg-[#F8F9FA] px-4 pt-3 pb-2 flex flex-col gap-1.5">
              {feed.filter(i => i.kind === 'widget' && i.locked).map(item => (
                <div key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-2xl border border-[#E9ECEF]"
                  style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px] text-[#ADB5BD] shrink-0" style={{ fontFamily: 'var(--font-body)' }}>
                      {STEP_LABELS[item.step]}
                    </span>
                    <span className="text-[12px] text-[#D1D5DB]">·</span>
                    <span className="text-[13px] font-semibold text-[#212529] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                      {summaries[item.step] ?? '—'}
                    </span>
                  </div>
                  {item.step !== 'sessions' && (
                    <button
                      onClick={() => unlockStep(item.step)}
                      className="shrink-0 text-[#ADB5BD] hover:text-[#495057] transition-colors p-1"
                      title="Edit">
                      <Pencil className="size-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Active feed (AI prompt + current widget) ── */}
          <div className="px-4 pt-4 pb-[70vh] flex flex-col gap-3">
            {feed.map(item => {
              if (item.kind === 'ai' && lockedSteps.has(item.step)) return null;
              if (item.kind === 'widget' && item.locked) return null;

              if (item.kind === 'ai') {
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="size-8 rounded-full bg-[#00a79d] flex items-center justify-center shrink-0">
                      <Sparkles className="size-4 text-white" strokeWidth={1.75} />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 text-[14px] text-[#212529] max-w-[85%]"
                      style={{ fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-sm)' }}>
                      {item.text}
                    </div>
                  </div>
                );
              }

              if (item.kind === 'widget') {
                return (
                  <div key={item.id} ref={activeWidgetRef} className="ml-11">
                    {renderWidget(item)}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

      {showTransition && (
        <BabelTransition onComplete={() => {}} label="Launching your Bubble..." isCreate />
      )}
    </div>
  );
}
