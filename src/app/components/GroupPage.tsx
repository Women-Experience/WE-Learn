import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { BookOpen, Users, FolderOpen, Share2, ArrowRight, Crown, Calendar, Clock, Info, X, ChevronLeft, Search, MoreVertical, Pencil, Archive, GitFork, Eye, EyeOff, Check } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getBubbleMembers } from "../../data/display";
import { leaveWaitlist } from "../../data/api";
import { SyllabusTab } from "./SyllabusTab";
import { MembersTab } from "./MembersTab";
import { ResourcesTab } from "./ResourcesTab";
import { JoinBubbleModal } from "./JoinBubbleModal";
import { AuthModal } from "./AuthModal";
import { ForkBubbleModal } from "./ForkBubbleModal";
import { NotificationBell } from "./NotificationBell";
import type { Bubble } from "../../types";

type Tab = 'syllabus' | 'members' | 'resources';

// ─── WE Logo ──────────────────────────────────────────────────────────────────

function WELogo({ className = "h-7 w-auto" }: { className?: string }) {
  return <img src="/we-logo.svg" alt="WE Bubbles" className={className} />;
}

// ─── Avatar Stack (small) ─────────────────────────────────────────────────────

function AvatarStackSmall({ avatars }: { avatars: string[] }) {
  return (
    <div className="relative flex" style={{ width: Math.min(avatars.length, 5) * 12 + 10, height: 24 }}>
      {avatars.slice(0, 5).map((src, i) => (
        <div key={i} className="absolute rounded-full size-6 border-2 border-white overflow-hidden"
          style={{ left: i * 12, zIndex: i }}>
          <img src={src} alt="" className="size-full object-cover" />
        </div>
      ))}
    </div>
  );
}

// ─── GroupPage ────────────────────────────────────────────────────────────────

// ─── Add Session Modal ────────────────────────────────────────────────────────

// ─── GroupPage ────────────────────────────────────────────────────────────────

