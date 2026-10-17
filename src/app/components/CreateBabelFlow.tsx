import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Bot, Brain, Sparkles, Search, Rocket, Layout,
  Sprout, TrendingUp, Award,
  Check, CheckCircle2, Pencil, ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { Bubble, Session, BubbleLevel } from "../../types";
import { BabelTransition } from "./BabelTransition";
import { AuthModal } from "./AuthModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepKey = "topic" | "description" | "level" | "schedule" | "seats" | "sessions";

interface BubbleData {
  topic: string;
  description: string;
  level: BubbleLevel;
  day: string;
  time: string;
  seats: number;
  syllabusMode: "ai" | "manual";
}

type FeedItem =
  | { kind: "ai";     id: number; text: string }
  | { kind: "user";   id: number; text: string }
  | { kind: "widget"; id: number; step: StepKey; locked: boolean };

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_ORDER: StepKey[] = ["topic", "description", "level", "schedule", "seats", "sessions"];

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

const AI_PROMPTS: Record<StepKey, string> = {
  topic:       "I'm your Bubble guide. What topic do you want to teach or facilitate? Choose one below or type your own.",
  description: "How would you describe this Bubble to someone who's never heard of it? What will members walk away knowing or doing?",
  level:       "Great choice! Who is this Bubble for? What's the experience level of your participants?",
  schedule:    "Perfect. When will your group meet? Pick a day and time that works for you — sessions are 90 minutes.",
  seats:       "Almost there! How many members do you want in your Bubble?",
  sessions:    "Last step! Do you want AI to generate your full syllabus, or would you prefer to build it manually?",
};

// ─── Mock syllabus generator ──────────────────────────────────────────────────

