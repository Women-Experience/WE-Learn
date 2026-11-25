import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, CalendarCheck,
  MessageSquare, RotateCcw, BookOpen, Users, Zap, Flag,
  Plus, MoreVertical, Pencil, Copy, ChevronRight, ChevronUp, ChevronDown, Trash2,
  Check, Link2, Paperclip, AlignLeft, Image as ImageIcon, Target, Upload,
} from "lucide-react";
import type { Bubble, Member, Session, SessionStatus, BubbleLevel, SessionSection, ExtraResource, SectionType, SubmissionType } from "../../types";
import { ImportSyllabusModal } from "./ImportSyllabusModal";
import * as api from "../../data/api";
import { useApp } from "../../context/AppContext";
import { GroupProgressBanner } from "./GroupProgressBanner";
import { celebration, doneMembers } from "./groupProgress";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEED_SECTIONS: Omit<SessionSection, 'id'>[] = [
  { type: 'check-in',  title: 'Check-in',        minutes: 10 },
  { type: 'last-week', title: "Last week's task", minutes: 15 },
  { type: 'learn',     title: 'Learn',            minutes: 30 },
  { type: 'discuss',   title: 'Discuss',          minutes: 25 },
  { type: 'wrap-up',   title: 'Wrap-up',          minutes: 10 },
];

const STATUS_CFG: Record<SessionStatus, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
  'done':      { icon: CheckCircle2, label: 'Done',      color: '#065F46', bg: '#D1FAE5' },
  'this-week': { icon: CalendarCheck, label: 'This Week', color: '#1E3A8A', bg: '#DBEAFE' },
  'draft':     { icon: Circle,       label: 'Draft',     color: '#6C757D', bg: '#F1F3F5' },
};

const SECTION_ICONS: Record<SectionType, typeof BookOpen> = {
  'check-in':  MessageSquare,
  'last-week': RotateCcw,
  'learn':     BookOpen,
  'discuss':   Users,
  'practice':  Zap,
  'wrap-up':   Flag,
};

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  'check-in':  'Check-in',
  'last-week': "Last week's task",
  'learn':     'Learn',
  'discuss':   'Discuss',
  'practice':  'Practice',
  'wrap-up':   'Wrap-up',
};

const SUBMISSION_CFG: { type: SubmissionType; label: string; icon: typeof Link2 }[] = [
  { type: 'link',  label: 'Project link',    icon: Link2 },
  { type: 'file',  label: 'File upload',     icon: Paperclip },
  { type: 'text',  label: 'Written response', icon: AlignLeft },
  { type: 'image', label: 'Screenshot',      icon: ImageIcon },
];

// ─── Menu item ────────────────────────────────────────────────────────────────

function MenuItem({
  icon: Icon, label, disabled, disabledTitle, onClick, danger, hasSubmenu,
}: {
  icon: typeof Pencil; label: string; disabled?: boolean; disabledTitle?: string;
  onClick?: () => void; danger?: boolean; hasSubmenu?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left transition-colors
        ${disabled ? 'opacity-40 cursor-not-allowed' : danger ? 'text-[#FA5252] hover:bg-[#FFF5F5]' : 'text-[#212529] hover:bg-[#F8F9FA]'}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      {hasSubmenu && <ChevronRight className="size-3.5 text-[#ADB5BD]" strokeWidth={1.75} />}
    </button>
  );
}

// ─── Three-dot menu ────────────────────────────────────────────────────────────