export function GroupPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { bubbles, bubblesLoading, currentUser, isFounder, isJoined, isLoggedIn, authReady, addRecentBubble, updateBubble, closeBubble, loadBubbleDetail, refreshUser } = useApp();

  const [activeTab, setActiveTab]       = useState<Tab>('syllabus');
  const [guestPreview, setGuestPreview] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [bubbleMenuOpen, setBubbleMenuOpen] = useState(false);
  const [editingBubble, setEditingBubble]   = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showFork, setShowFork] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editScheduleDay, setEditScheduleDay] = useState('');
  const [editScheduleTime, setEditScheduleTime] = useState('');
  const bubbleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bubbleMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (bubbleMenuRef.current && !bubbleMenuRef.current.contains(e.target as Node)) {
        setBubbleMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [bubbleMenuOpen]);

  // Find bubble from context (includes newly created ones)
  const bubble = bubbles.find(b => b.id === id);

  // Track this bubble as "recently viewed" for smart search
  useEffect(() => {
    if (bubble) addRecentBubble(bubble.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubble?.id]);

  // Load syllabus + resources from the database (once per bubble, when signed in)
  useEffect(() => {
    if (bubble && isLoggedIn && !bubble.detailLoaded) loadBubbleDetail(bubble.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubble?.id, bubble?.detailLoaded, isLoggedIn]);

  // Still fetching the bubble list — show a quiet loading state, not "not found"
  if (!bubble && bubblesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="size-10 rounded-full border-4 border-[#E5F5F4] border-t-[#00a79d] animate-spin" />
      </div>
    );
  }

  if (!bubble) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <div className="size-16 bg-[#E5F5F4] rounded-2xl flex items-center justify-center">
          <Search className="size-8 text-[#00a79d]" strokeWidth={1.5} />
        </div>
        <p className="text-[18px] font-semibold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
          Bubble not found
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-[#00a79d] text-[14px] hover:underline"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          ← Back to all Bubbles
        </button>
      </div>
    );
  }

  const members = getBubbleMembers(bubble);
  const founder = members.find(m => m.id === bubble.founderId);
  const isUserFounder = isFounder(bubble.id) && !guestPreview;

  const userId = currentUser?.id;
  const userJoined = (hasJoined || isJoined(bubble.id) || (!!userId && bubble.memberIds.includes(userId))) && !guestPreview;
  const isWaitlisted = (currentUser?.waitlistedBubbles ?? []).includes(bubble.id) && !guestPreview;

  const tabs: { id: Tab; label: string; icon: typeof BookOpen; founderOnly?: boolean }[] = [
    { id: 'syllabus',  label: 'Syllabus',  icon: BookOpen, founderOnly: false },
    { id: 'members',   label: 'Members',   icon: Users, founderOnly: false },
    { id: 'resources', label: 'Resources', icon: FolderOpen, founderOnly: false },
  ];

  function handleJoinClick() {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    setShowJoin(true);
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">

      {/* ── Top Nav ── */}
      <header className="bg-white border-b border-[#E9ECEF] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center py-3.5 gap-4">
            {/* Back + Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-[#6C757D] hover:text-[#212529] transition-colors"
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} />
            </button>
            <WELogo className="h-6 w-auto" />

            <div className="flex-1" />

            {/* Preview as guest toggle — founder only */}
            {isFounder(bubble.id) && (
              <button
                onClick={() => setGuestPreview(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${
                  guestPreview
                    ? 'bg-[#FFF3CD] border-[#FAB005] text-[#856404]'
                    : 'bg-[#F8F9FA] border-[#E9ECEF] text-[#6C757D] hover:border-[#00a79d] hover:text-[#00a79d]'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
                title={guestPreview ? 'Exit guest preview' : 'Preview as guest'}
              >
                {guestPreview ? <EyeOff className="size-3.5" strokeWidth={1.75} /> : <Eye className="size-3.5" strokeWidth={1.75} />}
                <span className="hidden sm:inline">{guestPreview ? 'Exit preview' : 'Preview as guest'}</span>
              </button>
            )}

            {currentUser && <NotificationBell />}

            {/* User avatar / sign-in */}
            {currentUser ? (
              <div className="size-8 rounded-full overflow-hidden border-2 bg-[#E5F5F4] flex items-center justify-center"
                style={{ borderColor: guestPreview ? '#E9ECEF' : '#00a79d' }}>
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="size-full object-cover" />
                ) : (
                  <span className="text-[12px] font-bold text-[#008f86]" style={{ fontFamily: 'var(--font-display)' }}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ) : authReady ? (
              <button
                onClick={() => setShowAuth(true)}
                className="text-[13px] font-semibold text-[#00a79d] hover:underline shrink-0"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Sign in
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden" style={{ height: 200 }}>
        {bubble.heroImage ? (
          <img src={bubble.heroImage} alt={bubble.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#00a79d] to-[#008f86]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {/* Topic tag */}
        <div className="absolute top-4 left-6">
          <span className="bg-white/90 text-[#008f86] text-[12px] font-semibold px-3 py-1 rounded-full"
            style={{ fontFamily: 'var(--font-body)' }}>
            {bubble.topic}
          </span>
        </div>
      </div>

      {/* ── Bubble Info Card ── */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
        <div className="bg-white rounded-2xl -mt-8 relative z-10 px-6 py-5"
          style={{ boxShadow: 'var(--shadow-md)' }}>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Left column */}
            <div className="flex-1 min-w-0">
              {editingBubble ? (
                <div className="flex flex-col gap-3 mb-3">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="font-bold text-[20px] text-[#212529] border-b-2 border-[#00a79d] focus:outline-none bg-transparent pb-0.5 w-full"
                    style={{ fontFamily: 'var(--font-display)' }}
                  />
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    rows={2}
                    className="text-[14px] text-[#6C757D] border border-[#00a79d] rounded-xl px-3 py-2 resize-none focus:outline-none w-full"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-[#ADB5BD] font-medium" style={{ fontFamily: 'var(--font-body)' }}>Day</label>
                      <select
                        value={editScheduleDay}
                        onChange={e => setEditScheduleDay(e.target.value)}
                        className="text-[13px] px-2 py-1.5 rounded-lg border border-[#00a79d] focus:outline-none bg-[#F8F9FA]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-[#ADB5BD] font-medium" style={{ fontFamily: 'var(--font-body)' }}>Time</label>
                      <input
                        type="text"
                        value={editScheduleTime}
                        onChange={e => setEditScheduleTime(e.target.value)}
                        placeholder="7:00 PM"
                        className="text-[13px] px-2 py-1.5 rounded-lg border border-[#00a79d] focus:outline-none bg-[#F8F9FA]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="font-bold text-[22px] text-[#212529] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                    {bubble.title}
                  </h1>
                  <p className="text-[14px] text-[#6C757D] mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                    {bubble.description}
                  </p>
                  {bubble.creditChain && bubble.creditChain.length > 0 && (
                    <p className="text-[12px] text-[#6C757D] mb-3 flex items-center gap-1.5"
                      style={{ fontFamily: 'var(--font-body)' }}
                      title={bubble.creditChain.map(c => `${c.title} (${c.author})`).join(' → ')}>
                      <GitFork className="size-3.5 shrink-0" strokeWidth={1.75} />
                      <span>
                        Based on{' '}
                        {bubble.forkedFrom ? (
                          <button onClick={() => navigate(`/group/${bubble.forkedFrom}`)}
                            className="font-semibold text-[#008f86] hover:underline">
                            {bubble.creditChain[bubble.creditChain.length - 1].title}
                          </button>
                        ) : (
                          <strong>{bubble.creditChain[bubble.creditChain.length - 1].title}</strong>
                        )}
                        {' '}by {bubble.creditChain[bubble.creditChain.length - 1].author}
                        {bubble.creditChain.length > 1 && ` and ${bubble.creditChain.length - 1} earlier`}
                      </span>
                    </p>
                  )}
                </>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[#495057]"
                style={{ fontFamily: 'var(--font-body)' }}>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-[#6C757D] shrink-0" strokeWidth={1.5} />
                  Every {bubble.scheduleDay} @ {bubble.scheduleTime}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4 text-[#6C757D] shrink-0" strokeWidth={1.5} />
                  {bubble.takenSeats} of {bubble.maxSeats} seats
                  {bubble.takenSeats >= bubble.maxSeats && (
                    <span className="ml-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C]">Full</span>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-[#6C757D] shrink-0" strokeWidth={1.5} />
                  90 min · {bubble.level}
                </span>
              </div>

              {/* Avatar stack — below description */}
              <div className="flex items-center gap-2 mt-3">
                <AvatarStackSmall avatars={members.map(m => m.avatar)} />
                {members.length > 0 && (
                  <span className="text-[12px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                    {members.length} {members.length === 1 ? 'member' : 'members'}
                  </span>
                )}
              </div>
            </div>

            {/* Right column: [Share] [⋮] + founder badges */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                {/* Share */}
                <button
                  onClick={async () => {
                    const url = window.location.href;
                    await navigator.clipboard.writeText(url).catch(() => {});
                    toast.success('Link copied to clipboard!');
                  }}
                  className="flex items-center gap-1.5 min-h-[36px] px-3 py-2 rounded-lg border border-[#E9ECEF] text-[13px] text-[#495057] hover:border-[#00a79d] hover:text-[#00a79d] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <Share2 className="size-4" strokeWidth={1.75} />
                  <span className="hidden sm:inline">Share</span>
                </button>
                {/* Fork — any signed-in woman can open her own Bubble on this syllabus */}
                {currentUser && !guestPreview && (
                  <button
                    onClick={() => setShowFork(true)}
                    className="flex items-center gap-1.5 min-h-[36px] px-3 py-2 rounded-lg border border-[#E9ECEF] text-[13px] text-[#495057] hover:border-[#00a79d] hover:text-[#00a79d] transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                    title="Open your own Bubble on this syllabus"
                  >
                    <GitFork className="size-4" strokeWidth={1.75} />
                    <span className="hidden sm:inline">Fork</span>
                  </button>
                )}
                {/* ⋮ menu — founder only */}
                {isUserFounder && (
                  <div ref={bubbleMenuRef} className="relative">
                    <button
                      onClick={() => setBubbleMenuOpen(v => !v)}
                      className="size-9 flex items-center justify-center rounded-lg text-[#4B5563] hover:text-[#212529] hover:bg-[#F8F9FA] transition-colors"
                    >
                      <MoreVertical className="size-4" strokeWidth={1.75} />
                    </button>
                    {bubbleMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-[#E9ECEF] overflow-hidden z-30"
                        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                        <button
                          onClick={() => {
                            setEditTitle(bubble.title);
                            setEditDescription(bubble.description);
                            setEditScheduleDay(bubble.scheduleDay);
                            setEditScheduleTime(bubble.scheduleTime);
                            setEditingBubble(true);
                            setBubbleMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[#212529] hover:bg-[#F8F9FA] transition-colors text-left"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          <Pencil className="size-4 shrink-0" strokeWidth={1.75} /> Edit info
                        </button>
                        <div className="h-px bg-[#E9ECEF] mx-3" />
                        <button
                          onClick={() => { setShowCloseConfirm(true); setBubbleMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[#FA5252] hover:bg-[#FFF5F5] transition-colors text-left"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          <Archive className="size-4 shrink-0" strokeWidth={1.75} /> Close Bubble
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {founder && (
                <div className="flex items-center gap-1.5 text-[12px] text-[#6C757D]"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  <img src={founder.avatar} alt={founder.name} className="size-5 rounded-full object-cover" />
                  <span className="hidden sm:inline">Founded by </span><strong className="text-[#495057]">{founder.name}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Card footer: Save/Cancel (edit) | Join CTA (visitor) | Founder badge (founder) */}
          {editingBubble ? (
            <div className="mt-4 pt-4 border-t border-[#F1F3F5] flex justify-end gap-2">
              <button
                onClick={() => setEditingBubble(false)}
                className="px-4 py-2 rounded-lg border border-[#E9ECEF] text-[13px] text-[#6C757D] hover:bg-[#F8F9FA] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >Cancel</button>
              <button
                onClick={() => {
                  setEditingBubble(false);
                  updateBubble(bubble.id, {
                    title: editTitle.trim() || bubble.title,
                    description: editDescription.trim() || bubble.description,
                    scheduleDay: editScheduleDay || bubble.scheduleDay,
                    scheduleTime: editScheduleTime.trim() || bubble.scheduleTime,
                  })
                    .then(() => toast.success('Bubble updated'))
                    .catch(() => toast.error('Could not save — your changes were reverted.'));
                }}
                className="px-4 py-2 rounded-lg bg-[#00a79d] text-white text-[13px] font-semibold hover:bg-[#008f86] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >Save</button>
            </div>
          ) : isWaitlisted && !userJoined ? (
            <div className="mt-4 pt-4 border-t border-[#F1F3F5] flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[13px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                You're on the waitlist — the founder can admit you when a seat opens.
              </p>
              <button
                onClick={() => {
                  leaveWaitlist(bubble.id)
                    .then(() => { toast.success('Removed from waitlist'); refreshUser(); })
                    .catch(() => toast.error('Could not update the waitlist'));
                }}
                className="shrink-0 min-h-[44px] px-5 py-2.5 rounded-xl border border-[#E9ECEF] text-[#6C757D] text-[14px] font-semibold hover:bg-[#F8F9FA] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Leave waitlist
              </button>
            </div>
          ) : bubble.status === 'closed' ? (
            <div className="mt-4 pt-4 border-t border-[#F1F3F5]">
              <p className="text-[13px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                This Bubble is closed and no longer accepts members. You can still open your own Bubble on its syllabus with Fork.
              </p>
            </div>
          ) : !isUserFounder && !userJoined ? (
            <div className="mt-4 pt-4 border-t border-[#F1F3F5] flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[13px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                Like what you see? Join this Bubble to participate in sessions and connect with members.
              </p>
              <button
                onClick={handleJoinClick}
                className="flex items-center gap-1.5 shrink-0 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Join Bubble <ArrowRight className="size-4" strokeWidth={2} />
              </button>
            </div>
          ) : isUserFounder ? (
            <div className="mt-4 pt-3 border-t border-[#F1F3F5] flex justify-end">
              <span className="inline-flex items-center gap-1 text-[11px] bg-[#E5F5F4] text-[#008f86] border border-[#7ECFCA] px-2 py-0.5 rounded-full font-semibold"
                style={{ fontFamily: 'var(--font-body)' }}>
                <Crown className="size-3 shrink-0" strokeWidth={1.75} /> You're the founder
              </span>
            </div>
          ) : userJoined ? (
            <div className="mt-4 pt-4 border-t border-[#F1F3F5] flex justify-end">
              <button
                disabled
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#7ECFCA] bg-[#E5F5F4] text-[#008f86] text-[14px] font-semibold cursor-default select-none"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <Check className="size-4" strokeWidth={2.5} /> Joined
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 mt-4">
        <div className="flex items-center gap-0 border-b border-[#E9ECEF] overflow-x-auto scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-1.5 px-4 sm:px-5 py-3 text-[14px] transition-colors shrink-0 min-h-[44px] touch-manipulation"
                style={{
                  fontFamily: 'var(--font-body)',
                  color: isActive ? '#212529' : '#6C757D',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                <Icon className="size-4" strokeWidth={isActive ? 2 : 1.75} />
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: '#00a79d' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        {/* Tabs stay mounted (hidden with CSS) so in-progress edits and local
            state survive tab switches. */}
        <div style={{ display: activeTab === 'syllabus' ? undefined : 'none' }}>
          <SyllabusTab
            bubble={bubble}
            isFounder={isUserFounder}
            isAuthor={isUserFounder}
          />
        </div>
        <div style={{ display: activeTab === 'members' ? undefined : 'none' }}>
          <MembersTab bubble={bubble} isFounder={isUserFounder} onJoin={handleJoinClick} />
        </div>
        <div style={{ display: activeTab === 'resources' ? undefined : 'none' }}>
          <ResourcesTab bubble={bubble} isFounder={isUserFounder} />
        </div>
      </div>

      {/* ── Auth Modal ── */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            setShowJoin(true);
          }}
        />
      )}

      {/* ── Join Bubble Modal ── */}
      {showJoin && (
        <JoinBubbleModal
          bubble={bubble}
          onClose={() => setShowJoin(false)}
          onEnter={() => { setHasJoined(true); setShowJoin(false); }}
        />
      )}

      {/* ── Fork Modal ── */}
      {showFork && <ForkBubbleModal bubble={bubble} onClose={() => setShowFork(false)} />}

      {/* ── Close Bubble Confirmation ── */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCloseConfirm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div className="px-6 pt-6 pb-5">
              <div className="size-12 bg-[#FFF3CD] rounded-2xl flex items-center justify-center mb-4">
                <Archive className="size-6 text-[#856404]" strokeWidth={1.75} />
              </div>
              <h3 className="font-bold text-[17px] text-[#212529] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                Close this Bubble?
              </h3>
              <p className="text-[14px] text-[#6C757D] mb-5" style={{ fontFamily: 'var(--font-body)' }}>
                "{bubble.title}" will stop accepting members and members' seats are released. Nothing is deleted:
                the syllabus stays and anyone can still fork it. Only an Admin can reopen a closed Bubble.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E9ECEF] text-[14px] text-[#6C757D] hover:bg-[#F8F9FA] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >Cancel</button>
                <button
                  onClick={() => {
                    setShowCloseConfirm(false);
                    closeBubble(bubble.id)
                      .then(() => toast.success('Bubble closed'))
                      .catch(() => toast.error('Could not close this Bubble.'));
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >Close Bubble</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