function generateMockSessions(topic: string, level: BubbleLevel): Session[] {
  const sessionTitles = [
    "Introduction & Foundations",
    "Core Concepts Deep Dive",
    "Practical Frameworks",
    "Hands-On Workshop",
    "Guest Expert Session",
    "Final Project & Wrap-Up",
  ];
  const dates = [
    "Mar 18, 2026","Mar 25, 2026","Apr 1, 2026",
    "Apr 8, 2026","Apr 15, 2026","Apr 22, 2026",
  ];
  return sessionTitles.map((title, i) => ({
    id: `new-s-${i + 1}`,
    number: i + 1,
    title,
    status: 'locked' as Session['status'],
    date: dates[i],
    duration: 90,
    xp: 150,
    level,
    sections: [
      { id: `ns-${i}-lp`, type: 'learning-path' as const, title: 'Learning Path',
        content: `Session ${i + 1} of ${topic} — we'll explore ${title.toLowerCase()}.` },
      { id: `ns-${i}-br`, type: 'brief' as const, title: 'Conceptual Brief',
        content: 'Practical application focus. Come prepared.' },
      { id: `ns-${i}-vid`, type: 'video' as const, title: 'Video Resources',
        videoTitle: `Recommended: ${title}`, videoUrl: 'https://youtube.com' },
      { id: `ns-${i}-sb`, type: 'sandbox' as const, title: 'Project Sandbox',
        content: 'Submit your project link below.' },
    ],
  }));
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
            Use
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

function ScheduleWidget({ onSelect, locked }: { onSelect: (day: string, time: string) => void; locked: boolean }) {
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[12px] text-[#6C757D] mb-2" style={{ fontFamily: 'var(--font-body)' }}>Day of week</p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(d => (
            <button key={d} onClick={() => !locked && setDay(d)} disabled={locked}
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
            <button key={t} onClick={() => !locked && setTime(t)} disabled={locked}
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
      {day && time && !locked && (
        <button
          onClick={() => onSelect(FULL_DAYS[day], time)}
          className="w-full py-2.5 rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}>
          Confirm: Every {FULL_DAYS[day]} @ {time} →
        </button>
      )}
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
  const [selected, setSelected] = useState<SeatKey>('standard');
  const current = SEAT_OPTIONS.find(o => o.key === selected)!;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
        We recommend 4. You can start with fewer, and others can join any time until it's full.
      </p>
      <div className="flex flex-col gap-2">
        {SEAT_OPTIONS.map(opt => (
          <button key={opt.key}
            onClick={() => !locked && setSelected(opt.key)}
            disabled={locked}
            className="flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all disabled:opacity-50"
            style={{
              borderColor: selected === opt.key ? '#00a79d' : '#E9ECEF',
              background: selected === opt.key ? '#E5F5F4' : 'white',
            }}>
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
            <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected === opt.key ? 'border-[#00a79d] bg-[#00a79d]' : 'border-[#D1D5DB]'}`}>
              {selected === opt.key && <Check className="size-3 text-white" strokeWidth={2.5} />}
            </div>
          </button>
        ))}
      </div>
      {!locked && (
        <button
          onClick={() => onSelect(current.value)}
          className="w-full py-2.5 rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}>
          {current.label} ({current.range}) — Let's go →
        </button>
      )}
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

function SessionsWidget({
  topic, level, onConfirm, locked,
}: {
  topic: string; level: BubbleLevel;
  onConfirm: (mode: 'ai' | 'manual') => void;
  locked: boolean;
}) {
  const [mode, setMode] = useState<'ai' | 'manual' | null>(null);
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

  function handleAI() {
    if (locked) return;
    setMode('ai');
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
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <div className="bg-[#E5F5F4] rounded-xl p-4 text-[13px] text-[#008f86]"
          style={{ fontFamily: 'var(--font-body)' }}>
          <CheckCircle2 className="size-4 inline mr-1.5 text-[#008f86]" strokeWidth={2} />6-session syllabus generated for <strong>{topic}</strong> ({level})!
        </div>
        <button
          onClick={() => !locked && onConfirm('ai')}
          disabled={locked}
          className="w-full py-2.5 rounded-xl bg-[#00a79d] text-white text-[14px] font-bold hover:bg-[#008f86] transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}>
          Launch Bubble
        </button>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col gap-2 py-2">
        {phases.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-[13px] text-[#495057]"
            style={{ fontFamily: 'var(--font-body)' }}>
            <Check className="size-3.5 text-[#00a79d] shrink-0" strokeWidth={2.5} /> {p}
          </div>
        ))}
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleAI}
        disabled={locked}
        className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#7ECFCA] bg-[#E5F5F4] hover:bg-[#d0f5f1] transition-colors text-left disabled:opacity-50"
        style={{ fontFamily: 'var(--font-body)' }}>
        <Bot className="size-6 text-[#008f86] shrink-0" strokeWidth={1.75} />
        <div>
          <p className="font-semibold text-[14px] text-[#008f86]">Build with AI</p>
          <p className="text-[12px] text-[#6C757D]">AI generates your full syllabus in seconds</p>
        </div>
      </button>
      <button
        onClick={() => !locked && onConfirm('manual')}
        disabled={locked}
        className="flex items-center gap-3 p-4 rounded-xl border border-[#E9ECEF] hover:border-[#00a79d] hover:bg-[#F8F9FA] transition-colors text-left disabled:opacity-50"
        style={{ fontFamily: 'var(--font-body)' }}>
        <Pencil className="size-6 text-[#495057] shrink-0" strokeWidth={1.75} />
        <div>
          <p className="font-semibold text-[14px] text-[#212529]">Build manually</p>
          <p className="text-[12px] text-[#6C757D]">Add sessions yourself, at your own pace</p>
        </div>
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreateBabelFlow() {
  const navigate = useNavigate();
  const { createBubble, currentUser, isLoggedIn, authReady } = useApp();
  const [data, setData] = useState<Partial<BubbleData>>({});
  const [currentStep, setCurrentStep] = useState<StepKey>('topic');
  const [feed, setFeed] = useState<FeedItem[]>([
    { kind: 'ai', id: 0, text: AI_PROMPTS.topic },
    { kind: 'widget', id: 1, step: 'topic', locked: false },
  ]);
  const [showTransition, setShowTransition] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feed]);

  function advanceTo(nextStep: StepKey | null, userText: string, newData: Partial<BubbleData>) {
    const updatedData = { ...data, ...newData };
    setData(updatedData);

    // Lock current widget
    setFeed(f => f.map(item =>
      item.kind === 'widget' && item.step === currentStep ? { ...item, locked: true } : item
    ));

    setTimeout(() => {
      // Add user message
      setFeed(f => [...f, { kind: 'user', id: Date.now(), text: userText }]);

      if (!nextStep) {
        // Launch!
        handleLaunch(updatedData as BubbleData);
        return;
      }

      setTimeout(() => {
        setCurrentStep(nextStep);
        setFeed(f => [
          ...f,
          { kind: 'ai', id: Date.now() + 1, text: AI_PROMPTS[nextStep] },
          { kind: 'widget', id: Date.now() + 2, step: nextStep, locked: false },
        ]);
      }, 500);
    }, 200);
  }

  function handleLaunch(finalData: BubbleData) {
    setShowTransition(true);
    const sessions = finalData.syllabusMode === 'ai'
      ? generateMockSessions(finalData.topic, finalData.level)
      : [];

    createBubble({
      title: finalData.topic,
      topic: finalData.topic,
      description: finalData.description,
      level: finalData.level,
      maxSeats: finalData.seats,
      scheduleDay: finalData.day,
      scheduleTime: finalData.time,
      sessions: sessions.map(s => ({
        number: s.number,
        title: s.title,
        level: s.level,
        sections: s.sections.map(sec => ({
          type: sec.type,
          title: sec.title,
          content: sec.content,
          videos: sec.videos ?? (sec.videoUrl
            ? [{ id: `${sec.id}-v1`, title: sec.videoTitle ?? sec.title, url: sec.videoUrl }]
            : []),
        })),
      })),
    })
      .then(newId => setTimeout(() => navigate(`/group/${newId}`), 1200))
      .catch(err => {
        console.error('Failed to create bubble', err);
        setShowTransition(false);
        toast.error(
          err?.message?.includes('signed in')
            ? 'Please sign in to create a Bubble.'
            : 'Something went wrong creating your Bubble — nothing was lost, try Launch again.',
        );
        // Unlock the last widget so she can retry.
        setFeed(f => f.map(item =>
          item.kind === 'widget' ? { ...item, locked: false } : item,
        ));
      });
  }

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const progress  = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100);

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
              <p className="text-[12px] text-[#ADB5BD]" style={{ fontFamily: 'var(--font-body)' }}>
                Step {stepIndex + 1} of {STEP_ORDER.length}
              </p>
            </div>
            <div className="h-1.5 bg-[#F1F3F5] rounded-full">
              <div className="h-full rounded-full bg-[#00a79d] transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      {/* Feed */}
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6 flex flex-col gap-4 overflow-y-auto">
        {feed.map(item => {
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
          if (item.kind === 'user') {
            return (
              <div key={item.id} className="flex justify-end">
                <div className="bg-[#00a79d] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-[14px] max-w-[80%]"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  {item.text}
                </div>
              </div>
            );
          }
          // widget
          if (item.kind === 'widget') {
            return (
              <div key={item.id} className="ml-11">
                {item.step === 'topic' && (
                  <TopicWidget locked={item.locked}
                    onSelect={t => advanceTo('description', t, { topic: t })} />
                )}
                {item.step === 'description' && (
                  <DescriptionWidget locked={item.locked}
                    onSelect={desc => advanceTo('level', desc.length > 60 ? desc.slice(0, 60) + '...' : desc, { description: desc })} />
                )}
                {item.step === 'level' && (
                  <LevelWidget locked={item.locked}
                    onSelect={l => advanceTo('schedule', l, { level: l })} />
                )}
                {item.step === 'schedule' && (
                  <ScheduleWidget locked={item.locked}
                    onSelect={(day, time) => advanceTo('seats', `Every ${day} @ ${time}`, { day, time })} />
                )}
                {item.step === 'seats' && (
                  <SeatsWidget locked={item.locked}
                    onSelect={seats => advanceTo('sessions', `${seats} participants`, { seats })} />
                )}
                {item.step === 'sessions' && (
                  <SessionsWidget
                    topic={data.topic ?? ''}
                    level={data.level ?? 'Intermediate'}
                    locked={item.locked}
                    onConfirm={mode => advanceTo(null, mode === 'ai' ? 'Build with AI' : 'Build manually', { syllabusMode: mode })}
                  />
                )}
              </div>
            );
          }
          return null;
        })}
        <div ref={feedEndRef} />
      </div>

      {/* Transition */}
      {showTransition && (
        <BabelTransition onComplete={() => {}} label="Launching your Bubble..." isCreate />
      )}
    </div>
  );
}