function ThreeDotsMenu({
  isOpen, isFirst, isLast,
  onOpen, onClose, onEdit, onDuplicate, onMoveUp, onMoveDown, onDelete,
}: {
  isOpen: boolean; isFirst: boolean; isLast: boolean;
  onOpen: () => void; onClose: () => void; onEdit: () => void;
  onDuplicate: () => void; onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMove, setShowMove] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={e => { e.stopPropagation(); isOpen ? onClose() : onOpen(); }}
        className="size-8 rounded-lg flex items-center justify-center text-[#4B5563] hover:text-[#212529] hover:bg-[#F8F9FA] transition-colors"
        aria-label="Session options"
      >
        <MoreVertical className="size-4" strokeWidth={1.75} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-[#E9ECEF] py-1"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180 }}
          onClick={e => e.stopPropagation()}
        >
          <MenuItem icon={Pencil} label="Edit" onClick={() => { onEdit(); onClose(); }} />
          <MenuItem icon={Copy} label="Duplicate" onClick={() => { onDuplicate(); onClose(); }} />
          <div
            className="relative"
            onMouseEnter={() => setShowMove(true)}
            onMouseLeave={() => setShowMove(false)}
          >
            <MenuItem icon={ChevronUp} label="Move" hasSubmenu onClick={() => setShowMove(s => !s)} />
            {showMove && (
              <div
                className="absolute left-full top-0 ml-1 bg-white rounded-xl border border-[#E9ECEF] py-1"
                style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 140 }}
              >
                <MenuItem icon={ChevronUp} label="Move Up" disabled={isFirst} onClick={() => { if (!isFirst) { onMoveUp(); onClose(); } }} />
                <MenuItem icon={ChevronDown} label="Move Down" disabled={isLast} onClick={() => { if (!isLast) { onMoveDown(); onClose(); } }} />
              </div>
            )}
          </div>
          <div className="h-px bg-[#F1F3F5] my-1" />
          <MenuItem icon={Trash2} label="Delete" danger onClick={() => { onDelete(); onClose(); }} />
        </div>
      )}
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div className="px-6 pt-6 pb-5 flex flex-col gap-3">
          <div className="size-11 rounded-xl bg-[#FEE2E2] flex items-center justify-center">
            <Trash2 className="size-5 text-[#FA5252]" strokeWidth={1.75} />
          </div>
          <h3 className="font-bold text-[17px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>Delete "{title}"?</h3>
          <p className="text-[13px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>This will remove the session permanently.</p>
          <div className="flex gap-3 mt-2">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#E9ECEF] text-[14px] text-[#6C757D] hover:bg-[#F8F9FA] transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-[#FA5252] text-white text-[14px] font-semibold hover:bg-[#E03131] transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Extra resource editor ────────────────────────────────────────────────────

