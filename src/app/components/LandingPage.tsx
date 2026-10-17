import { NotificationBell } from "./NotificationBell";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Settings, Bell, Globe, User as UserIcon, LogOut, Plus, Check, Sparkles, Calendar, Users as UsersIcon, ArrowRight, ChevronLeft } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { STATUS_LABELS, STATUS_COLORS, getBubbleMembers } from "../../data/display";
import type { Bubble } from "../../types";
import { BabelTransition } from "./BabelTransition";
import { SmartSearchBar } from "./SmartSearchBar";
import { AuthModal } from "./AuthModal";

// ─── WE Logo ──────────────────────────────────────────────────────────────────

function WELogo({ className = "h-7 w-auto" }: { className?: string }) {
  return <img src="/we-logo.svg" alt="WE Bubbles" className={className} />;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Bubble['status'] }) {
  const cfg = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Avatar Stack ─────────────────────────────────────────────────────────────

function AvatarStack({ people, count }: { people: Array<{ avatar: string; name: string }>; count: string }) {
  const shown = people.slice(0, 4);
  return (
    <div className="flex items-center gap-2">
      {shown.length > 0 && (
        <div className="relative flex" style={{ width: shown.length * 14 + 8, height: 22 }}>
          {shown.map((p, i) => (
            <div key={i}
              className="absolute rounded-full size-[22px] border-2 border-white overflow-hidden bg-[#E5F5F4] flex items-center justify-center"
              style={{ left: i * 14 }}>
              {p.avatar ? (
                <img src={p.avatar} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-[9px] font-bold text-[#008f86]" style={{ fontFamily: 'var(--font-display)' }}>
                  {p.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <span className="text-[#6B7280] text-[12px]" style={{ fontFamily: 'var(--font-body)' }}>{count}</span>
    </div>
  );
}

// ─── Bubble Card ─────────────────────────────────────────────────────────────

function BubbleCard({
  bubble,
  onOpen,
  isJoined,
}: {
  bubble: Bubble;
  onOpen: (bubble: Bubble) => void;
  isJoined: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const members = getBubbleMembers(bubble);

  return (
    <div
      ref={cardRef}
      className="bg-white rounded-2xl relative flex flex-col cursor-pointer overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(bubble)}
      style={{
        boxShadow: hovered
          ? '0 20px 48px -8px rgba(43,191,170,0.22), 0 0 0 2px rgba(43,191,170,0.35)'
          : 'var(--shadow-card)',
        transform: hovered ? 'translateY(-6px) scale(1.016)' : 'translateY(0) scale(1)',
        transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Hero Image */}
      <div className="relative h-40 overflow-hidden bg-neutral-100">
        {bubble.heroImage && (
          <img
            src={bubble.heroImage}
            alt={bubble.title}
            className="absolute inset-0 size-full object-cover"
            style={{ transform: hovered ? 'scale(1.07)' : 'scale(1)', transition: 'transform 0.4s ease' }}
          />
        )}
        {/* Hover CTA overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(27,130,116,0.65) 0%, transparent 55%)',
          opacity: hovered ? 1 : 0, transition: 'opacity 0.25s ease',
          display: 'flex', alignItems: 'flex-end', padding: '10px 14px',
        }}>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
            View Bubble →
          </span>
        </div>
        {isJoined && (
          <div className="absolute top-2 left-2 bg-[#00a79d] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ fontFamily: 'var(--font-body)' }}>
            <Check className="size-3" strokeWidth={2.5} /> Joined
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <StatusBadge status={bubble.status} />
          <span className="text-[11px] text-neutral-500 shrink-0" style={{ fontFamily: 'var(--font-body)' }}>
            {bubble.level}
          </span>
        </div>

        <p
          className="font-semibold text-[17px] leading-snug"
          style={{
            fontFamily: 'var(--font-display)',
            color: hovered ? '#00a79d' : '#212529',
            transition: 'color 0.2s ease',
          }}
        >
          {bubble.title}
        </p>

        <p className="text-[#6B7280] text-[13px] line-clamp-2 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          {bubble.description}
        </p>

        <div className="h-px bg-neutral-100 w-full" />

        {/* Schedule */}
        <div className="flex items-center gap-2 text-[13px] text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>
          <Calendar className="size-4 shrink-0 text-[#6B7280]" strokeWidth={1.5} />
          Every {bubble.scheduleDay} @ {bubble.scheduleTime}
        </div>

        {/* Seats */}
        <div className="flex items-center gap-2 text-[13px] text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>
          <UsersIcon className="size-4 shrink-0 text-[#6B7280]" strokeWidth={1.5} />
          {bubble.takenSeats} of {bubble.maxSeats} seats taken
        </div>

        <AvatarStack
          people={members.map(m => ({ avatar: m.avatar, name: m.name }))}
          count={`Starts ${bubble.startDate}`}
        />

        {/* View / Enter button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen(bubble);
          }}
          className="mt-auto w-full py-2.5 rounded-xl text-[14px] font-semibold transition-all"
          style={{
            fontFamily: 'var(--font-body)',
            background: isJoined ? '#E5F5F4' : '#F1F3F5',
            color: isJoined ? '#008f86' : '#495057',
            boxShadow: hovered ? '0 4px 12px rgba(43,191,170,0.18)' : 'none',
          }}
        >
          {isJoined ? 'Enter Bubble →' : 'Learn more →'}
        </button>
      </div>

      {/* Border overlay */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          border: hovered ? '1.5px solid rgba(43,191,170,0.4)' : '1px solid #E9ECEF',
          transition: 'border 0.25s ease',
        }}
      />
    </div>
  );
}

// ─── Create Card ──────────────────────────────────────────────────────────────

function CreateBubbleCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="bg-white rounded-2xl flex flex-col cursor-pointer overflow-hidden"
      style={{
        minHeight: 420,
        boxShadow: hovered
          ? '0 20px 48px -8px rgba(43,191,170,0.22), 0 0 0 2px rgba(43,191,170,0.35)'
          : 'var(--shadow-card)',
        transform: hovered ? 'translateY(-6px) scale(1.016)' : 'translateY(0) scale(1)',
        transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Header gradient */}
      <div className="h-40 w-full flex items-center justify-center relative overflow-hidden"
        style={{ background: hovered ? 'linear-gradient(135deg,#c8f4ef,#a8ece4)' : 'linear-gradient(135deg,#E5F5F4,#d0f5f1)' }}>
        <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-[#00a79d]/10" />
        <div className="absolute -bottom-3 -left-3 w-16 h-16 rounded-full bg-[#00a79d]/15" />
        <div
          className="relative z-10 w-16 h-16 rounded-2xl bg-white shadow flex items-center justify-center"
          style={{ transform: hovered ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
          <Plus className="size-8 text-[#00a79d]" strokeWidth={2.5} />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 flex-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] bg-[#E5F5F4] border border-[#7ECFCA] text-[#008f86] px-2.5 py-1 rounded-full w-fit"
          style={{ fontFamily: 'var(--font-body)' }}>
          <Sparkles className="size-3" strokeWidth={1.75} /> AI-guided setup
        </span>

        <p className="font-bold text-[18px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
          Create a new Bubble
        </p>
        <p className="text-[#6B7280] text-[13px] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          Build a learning group with AI. Define your topic, schedule, and curriculum in minutes.
        </p>

        <div className="mt-1 space-y-1.5">
          {['AI generates your full syllabus', 'Recurring schedule & 2–8 participants', 'Live group page ready to share'].map(f => (
            <div key={f} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00a79d] shrink-0" />
              <span className="text-[12px] text-neutral-500" style={{ fontFamily: 'var(--font-body)' }}>{f}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2 text-[#00a79d] text-[13px] font-semibold pt-2"
          style={{ fontFamily: 'var(--font-body)' }}>
          <span>Get started</span>
          <ArrowRight
            className="size-4"
            strokeWidth={1.75}
            style={{ transform: hovered ? 'translateX(3px)' : 'none', transition: 'transform 0.2s ease' }}
          />
        </div>
      </div>

      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ border: hovered ? '1.5px solid rgba(43,191,170,0.4)' : '1px solid #E9ECEF', transition: 'border 0.25s ease' }} />
    </div>
  );
}

// ─── Settings Dropdown ───────────────────────────────────────────────────────

function SettingsDropdown({ onClose }: { onClose: () => void }) {
  const { currentUser, logout } = useApp();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl z-50 overflow-hidden"
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)' }}>
      {currentUser && (
        <div className="px-4 py-3 border-b border-[#F1F3F5]">
          <p className="font-semibold text-[14px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
            {currentUser.name}
          </p>
          <p className="text-[12px] text-[#ADB5BD]" style={{ fontFamily: 'var(--font-body)' }}>
            {currentUser.email}
          </p>
        </div>
      )}
      <div className="py-1">
        {[
          { Icon: UserIcon, label: 'Profile' },
          { Icon: Bell, label: 'Notifications' },
          { Icon: Globe, label: 'Language' },
          { Icon: Settings, label: 'Settings' },
        ].map(item => (
          <button key={item.label}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#495057] hover:bg-[#F8F9FA] transition-colors text-left"
            style={{ fontFamily: 'var(--font-body)' }}
            onClick={onClose}
          >
            <item.Icon className="size-4" strokeWidth={1.75} />{item.label}
          </button>
        ))}
      </div>
      <div className="border-t border-[#F1F3F5] py-1">
        <button
          onClick={() => { logout(); onClose(); toast.success('Signed out'); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#FA5252] hover:bg-[#FFF5F5] transition-colors text-left"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <LogOut className="size-4" strokeWidth={1.75} /> Sign out
        </button>
      </div>
    </div>
  );
}

// ─── Avatar Dropdown ─────────────────────────────────────────────────────────

function AvatarMenu({ user }: { user: NonNullable<ReturnType<typeof useApp>['currentUser']> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="size-8 rounded-full overflow-hidden border-2 transition-all bg-[#E5F5F4] flex items-center justify-center"
        style={{ borderColor: open ? '#00a79d' : '#E9ECEF' }}>
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="size-full object-cover" />
        ) : (
          <span className="text-[12px] font-bold text-[#008f86]" style={{ fontFamily: 'var(--font-display)' }}>
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>
      {open && <SettingsDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();
  const { bubbles, bubblesLoading, currentUser, isLoggedIn, authReady, isJoined, recentBubbleIds } = useApp();

  const [activeTab, setActiveTab]     = useState<'all' | 'my'>('all');
  const [showAuth, setShowAuth]       = useState(false);
  const [transition, setTransition]   = useState<{ show: boolean; cardRect?: DOMRect }>({ show: false });

  const tabs = [
    { id: 'all' as const, label: 'All' },
    { id: 'my'  as const, label: 'My Bubbles' },
  ];

  const filtered = bubbles.filter(b => {
    if (activeTab === 'my' && !isJoined(b.id)) return false;
    return true;
  });

  function handleOpen(bubble: Bubble) {
    setTransition({ show: true });
    setTimeout(() => navigate(`/group/${bubble.id}`), 1600);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Header ── */}
      <header className="flex items-center px-6 py-3.5 border-b border-[#E9ECEF] sticky top-0 bg-white/95 backdrop-blur z-20 gap-4">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <WELogo className="h-8 w-auto" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '16px', color: '#495057', lineHeight: 1, paddingBottom: '2px' }}>
            WE Bubbles
          </span>
        </div>

        {/* Tabs — left side, next to logo (visible on all screen sizes) */}
        <nav className="flex items-center gap-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-1.5 text-[14px] transition-colors"
              style={{
                fontFamily: 'var(--font-body)',
                color: activeTab === tab.id ? '#212529' : '#6C757D',
                fontWeight: activeTab === tab.id ? 700 : 400,
              }}>
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: '#00a79d' }} />
              )}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Right actions: Create new + Avatar/Sign in only */}
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate('/create')}
            className="flex items-center gap-1.5 bg-[#212529] text-white text-[14px] font-medium px-4 py-2 rounded-xl hover:bg-[#343A40] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}>
            <Plus className="size-4" strokeWidth={2} />
            Create new
          </button>

          {isLoggedIn && currentUser ? (
            <div className="flex items-center gap-1.5"><NotificationBell /><AvatarMenu user={currentUser} /></div>
          ) : authReady ? (
            <button
              onClick={() => setShowAuth(true)}
              className="text-[14px] font-semibold text-[#00a79d] hover:underline"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Sign in
            </button>
          ) : (
            // Auth state still resolving — hold the space, avoid the signed-out flash
            <div className="w-16" />
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-[80px] pb-20 pt-10 gap-12">

        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-3 max-w-[800px]">
          <h1 className="font-bold text-[#212529] text-[36px] sm:text-[44px] leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}>
            Find your study{' '}
            <span style={{ color: '#00a79d' }}>Bubble</span>
          </h1>
          <p className="text-[#6C757D] text-[18px] sm:text-[22px]" style={{ fontFamily: 'var(--font-body)' }}>
            Join a learning group and reach your goals faster.
          </p>
        </div>

        {/* Smart search */}
        <SmartSearchBar
          bubbles={bubbles}
          recentBubbleIds={recentBubbleIds}
          onSelect={handleOpen}
        />

        {/* Section header */}
        <div className="w-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[#212529] text-[22px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              {activeTab === 'my' ? 'My Bubbles' : 'All Bubbles'}
            </h2>
            <span className="text-[#ADB5BD] text-[14px]" style={{ fontFamily: 'var(--font-body)' }}>
              {filtered.length} bubble{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Cards */}
          {bubblesLoading && filtered.length === 0 ? (
            /* Loading skeleton — no false "no bubbles" flash */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-2xl border border-[#E9ECEF] overflow-hidden animate-pulse">
                  <div className="h-36 bg-[#F1F3F5]" />
                  <div className="p-4 flex flex-col gap-2.5">
                    <div className="h-4 w-3/4 bg-[#F1F3F5] rounded" />
                    <div className="h-3 w-full bg-[#F8F9FA] rounded" />
                    <div className="h-3 w-1/2 bg-[#F8F9FA] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 && activeTab === 'my' ? (
            <div className="flex flex-col items-center py-20 gap-4 text-center">
              <div className="size-14 rounded-2xl bg-[#E5F5F4] flex items-center justify-center">
                <svg className="size-7 text-[#00a79d]" fill="none" viewBox="0 0 24 24">
                  <path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[#212529] text-[18px] font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                No bubbles yet
              </p>
              <p className="text-[#6C757D] text-[14px]" style={{ fontFamily: 'var(--font-body)' }}>
                You haven't joined any Bubbles yet — browse All Bubbles or start your own.
              </p>
              <button onClick={() => navigate('/create')}
                className="mt-2 px-5 py-2.5 bg-[#00a79d] text-white rounded-xl text-[14px] font-medium hover:bg-[#008f86] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}>
                Start a new Bubble →
              </button>
            </div>
          ) : filtered.length === 0 ? (
            /* Cold start: a young community is an invitation, not an error */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <CreateBubbleCard onClick={() => navigate('/create')} />
              <div className="rounded-2xl border-2 border-dashed border-[#E9ECEF] flex flex-col items-center justify-center text-center gap-2 p-8">
                <p className="text-[#212529] text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                  Be the first Bubble
                </p>
                <p className="text-[#6C757D] text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>
                  The community is just getting started — create the first learning group and invite the women you want to learn with.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <CreateBubbleCard onClick={() => navigate('/create')} />
              {filtered.map(bubble => (
                <BubbleCard
                  key={bubble.id}
                  bubble={bubble}
                  isJoined={isJoined(bubble.id)}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Auth Modal ── */}
      {showAuth && (
        <AuthModal
          onClose={() => { setShowAuth(false); }}
          onSuccess={() => toast.success('Welcome back! 👋')}
        />
      )}

      {/* ── Transition ── */}
      {transition.show && (
        <BabelTransition
          cardRect={transition.cardRect}
          onComplete={() => {}}
          label="Entering Bubble..."
          isCreate={false}
        />
      )}
    </div>
  );
}