function ExtraResourceEditor({ entries, onChange }: { entries: ExtraResource[]; onChange: (entries: ExtraResource[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {entries.map((r, i) => (
        <div key={r.id} className="flex flex-col gap-1.5 p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] text-[#ADB5BD] font-medium" style={{ fontFamily: 'var(--font-body)' }}>Resource {i + 1}</span>
            <button onClick={() => onChange(entries.filter((_, j) => j !== i))} className="text-[#ADB5BD] hover:text-[#FA5252] transition-colors p-1">
              <Trash2 className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
          <input
            value={r.title}
            onChange={e => onChange(entries.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
            placeholder="Title"
            className="w-full px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[13px] bg-white"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <input
            value={r.url}
            onChange={e => onChange(entries.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
            placeholder="https://…"
            className="w-full px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[13px] bg-white"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <textarea
            rows={2}
            value={r.description}
            onChange={e => onChange(entries.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
            placeholder="Description (required)"
            className="w-full px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[13px] bg-white resize-none"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
      ))}
      <button
        onClick={() => onChange([...entries, { id: `r-${Date.now()}`, title: '', url: '', description: '' }])}
        className="flex items-center gap-1.5 text-[13px] text-[#00a79d] hover:underline w-fit"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <Plus className="size-3.5" strokeWidth={2} /> Add resource
      </button>
    </div>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-[11px] text-[#6C757D] font-semibold uppercase tracking-wide flex items-center gap-1" style={{ fontFamily: 'var(--font-body)' }}>
      {children}
      {required && <span className="text-[#FA5252] text-[10px]">*</span>}
    </span>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session, isFirst, isLast, isMenuOpen, isEditing, isAuthor, members,
  meId, canTrack, onToggleDone,
  onOpenMenu, onCloseMenu, onStartEdit, onSaveEdit, onCancelEdit,
  onDuplicate, onMoveUp, onMoveDown, onRequestDelete,
}: {
  session: Session; isFirst: boolean; isLast: boolean; isMenuOpen: boolean;
  isEditing: boolean; isAuthor: boolean; members: Member[];
  meId?: string; canTrack: boolean; onToggleDone: () => void;
  onOpenMenu: () => void; onCloseMenu: () => void; onStartEdit: () => void;
  onSaveEdit: (updates: Partial<Session>) => void; onCancelEdit: () => void;
  onDuplicate: () => void; onMoveUp: () => void; onMoveDown: () => void;
  onRequestDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(session.status === 'this-week');

  // Edit state
  const [editTitle,       setEditTitle]       = useState(session.title);
  const [editDate,        setEditDate]        = useState(session.date);
  const [editLevel,       setEditLevel]       = useState<BubbleLevel>(session.level);
  const [editObjective,   setEditObjective]   = useState(session.learningObjective);
  const [editLedBy,       setEditLedBy]       = useState(session.ledBy);
  const [editPreMats,     setEditPreMats]     = useState(session.preMaterials ?? '');
  const [editSections,    setEditSections]    = useState<SessionSection[]>(session.sections);
  const [editHomework,    setEditHomework]    = useState(session.homework ?? '');
  const [editSubTypes,    setEditSubTypes]    = useState<SubmissionType[]>(session.submissionTypes);
  const [editResources,   setEditResources]   = useState<ExtraResource[]>(session.extraResources ?? []);

  useEffect(() => {
    if (isEditing) {
      setEditTitle(session.title);
      setEditDate(session.date);
      setEditLevel(session.level);
      setEditObjective(session.learningObjective);
      setEditLedBy(session.ledBy);
      setEditPreMats(session.preMaterials ?? '');
      setEditSections(session.sections);
      setEditHomework(session.homework ?? '');
      setEditSubTypes(session.submissionTypes);
      setEditResources(session.extraResources ?? []);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateSection(idx: number, patch: Partial<SessionSection>) {
    setEditSections(ss => ss.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  function moveSectionUp(idx: number) {
    if (idx <= 0) return;
    setEditSections(ss => { const n = [...ss]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n; });
  }

  function moveSectionDown(idx: number) {
    setEditSections(ss => { if (idx >= ss.length - 1) return ss; const n = [...ss]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n; });
  }

  function addSection() {
    const ts = Date.now();
    setEditSections(ss => [...ss, { id: `step-${ts}`, type: 'learn', title: 'Learn', minutes: 20 }]);
  }

  function toggleSubType(t: SubmissionType) {
    setEditSubTypes(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]);
  }

  const cfg = STATUS_CFG[session.status];
  const sNum = `S${String(session.number).padStart(2, '0')}`;
  const totalMinutes = session.sections.reduce((sum, s) => sum + s.minutes, 0);
  // Group progress on this session: which current Members marked it done.
  const finishedBy = doneMembers(session, members);
  const iAmDone = !!meId && (session.completedBy ?? []).includes(meId);
  const groupPct = members.length ? Math.round((finishedBy.length / members.length) * 100) : 0;

  return (
    <div
      className="rounded-2xl"
      style={{
        border: isEditing ? '2px solid #00a79d' : '1px solid #E9ECEF',
        background: 'white',
        boxShadow: isEditing ? '0 0 0 4px rgba(43,191,170,0.12)' : 'var(--shadow-sm)',
        transition: 'border 0.2s, box-shadow 0.2s',
      }}
    >
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div
        className={`flex items-start gap-3 p-4 ${!isEditing ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
        onClick={() => !isEditing && setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          {/* Row 1: badge + title */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] text-white"
              style={{ fontFamily: 'var(--font-display)', background: '#00a79d' }}
            >
              {sNum}
            </div>
            <p className="font-bold text-[16px] text-[#212529] leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              {session.title}
            </p>
          </div>
          {/* Row 2: meta pills */}
          <div className="flex items-center gap-2 flex-wrap pl-[2.875rem]">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: cfg.bg, color: cfg.color, fontFamily: 'var(--font-body)' }}
            >
              <cfg.icon className="size-3" strokeWidth={2} /> {cfg.label}
            </span>
            <span className="text-[11px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
              {session.date} · {totalMinutes} min
            </span>
            {canTrack && iAmDone && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46]"
                style={{ fontFamily: 'var(--font-body)' }}>
                <Check className="size-3" strokeWidth={2.5} /> You're done
              </span>
            )}
            {canTrack && members.length > 1 && (
              <span className="text-[11px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                · {finishedBy.length}/{members.length} finished
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        {!isEditing && (
          <div className="shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {isAuthor && (
              <>
                <button
                  onClick={() => onStartEdit()}
                  className="size-8 rounded-lg flex items-center justify-center text-[#4B5563] hover:text-[#212529] hover:bg-[#F8F9FA] transition-colors"
                  title="Edit session"
                >
                  <Pencil className="size-4" strokeWidth={1.75} />
                </button>
                <ThreeDotsMenu
                  isOpen={isMenuOpen} isFirst={isFirst} isLast={isLast}
                  onOpen={onOpenMenu} onClose={onCloseMenu}
                  onEdit={onStartEdit} onDuplicate={onDuplicate}
                  onMoveUp={onMoveUp} onMoveDown={onMoveDown} onDelete={onRequestDelete}
                />
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
              className="size-8 flex items-center justify-center text-[#4B5563] hover:text-[#212529] hover:bg-[#F8F9FA] rounded-lg transition-colors"
            >
              <ChevronDown className="size-4 transition-transform" strokeWidth={1.75} style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>
        )}
      </div>

      {/* ── Progress bar: how much of the group finished this session ─────── */}
      {!isEditing && canTrack && (
        <div className="h-1 bg-[#F1F3F5]" title={`${finishedBy.length} of ${members.length} finished`}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${groupPct}%`, background: '#00a79d' }}
          />
        </div>
      )}

      {/* ── Expanded read view ─────────────────────────────────────────────── */}
      {expanded && !isEditing && (
        <div className="border-t border-[#F1F3F5] px-5 py-4 flex flex-col gap-4">

          {/* Learning objective */}
          <div className="flex flex-col gap-1">
            <p className="text-[11px] text-[#ADB5BD] font-semibold uppercase tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>
              By the end, we'll be able to…
            </p>
            <p className="text-[15px] font-semibold text-[#212529] leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              {session.learningObjective || <span className="text-[#ADB5BD] italic font-normal">No learning objective set</span>}
            </p>
          </div>


          {/* Pre-materials */}
          {session.preMaterials && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3">
              <p className="text-[11px] text-[#92400E] font-semibold uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-body)' }}>Before we meet</p>
              <p className="text-[13px] text-[#78350F]" style={{ fontFamily: 'var(--font-body)' }}>{session.preMaterials}</p>
            </div>
          )}

          {/* During the meeting */}
          {session.sections.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] text-[#ADB5BD] font-semibold uppercase tracking-wide mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>During the meeting</p>
              {session.sections.map(section => {
                const SectionIcon = SECTION_ICONS[section.type] ?? Target;
                return (
                  <div key={section.id} className="flex gap-3 px-3 py-3 rounded-xl hover:bg-[#F8F9FA] transition-colors">
                    <div className="mt-0.5 shrink-0 size-7 rounded-lg bg-[#E5F5F4] flex items-center justify-center">
                      <SectionIcon className="size-3.5 text-[#00a79d]" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[13px] font-semibold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>{section.title}</p>
                        <span className="text-[11px] text-[#ADB5BD]" style={{ fontFamily: 'var(--font-body)' }}>{section.minutes} min</span>
                      </div>
                      {section.whatHappens && (
                        <p className="text-[13px] text-[#495057] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{section.whatHappens}</p>
                      )}
                      {section.notes && (
                        <p className="text-[12px] text-[#6C757D] italic mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>{section.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Until next time */}
          <div className="border-t border-[#F1F3F5] pt-4 flex flex-col gap-3">
            <p className="text-[11px] text-[#ADB5BD] font-semibold uppercase tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>Until next time</p>

            {session.homework ? (
              <p className="text-[13px] text-[#495057] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{session.homework}</p>
            ) : (
              <p className="text-[13px] text-[#ADB5BD] italic" style={{ fontFamily: 'var(--font-body)' }}>No homework set for this session.</p>
            )}

            {session.submissionTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <p className="w-full text-[11px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>Submit via:</p>
                {session.submissionTypes.map(t => {
                  const sub = SUBMISSION_CFG.find(c => c.type === t);
                  if (!sub) return null;
                  const SubIcon = sub.icon;
                  return (
                    <span key={t} className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-lg bg-[#E5F5F4] text-[#008f86]" style={{ fontFamily: 'var(--font-body)' }}>
                      <SubIcon className="size-3.5" strokeWidth={1.75} /> {sub.label}
                    </span>
                  );
                })}
              </div>
            )}

            {(session.extraResources ?? []).length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>Extra resources:</p>
                {(session.extraResources ?? []).map(r => (
                  <div key={r.id} className="flex flex-col gap-0.5">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#00a79d] font-medium hover:underline" style={{ fontFamily: 'var(--font-body)' }}>
                      {r.title}
                    </a>
                    <p className="text-[12px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Your progress on this session + who already finished it */}
          {canTrack && (
            <div className="border-t border-[#F1F3F5] pt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                {finishedBy.length > 0 && (
                  <div className="flex -space-x-2 shrink-0">
                    {finishedBy.slice(0, 5).map(m => (
                      m.avatar
                        ? <img key={m.id} src={m.avatar} alt={m.name} title={m.name} className="size-6 rounded-full object-cover border-2 border-white" />
                        : <span key={m.id} title={m.name} className="size-6 rounded-full bg-[#E5F5F4] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#008f86]">{m.name.charAt(0).toUpperCase()}</span>
                    ))}
                  </div>
                )}
                <p className="text-[12px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                  {finishedBy.length === 0
                    ? 'Nobody has finished this session yet.'
                    : members.length > 1
                      ? `${finishedBy.length} of ${members.length} finished`
                      : 'Finished'}
                </p>
              </div>
              <button
                onClick={onToggleDone}
                aria-pressed={iAmDone}
                className={`flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                  iAmDone
                    ? 'border border-[#7ECFCA] bg-[#E5F5F4] text-[#008f86] hover:bg-[#D1F0EE]'
                    : 'bg-[#00a79d] text-white hover:bg-[#008f86]'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
                title={iAmDone ? 'Click to mark as not done' : undefined}
              >
                {iAmDone
                  ? <><Check className="size-4" strokeWidth={2.5} /> Done</>
                  : <><CheckCircle2 className="size-4" strokeWidth={2} /> Mark as done</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Edit view ──────────────────────────────────────────────────────── */}
      {isEditing && (
        <div className="border-t border-[#E9ECEF]" onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 flex flex-col gap-4">

            {/* Title + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <Label required>Session title</Label>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Session title"
                  className="px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[14px] bg-[#F8F9FA]"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label required>Date</Label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[14px] bg-[#F8F9FA]"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>
            </div>

            {/* Learning Objective */}
            <div className="flex flex-col gap-1">
              <Label required>By the end, we'll be able to…</Label>
              <textarea
                rows={2}
                value={editObjective}
                onChange={e => setEditObjective(e.target.value)}
                placeholder="One sentence. Start with a verb: write, build, compare, choose."
                className="px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[13px] bg-[#F8F9FA] resize-none"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>

            {/* Pre-materials */}
            {editPreMats ? (
              <div className="flex flex-col gap-1">
                <Label>Before we meet</Label>
                <textarea
                  rows={2}
                  value={editPreMats}
                  onChange={e => setEditPreMats(e.target.value)}
                  placeholder="Readings, videos, or prep to do before we meet."
                  className="px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[13px] bg-[#F8F9FA] resize-none"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>
            ) : (
              <button
                onClick={() => setEditPreMats(' ')}
                className="flex items-center gap-1.5 text-[13px] text-[#ADB5BD] hover:text-[#00a79d] transition-colors w-fit"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <Plus className="size-3.5" strokeWidth={2} /> Add "Before we meet"
              </button>
            )}

            {/* Steps */}
            <div className="flex flex-col gap-2">
              <Label>During the meeting</Label>
              {editSections.map((section, idx) => {
                const SectionIcon = SECTION_ICONS[section.type] ?? Target;
                return (
                  <div key={section.id} className="flex flex-col gap-2 p-3 bg-[#F8F9FA] rounded-xl border border-[#E9ECEF]">
                    {/* Row 1: type, title, minutes, arrows */}
                    <div className="flex items-center gap-2">
                      <SectionIcon className="size-4 text-[#00a79d] shrink-0" strokeWidth={1.75} />
                      <select
                        value={section.type}
                        onChange={e => updateSection(idx, { type: e.target.value as SectionType, title: SECTION_TYPE_LABELS[e.target.value as SectionType] })}
                        className="text-[12px] px-2 py-1 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] bg-white"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {(Object.keys(SECTION_TYPE_LABELS) as SectionType[]).map(t => (
                          <option key={t} value={t}>{SECTION_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                      <input
                        value={section.title}
                        onChange={e => updateSection(idx, { title: e.target.value })}
                        placeholder="Step title"
                        className="flex-1 min-w-0 text-[13px] px-2 py-1 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] bg-white"
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                      <input
                        type="number" min="1"
                        value={section.minutes}
                        onChange={e => updateSection(idx, { minutes: parseInt(e.target.value) || 1 })}
                        className="w-14 text-[13px] px-2 py-1 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] bg-white text-center"
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                      <span className="text-[11px] text-[#ADB5BD] shrink-0" style={{ fontFamily: 'var(--font-body)' }}>min <span className="text-[#FA5252]">*</span></span>
                      <div className="flex flex-col shrink-0">
                        <button onClick={() => moveSectionUp(idx)} disabled={idx === 0} className="p-0.5 text-[#ADB5BD] hover:text-[#212529] disabled:opacity-30 transition-colors">
                          <ChevronUp className="size-3.5" strokeWidth={2} />
                        </button>
                        <button onClick={() => moveSectionDown(idx)} disabled={idx === editSections.length - 1} className="p-0.5 text-[#ADB5BD] hover:text-[#212529] disabled:opacity-30 transition-colors">
                          <ChevronDown className="size-3.5" strokeWidth={2} />
                        </button>
                      </div>
                      <button onClick={() => setEditSections(ss => ss.filter((_, j) => j !== idx))} className="p-1 text-[#ADB5BD] hover:text-[#FA5252] transition-colors">
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                    {/* Row 2: what happens */}
                    <textarea
                      rows={2}
                      value={section.whatHappens ?? ''}
                      onChange={e => updateSection(idx, { whatHappens: e.target.value })}
                      placeholder="What happens in this step…"
                      className="w-full px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[12px] bg-white resize-none"
                      style={{ fontFamily: 'var(--font-body)' }}
                    />
                  </div>
                );
              })}
              <button
                onClick={addSection}
                className="flex items-center gap-1.5 text-[13px] text-[#00a79d] hover:underline w-fit"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <Plus className="size-3.5" strokeWidth={2} /> Add step
              </button>
            </div>

            {/* Until next time */}
            <div className="flex flex-col gap-3 border-t border-[#F1F3F5] pt-4">
              <p className="text-[11px] text-[#6C757D] font-semibold uppercase tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>Until next time</p>

              <div className="flex flex-col gap-1">
                <Label>Homework</Label>
                <textarea
                  rows={3}
                  value={editHomework}
                  onChange={e => setEditHomework(e.target.value)}
                  placeholder="A concrete deliverable members can share at the next meeting."
                  className="px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[13px] bg-[#F8F9FA] resize-none"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Submit via</Label>
                <div className="flex flex-wrap gap-2">
                  {SUBMISSION_CFG.map(({ type, label, icon: SubIcon }) => (
                    <label key={type} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editSubTypes.includes(type)}
                        onChange={() => toggleSubType(type)}
                        className="accent-[#00a79d]"
                      />
                      <SubIcon className="size-3.5 text-[#6C757D]" strokeWidth={1.75} />
                      <span className="text-[13px] text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {editResources.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <Label>Extra resources</Label>
                  <ExtraResourceEditor entries={editResources} onChange={setEditResources} />
                </div>
              ) : (
                <button
                  onClick={() => setEditResources([{ id: `er-${Date.now()}`, title: '', url: '', description: '' }])}
                  className="flex items-center gap-1.5 text-[13px] text-[#ADB5BD] hover:text-[#00a79d] transition-colors w-fit"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <Plus className="size-3.5" strokeWidth={2} /> Add extra resources
                </button>
              )}
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="px-5 py-3 border-t border-[#E9ECEF] flex items-center justify-end gap-2.5">
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 rounded-xl border border-[#E9ECEF] text-[13px] text-[#6C757D] hover:bg-[#F8F9FA] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >Cancel</button>
            <button
              onClick={() => onSaveEdit({
                title:            editTitle.trim() || session.title,
                date:             editDate.trim() || session.date,
                level:            editLevel,
                learningObjective: editObjective.trim(),
                ledBy:            editLedBy,
                preMaterials:     editPreMats.trim() || undefined,
                sections:         editSections,
                homework:         editHomework.trim() || undefined,
                submissionTypes:  editSubTypes,
                extraResources:   editResources.filter(r => r.title || r.url),
                duration:         editSections.reduce((sum, s) => sum + s.minutes, 0),
              })}
              className="px-4 py-2 rounded-xl bg-[#00a79d] text-white text-[13px] font-semibold hover:bg-[#008f86] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SyllabusTab ──────────────────────────────────────────────────────────────

interface Props {
  bubble: Bubble;
  isFounder: boolean;
  isAuthor?: boolean;
  userJoined?: boolean;
}

// isAuthor defaults to FALSE: editing controls render only when the parent
// explicitly passes founder rights (learners never see edit menus). The
// database enforces the same rule on every save.
export function SyllabusTab({ bubble, isFounder, isAuthor = false, userJoined = true }: Props) {
  const { isLoggedIn, currentUser } = useApp();
  const meId = currentUser?.id;
  const members = bubble.members ?? [];
  // Members (including the Founder) track their own progress.
  const canTrack = userJoined && !!meId;
  const [sessions, setSessions] = useState<Session[]>(bubble.sessions);
  const [openMenuId, setOpenMenuId]   = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [showImport, setShowImport]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ session: Session; index: number } | null>(null);
  const autoOpened = useRef(false);

  // Keep in sync when the syllabus arrives/changes from the database.
  // The first time it arrives, open the first session for editing if the
  // author hasn't written it yet (e.g. straight after the create wizard).
  useEffect(() => {
    setSessions(bubble.sessions);
    if (!autoOpened.current && bubble.detailLoaded) {
      autoOpened.current = true;
      const first = bubble.sessions[0];
      if (isAuthor && first && first.status === 'draft' && first.learningObjective === '') {
        setEditingId(first.id);
      }
    }
  }, [bubble.sessions, bubble.detailLoaded, isAuthor]);

  /** Mark a session done / not done for ME, and celebrate with the group. */
  function toggleDone(id: string) {
    if (!meId) return;
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    const wasDone = (session.completedBy ?? []).includes(meId);
    const setMine = (done: boolean) => setSessions(ss => ss.map(s => s.id !== id ? s : {
      ...s,
      completedBy: done
        ? [...new Set([...(s.completedBy ?? []), meId])]
        : (s.completedBy ?? []).filter(u => u !== meId),
    }));
    setMine(!wasDone);
    api.setSessionComplete(id, !wasDone)
      .then(() => { if (!wasDone) toast.success(celebration(session, members, meId)); })
      .catch(err => {
        setMine(wasDone);
        toast.error(api.errorMessage(err, 'Could not save your progress — please try again.'));
      });
  }

  function reflowNumbers(ss: Session[]): Session[] {
    return ss.map((s, i) => ({ ...s, number: i + 1 }));
  }

  /** Persist the current ordering (session numbers) after move/duplicate/undo. */
  function persistOrder(ss: Session[]) {
    api.renumberSessions(ss.map((s, i) => ({ id: s.id, number: i + 1 })))
      .catch(() => toast.error('Could not save the new order'));
  }

  /** Give freshly saved steps their database ids. */
  function withSectionIds(s: Session, ids: string[]): Session {
    return { ...s, sections: s.sections.map((sec, i) => ({ ...sec, id: ids[i] ?? sec.id })) };
  }

  async function addSession() {
    const ts = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const newId = `session-${ts}`;
    const draft: Session = {
      id: newId,
      number: sessions.length + 1,
      title: 'New Session',
      status: 'draft',
      date: today,
      duration: 90,
      xp: 100,
      level: 'Intermediate',
      learningObjective: '',
      ledBy: bubble.founderId,
      submissionTypes: ['link'],
      sections: SEED_SECTIONS.map((s, i) => ({ ...s, id: `${newId}-s${i}` })),
    };
    try {
      const { id, sectionIds } = await api.createSessionWithPlan(bubble.id, draft);
      const saved = withSectionIds({ ...draft, id }, sectionIds);
      setSessions(ss => [...ss, saved]);
      setEditingId(id);
    } catch {
      toast.error('Could not add a session — please try again.');
    }
  }

  function saveEdit(id: string, updates: Partial<Session>) {
    const orig = sessions.find(s => s.id === id);
    if (!orig) return;
    const next = { ...orig, ...updates };
    setSessions(ss => ss.map(s => s.id === id ? next : s));
    setEditingId(null);
    api.saveSession(id, next)
      .then(ids => setSessions(ss => ss.map(s => s.id === id ? withSectionIds(s, ids) : s)))
      .catch(err => {
        setSessions(ss => ss.map(s => s.id === id ? orig : s));
        toast.error(api.errorMessage(err, 'Could not save your changes — they were reverted.'));
      });
  }

  async function duplicate(id: string) {
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return;
    const orig = sessions[idx];
    const copy: Session = { ...orig, number: idx + 2, title: `${orig.title} (Copy)`, status: 'draft' };
    try {
      const { id: newId, sectionIds } = await api.createSessionWithPlan(bubble.id, copy);
      const saved = withSectionIds({ ...copy, id: newId }, sectionIds);
      setSessions(ss => {
        const next = [...ss];
        next.splice(idx + 1, 0, saved);
        const reflowed = reflowNumbers(next);
        persistOrder(reflowed);
        return reflowed;
      });
      toast('Session duplicated.');
    } catch {
      toast.error('Could not duplicate — please try again.');
    }
  }

  function moveUp(id: string) {
    setSessions(ss => {
      const idx = ss.findIndex(s => s.id === id);
      if (idx <= 0) return ss;
      const next = [...ss];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      const reflowed = reflowNumbers(next);
      persistOrder(reflowed);
      return reflowed;
    });
    setOpenMenuId(null);
  }

  function moveDown(id: string) {
    setSessions(ss => {
      const idx = ss.findIndex(s => s.id === id);
      if (idx >= ss.length - 1) return ss;
      const next = [...ss];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      const reflowed = reflowNumbers(next);
      persistOrder(reflowed);
      return reflowed;
    });
    setOpenMenuId(null);
  }

  function requestDelete(id: string) {
    const idx = sessions.findIndex(s => s.id === id);
    const session = sessions[idx];
    if (session) setDeleteTarget({ session, index: idx });
    setOpenMenuId(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const { session: removed, index: origIdx } = deleteTarget;
    setSessions(ss => {
      const reflowed = reflowNumbers(ss.filter(s => s.id !== removed.id));
      persistOrder(reflowed);
      return reflowed;
    });
    setDeleteTarget(null);

    // Soft-delete on the server immediately; Undo restores it.
    api.softDeleteSession(removed.id)
      .catch(() => toast.error('Could not delete this session'));

    let undone = false;
    toast('Session deleted.', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          if (undone) return;
          undone = true;
          api.restoreSession(removed.id)
            .then(() => {
              setSessions(ss => {
                const next = [...ss];
                next.splice(Math.min(origIdx, next.length), 0, removed);
                const reflowed = reflowNumbers(next);
                persistOrder(reflowed);
                return reflowed;
              });
            })
            .catch(() => toast.error('Could not restore the session'));
        },
      },
    });
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Top Banner — only shown to members/founder */}
      {canTrack && (
        <GroupProgressBanner sessions={sessions} members={members} meId={meId} founderId={bubble.founderId} />
      )}

      {/* Sessions header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-bold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>Sessions</h3>
        {isFounder && (
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E9ECEF] text-[#495057] text-[13px] font-medium hover:border-[#00a79d] hover:text-[#00a79d] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <Upload className="size-3.5" strokeWidth={1.75} /> Import
          </button>
        )}
      </div>

      {showImport && <ImportSyllabusModal bubble={bubble} onClose={() => setShowImport(false)} />}

      {/* Session list */}
      <div className="flex flex-col gap-3">
        {sessions.map((session, i) => (
          <SessionCard
            key={session.id}
            session={session}
            isFirst={i === 0}
            isLast={i === sessions.length - 1}
            isMenuOpen={openMenuId === session.id}
            isEditing={editingId === session.id}
            isAuthor={isAuthor}
            members={members}
            meId={meId}
            canTrack={canTrack}
            onToggleDone={() => toggleDone(session.id)}
            onOpenMenu={() => setOpenMenuId(session.id)}
            onCloseMenu={() => setOpenMenuId(null)}
            onStartEdit={() => { setEditingId(session.id); setOpenMenuId(null); }}
            onSaveEdit={updates => saveEdit(session.id, updates)}
            onCancelEdit={() => setEditingId(null)}
            onDuplicate={() => duplicate(session.id)}
            onMoveUp={() => moveUp(session.id)}
            onMoveDown={() => moveDown(session.id)}
            onRequestDelete={() => requestDelete(session.id)}
          />
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-12 text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
            {!isLoggedIn
              ? 'Sign in to preview the full course guide.'
              : !bubble.detailLoaded
                ? 'Loading course guide…'
                : isFounder
                  ? 'Click "Add Session" below to build your course guide.'
                  : 'Sessions coming soon.'}
          </div>
        )}

        {/* Add Session — bottom, secondary style */}
        {isFounder && (
          <button
            onClick={addSession}
            className="flex items-center justify-center gap-1.5 w-full py-3 rounded-2xl border-2 border-dashed border-[#D1FAE5] text-[#00a79d] text-[14px] font-semibold hover:bg-[#F0FFFE] hover:border-[#00a79d] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <Plus className="size-4" strokeWidth={2} /> Add Session
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          title={deleteTarget.session.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
