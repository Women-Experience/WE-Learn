import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, RefreshCw, Lock, BookOpen, FileText, PlayCircle, Wrench, Bot, MessageCircle,
  Plus, Pin, MoreVertical, Pencil, Sparkles, Copy, ChevronRight, ChevronUp, ChevronDown, Trash2,
  Check, Star, X, Upload,
} from "lucide-react";
import type { Bubble, Session, SessionStatus, BubbleLevel, VideoEntry } from "../../types";
import { DatePicker } from "./DatePicker";
import { ImportSyllabusModal } from "./ImportSyllabusModal";
import * as api from "../../data/api";
import { useApp } from "../../context/AppContext";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<SessionStatus, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
  'done':        { icon: CheckCircle2, label: 'Done',        color: '#065F46', bg: '#D1FAE5' },
  'in-progress': { icon: RefreshCw,    label: 'In Progress', color: '#1E3A8A', bg: '#DBEAFE' },
  'locked':      { icon: Lock,         label: 'Locked',      color: '#6C757D', bg: '#F1F3F5' },
};

const SECTION_ICONS: Record<string, typeof BookOpen> = {
  'learning-path': BookOpen,
  'brief':         FileText,
  'video':         PlayCircle,
  'sandbox':       Wrench,
  'ai-eval':       Bot,
  'reflection':    MessageCircle,
};

// ─── Menu item ────────────────────────────────────────────────────────────────

function MenuItem({
  icon: Icon,
  label,
  disabled,
  disabledTitle,
  onClick,
  danger,
  hasSubmenu,
}: {
  icon: typeof Pencil;
  label: string;
  disabled?: boolean;
  disabledTitle?: string;
  onClick?: () => void;
  danger?: boolean;
  hasSubmenu?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left transition-colors
        ${disabled
          ? 'opacity-40 cursor-not-allowed'
          : danger
            ? 'text-[#FA5252] hover:bg-[#FFF5F5]'
            : 'text-[#212529] hover:bg-[#F8F9FA]'}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      {hasSubmenu && <ChevronRight className="size-3.5 text-[#ADB5BD]" strokeWidth={1.75} />}
    </button>
  );
}

// ─── Video list editor ────────────────────────────────────────────────────────

function VideoListEditor({
  entries,
  onChange,
}: {
  entries: VideoEntry[];
  onChange: (entries: VideoEntry[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {entries.map((v, i) => (
        <div key={v.id} className="flex flex-col gap-1.5 p-3 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF]">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] text-[#ADB5BD] font-medium" style={{ fontFamily: 'var(--font-body)' }}>
              Video {i + 1}
            </span>
            <button
              onClick={() => onChange(entries.filter((_, j) => j !== i))}
              className="text-[#ADB5BD] hover:text-[#FA5252] transition-colors p-1"
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
          <input
            value={v.title}
            onChange={e => { const next = entries.map((x, j) => j === i ? { ...x, title: e.target.value } : x); onChange(next); }}
            placeholder="Video title"
            className="w-full px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[13px] bg-white"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <input
            value={v.url}
            onChange={e => { const next = entries.map((x, j) => j === i ? { ...x, url: e.target.value } : x); onChange(next); }}
            placeholder="https://youtube.com/watch?v=…"
            className="w-full px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[13px] bg-white"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
      ))}
      <button
        onClick={() => onChange([...entries, { id: `v-${Date.now()}`, title: '', url: '' }])}
        className="flex items-center gap-1.5 text-[13px] text-[#00a79d] hover:underline w-fit"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <Plus className="size-3.5" strokeWidth={2} /> Add video
      </button>
    </div>
  );
}

// ─── Three-dot contextual menu ────────────────────────────────────────────────

function ThreeDotsMenu({
  isOpen,
  isLocked,
  isFirst,
  isLast,
  onOpen,
  onClose,
  onEdit,
  onEditAI,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  isOpen: boolean;
  isLocked: boolean;
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEdit: () => void;
  onEditAI: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMove, setShowMove] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={e => { e.stopPropagation(); isOpen ? onClose() : onOpen(); }}
        className="size-8 rounded-lg flex items-center justify-center text-[#4B5563] hover:text-[#212529] hover:bg-[#F8F9FA] transition-colors"
        title="Options"
        aria-label="Section options"
      >
        <MoreVertical className="size-4" strokeWidth={1.75} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-[#E9ECEF] py-1"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Edit */}
          <MenuItem
            icon={Pencil}
            label="Edit"
            disabled={isLocked}
            disabledTitle="Unlock section to edit"
            onClick={() => { if (!isLocked) { onEdit(); onClose(); } }}
          />

          {/* Edit with AI */}
          <MenuItem
            icon={Sparkles}
            label="Edit with AI"
            disabled={isLocked}
            disabledTitle="Unlock section to edit"
            onClick={() => { if (!isLocked) { onEditAI(); onClose(); } }}
          />

          {/* Duplicate */}
          <MenuItem
            icon={Copy}
            label="Duplicate"
            onClick={() => { onDuplicate(); onClose(); }}
          />

          {/* Move — nested submenu */}
          <div
            className="relative"
            onMouseEnter={() => setShowMove(true)}
            onMouseLeave={() => setShowMove(false)}
          >
            <MenuItem
              icon={ChevronUp}
              label="Move"
              hasSubmenu
              onClick={() => setShowMove(s => !s)}
            />
            {showMove && (
              <div
                className="absolute left-full top-0 ml-1 bg-white rounded-xl border border-[#E9ECEF] py-1"
                style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 140 }}
              >
                <MenuItem
                  icon={ChevronUp}
                  label="Move Up"
                  disabled={isFirst}
                  onClick={() => { if (!isFirst) { onMoveUp(); onClose(); } }}
                />
                <MenuItem
                  icon={ChevronDown}
                  label="Move Down"
                  disabled={isLast}
                  onClick={() => { if (!isLast) { onMoveDown(); onClose(); } }}
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-[#F1F3F5] my-1" />

          {/* Delete */}
          <MenuItem
            icon={Trash2}
            label="Delete"
            danger
            disabled={isLocked}
            disabledTitle="Unlock section to edit"
            onClick={() => { if (!isLocked) { onDelete(); onClose(); } }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
      >
        <div className="px-6 pt-6 pb-5 flex flex-col gap-3">
          <div className="size-11 rounded-xl bg-[#FEE2E2] flex items-center justify-center">
            <Trash2 className="size-5 text-[#FA5252]" strokeWidth={1.75} />
          </div>
          <h3 className="font-bold text-[17px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
            Delete "{title}"?
          </h3>
          <p className="text-[13px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
            This will hide the section from current and future views.
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-[#E9ECEF] text-[14px] text-[#6C757D] hover:bg-[#F8F9FA] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-[#FA5252] text-white text-[14px] font-semibold hover:bg-[#E03131] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  isFirst,
  isLast,
  isMenuOpen,
  isEditing,
  isEditingAI,
  isAuthor,
  onOpenMenu,
  onCloseMenu,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onRequestDelete,
  onUpdate,
  onSaveProgress,
}: {
  session: Session;
  isFirst: boolean;
  isLast: boolean;
  isMenuOpen: boolean;
  isEditing: boolean;
  isEditingAI: boolean;
  isAuthor: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onStartEdit: (withAI: boolean) => void;
  onSaveEdit: (updates: Partial<Session>) => void;
  onCancelEdit: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRequestDelete: () => void;
  onUpdate: (updated: Session) => void;
  onSaveProgress: (patch: {
    projectUrl?: string; reflectionNote?: string; confidenceRating?: number;
  }) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(session.status === 'in-progress');
  const [projectUrl, setProjectUrl] = useState(session.projectUrl ?? '');
  const [reflectionNote, setNote] = useState(session.reflectionNote ?? '');
  const [confidence, setConfidence] = useState(session.confidenceRating ?? 0);
  const [savedProject, setSavedProject] = useState(!!session.projectUrl);
  const [savedReflect, setSavedReflect] = useState(!!session.reflectionNote);

  // Inline edit state
  const [editTitle,    setEditTitle]    = useState(session.title);
  const [editDate,     setEditDate]     = useState(session.date);
  const [editDuration, setEditDuration] = useState(String(session.duration));
  const [editXP,       setEditXP]       = useState(String(session.xp));
  const [editLevel,    setEditLevel]    = useState<BubbleLevel>(session.level);
  const [editStatus,   setEditStatus]   = useState<SessionStatus>(session.status);
  const [editSections, setEditSections] = useState(session.sections);

  useEffect(() => {
    if (isEditing) {
      setEditTitle(session.title);
      setEditDate(session.date);
      setEditDuration(String(session.duration));
      setEditXP(String(session.xp));
      setEditLevel(session.level);
      setEditStatus(session.status);
      setEditSections(session.sections);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateSection(idx: number, patch: Partial<Session['sections'][number]>) {
    setEditSections(ss => ss.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  const cfg = STATUS_CFG[session.status];
  const isLocked = session.status === 'locked';
  const sNum = `S${String(session.number).padStart(2, '0')}`;
  const progress = session.status === 'done' ? 100 : session.status === 'in-progress' ? 45 : 0;

  const cardBorder = isEditing
    ? '2px solid #00a79d'
    : '1px solid #E9ECEF';

  return (
    <div
      className="rounded-2xl"
      style={{
        border: cardBorder,
        background: 'white',
        boxShadow: isEditing ? '0 0 0 4px rgba(43,191,170,0.12)' : 'var(--shadow-sm)',
        opacity: isLocked && !isEditing ? 0.65 : 1,
        transition: 'border 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Header row */}
      <div
        className={`flex items-start gap-3 p-4 ${!isLocked && !isEditing ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
        onClick={() => !isLocked && !isEditing && setExpanded(e => !e)}
      >
        {/* Row 1: S-badge + title  |  Row 2: status · level · date */}
        <div className="flex-1 min-w-0">
          {/* Row 1 — primary */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] text-white"
              style={{ fontFamily: 'var(--font-display)', background: '#00a79d' }}
            >
              {sNum}
            </div>
            {isEditing ? (
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="flex-1 font-semibold text-[16px] text-[#212529] px-2 py-1 rounded-lg border border-[#00a79d] focus:outline-none bg-[#F8FFFE]"
                style={{ fontFamily: 'var(--font-display)' }}
                placeholder="Session title"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <p className="font-bold text-[16px] text-[#212529] leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                {session.title}
              </p>
            )}
          </div>

          {/* Row 2 — secondary meta (always visible, read-only) */}
          <div className="flex items-center gap-2 flex-wrap pl-[2.875rem] mb-1">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: cfg.bg, color: cfg.color, fontFamily: 'var(--font-body)' }}
            >
              <cfg.icon className="size-3" strokeWidth={2} /> {cfg.label}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F1F3F5] text-[#6C757D] shrink-0"
              style={{ fontFamily: 'var(--font-body)' }}>
              {isEditing ? editLevel : session.level}
            </span>
            <span className="text-[11px] text-[#6C757D] whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
              {isEditing
                ? `${editDate || session.date} · ${editDuration || session.duration} min · ${editXP || session.xp} XP`
                : `${session.date} · ${session.duration} min · ${session.xp} XP`}
            </span>
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-2 mt-2" onClick={e => e.stopPropagation()}>
              {/* Date + Duration */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5 col-span-2">
                  <label className="text-[10px] text-[#ADB5BD] font-medium px-1" style={{ fontFamily: 'var(--font-body)' }}>Date</label>
                  <DatePicker value={editDate} onChange={setEditDate} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-[#ADB5BD] font-medium px-1" style={{ fontFamily: 'var(--font-body)' }}>Duration (min)</label>
                  <input
                    type="number" min="1"
                    value={editDuration}
                    onChange={e => setEditDuration(e.target.value)}
                    className="text-[13px] px-2 py-1.5 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] bg-[#F8F9FA]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                </div>
              </div>
              {/* XP + Level */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-[#ADB5BD] font-medium px-1" style={{ fontFamily: 'var(--font-body)' }}>XP</label>
                  <input
                    type="number" min="0"
                    value={editXP}
                    onChange={e => setEditXP(e.target.value)}
                    className="text-[13px] px-2 py-1.5 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] bg-[#F8F9FA]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-[#ADB5BD] font-medium px-1" style={{ fontFamily: 'var(--font-body)' }}>Level</label>
                  <select
                    value={editLevel}
                    onChange={e => setEditLevel(e.target.value as BubbleLevel)}
                    className="text-[13px] px-2 py-1.5 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] bg-[#F8F9FA]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
              </div>
              {isEditingAI && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#ADB5BD] bg-[#F8F9FA] opacity-60 mt-1">
                  <Sparkles className="size-4 text-[#ADB5BD] shrink-0" strokeWidth={1.75} />
                  <span className="text-[12px] text-[#ADB5BD] italic" style={{ fontFamily: 'var(--font-body)' }}>
                    AI editing coming soon
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Right controls: ⋮ | ∨ */}
        {!isEditing && (
          <div className="shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {isAuthor && (
              <ThreeDotsMenu
                isOpen={isMenuOpen}
                isLocked={isLocked}
                isFirst={isFirst}
                isLast={isLast}
                onOpen={onOpenMenu}
                onClose={onCloseMenu}
                onEdit={() => onStartEdit(false)}
                onEditAI={() => onStartEdit(true)}
                onDuplicate={onDuplicate}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onDelete={onRequestDelete}
              />
            )}
            {!isLocked && (
              <button
                onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                className="size-8 flex items-center justify-center text-[#4B5563] hover:text-[#212529] hover:bg-[#F8F9FA] rounded-lg transition-colors"
              >
                <ChevronDown
                  className="size-4 transition-transform"
                  strokeWidth={1.75}
                  style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Editable sections panel */}
      {isEditing && (
        <div className="border-t border-[#E9ECEF]" onClick={e => e.stopPropagation()}>
          {editSections.map((section, idx) => {
            const SectionIcon = SECTION_ICONS[section.type] ?? Pin;
            const isReadOnly = section.type === 'ai-eval' || section.type === 'reflection';

            return (
              <div
                key={section.id}
                className={`px-5 py-3.5 border-b border-[#F8F9FA] last:border-0 ${isReadOnly ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <SectionIcon className={`size-4 shrink-0 ${isReadOnly ? 'text-[#ADB5BD]' : 'text-[#00a79d]'}`} strokeWidth={1.75} />
                  <p className="text-[13px] font-semibold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                    {section.title}
                  </p>
                  {isReadOnly && (
                    <span className="ml-auto text-[11px] text-[#ADB5BD]" style={{ fontFamily: 'var(--font-body)' }}>
                      Member only
                    </span>
                  )}
                </div>

                {isReadOnly && (
                  <p className="text-[12px] text-[#ADB5BD] italic" style={{ fontFamily: 'var(--font-body)' }}>
                    {section.type === 'ai-eval' ? 'AI feedback is generated after project submission.' : 'Members fill this in after each session.'}
                  </p>
                )}

                {!isReadOnly && (section.type === 'learning-path' || section.type === 'brief' || section.type === 'sandbox') && (
                  <textarea
                    rows={3}
                    value={section.content ?? ''}
                    onChange={e => updateSection(idx, { content: e.target.value })}
                    placeholder={
                      section.type === 'sandbox'
                        ? 'Describe the project task for this session…'
                        : 'Enter content…'
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E9ECEF] focus:outline-none focus:border-[#00a79d] text-[13px] bg-[#F8F9FA] resize-none"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                )}

                {!isReadOnly && section.type === 'video' && (
                  <VideoListEditor
                    entries={
                      section.videos?.length
                        ? section.videos
                        : section.videoUrl
                          ? [{ id: 'v0', title: section.videoTitle ?? '', url: section.videoUrl }]
                          : []
                    }
                    onChange={videos => updateSection(idx, {
                      videos,
                      videoTitle: videos[0]?.title ?? '',
                      videoUrl: videos[0]?.url ?? '',
                    })}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inline edit footer */}
      {isEditing && (
        <div
          className="px-4 py-3 border-t border-[#E9ECEF] flex items-center justify-between gap-2.5 flex-wrap"
          onClick={e => e.stopPropagation()}
        >
          {/* Status control — lets the founder mark sessions Done / In Progress / Locked */}
          <div className="flex items-center gap-1.5">
            {(Object.keys(STATUS_CFG) as SessionStatus[]).map(st => (
              <button
                key={st}
                onClick={() => setEditStatus(st)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: editStatus === st ? STATUS_CFG[st].bg : 'white',
                  color: editStatus === st ? STATUS_CFG[st].color : '#ADB5BD',
                  borderColor: editStatus === st ? STATUS_CFG[st].color : '#E9ECEF',
                }}
              >
                {STATUS_CFG[st].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 rounded-xl border border-[#E9ECEF] text-[13px] text-[#6C757D] hover:bg-[#F8F9FA] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSaveEdit({
                title:    editTitle.trim()    || session.title,
                date:     editDate.trim()     || session.date,
                duration: parseInt(editDuration) || session.duration,
                xp:       parseInt(editXP)       || session.xp,
                level:    editLevel,
                status:   editStatus,
                sections: editSections,
              })}
              className="px-4 py-2 rounded-xl bg-[#00a79d] text-white text-[13px] font-semibold hover:bg-[#008f86] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {!isEditing && (
        <div className="h-1 bg-[#F1F3F5]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: '#00a79d' }}
          />
        </div>
      )}

      {/* Expanded sections */}
      {expanded && !isLocked && !isEditing && (
        <div className="border-t border-[#F1F3F5]">
          {session.sections.filter(s => s.type !== 'ai-eval' && s.type !== 'reflection').map(section => {
            const SectionIcon = SECTION_ICONS[section.type] ?? Pin;
            return (
              <div key={section.id} className="border-b border-[#F8F9FA] last:border-0 px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <SectionIcon className="size-4 text-[#00a79d]" strokeWidth={1.75} />
                  <p className="font-semibold text-[14px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                    {section.title}
                  </p>
                </div>

                {(section.type === 'learning-path' || section.type === 'brief') && section.content && (
                  <p className="text-[13px] text-[#495057] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    {section.content}
                  </p>
                )}

                {section.type === 'video' && (
                  <div className="flex flex-col gap-3">
                    {(section.videos?.length
                      ? section.videos
                      : section.videoUrl
                        ? [{ id: 'v0', title: section.videoTitle ?? '', url: section.videoUrl }]
                        : []
                    ).map((v, vi) => (
                      <div key={v.id ?? vi}>
                        {v.title && (
                          <p className="text-[13px] text-[#495057] mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                            {v.title}
                          </p>
                        )}
                        {v.url && (
                          <a href={v.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[13px] text-[#00a79d] font-medium hover:underline"
                            style={{ fontFamily: 'var(--font-body)' }}>
                            <svg className="size-4 shrink-0" fill="none" viewBox="0 0 20 20">
                              <path d="M8 5.14v9.72L15.5 10 8 5.14z" fill="#00a79d" />
                              <circle cx="10" cy="10" r="8" stroke="#00a79d" strokeWidth="1.5" />
                            </svg>
                            Watch on YouTube
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {section.type === 'sandbox' && (
                  <div className="flex flex-col gap-3">
                    {section.content && (
                      <p className="text-[13px] text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>
                        {section.content}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="url" value={projectUrl} onChange={e => setProjectUrl(e.target.value)}
                        placeholder="https://your-project-url.com"
                        className="flex-1 px-3 py-2 rounded-lg border border-[#E9ECEF] text-[13px] bg-[#F8F9FA] focus:outline-none focus:border-[#00a79d]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                      <button
                        onClick={() => {
                          onSaveProgress({ projectUrl })
                            .then(() => setSavedProject(true))
                            .catch(() => toast.error('Could not save — check the link starts with https://'));
                        }}
                        className="px-4 py-2 rounded-lg bg-[#00a79d] text-white text-[13px] font-medium hover:bg-[#008f86] transition-colors"
                        style={{ fontFamily: 'var(--font-body)' }}>
                        {savedProject ? <><Check className="size-3.5 inline" strokeWidth={2.5} /> Saved</> : 'Submit'}
                      </button>
                    </div>
                  </div>
                )}

                {section.type === 'ai-eval' && (
                  section.content ? (
                    <div className="flex items-start gap-2 bg-[#E5F5F4] rounded-xl p-3 text-[13px] text-[#008f86]"
                      style={{ fontFamily: 'var(--font-body)' }}>
                      <Bot className="size-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                      {section.content}
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#ADB5BD] italic" style={{ fontFamily: 'var(--font-body)' }}>
                      Submit your project above to receive AI feedback.
                    </p>
                  )
                )}

                {section.type === 'reflection' && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[13px] text-[#495057] mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                        Confidence level (1–5):
                      </p>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={() => setConfidence(n)}
                            className="size-9 rounded-full border text-[14px] font-semibold transition-all"
                            style={{
                              fontFamily: 'var(--font-body)',
                              background: confidence >= n ? '#00a79d' : 'white',
                              borderColor: confidence >= n ? '#00a79d' : '#E9ECEF',
                              color: confidence >= n ? 'white' : '#ADB5BD',
                            }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={reflectionNote}
                      onChange={e => setNote(e.target.value)}
                      placeholder="What challenged you most? What did you learn?"
                      className="px-3 py-2 rounded-lg border border-[#E9ECEF] text-[13px] bg-[#F8F9FA] focus:outline-none focus:border-[#00a79d] resize-none"
                      style={{ fontFamily: 'var(--font-body)' }}
                    />
                    <button
                      onClick={() => {
                        onSaveProgress({ reflectionNote, confidenceRating: confidence || undefined })
                          .then(() => setSavedReflect(true))
                          .catch(() => toast.error('Could not save your reflection — please try again.'));
                      }}
                      className="self-end px-4 py-2 rounded-lg bg-[#00a79d] text-white text-[13px] font-medium hover:bg-[#008f86] transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}>
                      {savedReflect ? <><Check className="size-3.5 inline" strokeWidth={2.5} /> Saved</> : 'Save reflection'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
}

// isAuthor defaults to FALSE: editing menus render only when the parent
// explicitly passes founder rights (PRD R-09 — learners never see ⋮ menus).
export function SyllabusTab({ bubble, isFounder, isAuthor = false }: Props) {
  const { isLoggedIn } = useApp();
  const [sessions, setSessions] = useState<Session[]>(bubble.sessions);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingWithAI, setEditingWithAI] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ session: Session; index: number } | null>(null);

  // Keep in sync when the syllabus arrives/changes from the database
  useEffect(() => {
    setSessions(bubble.sessions);
  }, [bubble.sessions]);

  const doneCount = sessions.filter(s => s.status === 'done').length;
  const totalXP = sessions.reduce((sum, s) => sum + s.xp, 0);
  const earnedXP = sessions.filter(s => s.status === 'done').reduce((sum, s) => sum + s.xp, 0);
  const progressPct = sessions.length > 0 ? Math.round((doneCount / sessions.length) * 100) : 0;

  function reflowNumbers(ss: Session[]): Session[] {
    return ss.map((s, i) => ({ ...s, number: i + 1 }));
  }

  /** Persist the current ordering (session numbers) after move/duplicate/undo. */
  function persistOrder(ss: Session[]) {
    api.renumberSessions(ss.map((s, i) => ({ id: s.id, number: i + 1 })))
      .catch(() => toast.error('Could not save the new order'));
  }

  /** Persist field + section changes of one session (founder only — RLS enforced). */
  function persistSessionChanges(orig: Session | undefined, next: Session) {
    api.updateSessionRow(next.id, {
      title: next.title,
      status: next.status,
      level: next.level,
      date: next.date,
      duration: next.duration,
      xp: next.xp,
    }).catch(() => toast.error('Could not save your changes'));

    for (const sec of next.sections) {
      const before = orig?.sections.find(s => s.id === sec.id);
      const changed = !before
        || before.title !== sec.title
        || before.content !== sec.content
        || JSON.stringify(before.videos ?? []) !== JSON.stringify(sec.videos ?? []);
      if (before && changed) {
        api.updateSectionRow(sec.id, {
          title: sec.title,
          content: sec.content ?? null,
          videos: sec.videos ?? [],
        }).catch(() => toast.error('Could not save a section'));
      }
    }
  }

  async function addSessionAndEdit() {
    try {
      const number = sessions.length + 1;
      const newId = await api.createSessionRow(bubble.id, {
        number, title: 'New Session', status: 'in-progress', level: 'Intermediate', xp: 100,
      });
      const defaults: Array<{ type: Session['sections'][number]['type']; title: string }> = [
        { type: 'learning-path', title: 'Learning Path' },
        { type: 'brief',         title: 'Conceptual Brief' },
        { type: 'video',         title: 'Video Resources' },
        { type: 'sandbox',       title: 'Project Sandbox' },
      ];
      const sectionIds = await Promise.all(defaults.map((d, i) =>
        api.createSectionRow(newId, { type: d.type, title: d.title, content: '', position: i }),
      ));
      const newSession: Session = {
        id: newId,
        number,
        title: 'New Session',
        status: 'in-progress',
        date: 'TBD',
        duration: 90,
        xp: 100,
        level: 'Intermediate',
        sections: defaults.map((d, i) => ({
          id: sectionIds[i], type: d.type, title: d.title,
          content: '', videos: [],
        })),
      };
      setSessions(ss => [...ss, newSession]);
      setEditingId(newId);
      setEditingWithAI(false);
    } catch {
      toast.error('Could not add a session — please try again.');
    }
  }

  function startEdit(id: string, withAI: boolean) {
    setEditingId(id);
    setEditingWithAI(withAI);
    setOpenMenuId(null);
  }

  function saveEdit(id: string, updates: Partial<Session>) {
    const orig = sessions.find(s => s.id === id);
    setSessions(ss => ss.map(s => s.id === id ? { ...s, ...updates } : s));
    if (orig) persistSessionChanges(orig, { ...orig, ...updates });
    setEditingId(null);
    setEditingWithAI(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingWithAI(false);
  }

  async function duplicate(id: string) {
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return;
    const orig = sessions[idx];
    try {
      const newId = await api.createSessionRow(bubble.id, {
        number: idx + 2, // will be reflowed below
        title: `${orig.title} (Copy)`,
        status: 'locked',
        level: orig.level,
        xp: orig.xp,
        duration: orig.duration,
      });
      const sectionIds = await Promise.all(orig.sections.map((sec, i) =>
        api.createSectionRow(newId, {
          type: sec.type, title: sec.title, content: sec.content ?? '',
          videos: sec.videos ?? [], position: i,
        }),
      ));
      const copy: Session = {
        ...orig,
        id: newId,
        title: `${orig.title} (Copy)`,
        status: 'locked',
        sections: orig.sections.map((sec, i) => ({ ...sec, id: sectionIds[i] })),
      };
      setSessions(ss => {
        const next = [...ss];
        next.splice(idx + 1, 0, copy);
        const reflowed = reflowNumbers(next);
        persistOrder(reflowed);
        return reflowed;
      });
      toast('Section duplicated.');
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
    setSessions(ss => ss.filter(s => s.id !== removed.id));
    setDeleteTarget(null);

    // Soft-delete on the server immediately; Undo restores it (PRD R-07/R-12).
    api.softDeleteSession(removed.id)
      .catch(() => toast.error('Could not delete this session'));

    let undone = false;
    toast('Section deleted.', {
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
      {/* Top Banner */}
      <div className="rounded-2xl px-5 pt-5 pb-4 text-white"
        style={{ background: 'linear-gradient(135deg, #00a79d 0%, #008f86 100%)' }}>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            {/* Session count + % */}
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-[13px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                {sessions.length === 0
                  ? 'No sessions yet'
                  : doneCount === 0
                    ? `0 of ${sessions.length} sessions · Ready to start`
                    : `${doneCount} of ${sessions.length} sessions done`}
              </p>
              {sessions.length > 0 && (
                <span className="text-[13px] font-semibold text-white ml-3 shrink-0" style={{ fontFamily: 'var(--font-body)' }}>
                  {progressPct}%
                </span>
              )}
            </div>
            {/* Progress bar — bottom of banner */}
            <div className="bg-white/30 rounded-full h-2 w-full">
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          {/* XP box — hidden when no sessions */}
          {totalXP > 0 && (
            <div className="bg-white/15 rounded-2xl px-4 py-3 text-center shrink-0 mb-0">
              <p className="text-[11px] text-white font-semibold mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>XP</p>
              <p className="text-[20px] font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {earnedXP.toLocaleString()}
              </p>
              <p className="text-white/80 text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
                / {totalXP.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sessions header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-bold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
          Sessions
        </h3>
        {isFounder && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-[#E9ECEF] text-[#495057] text-[14px] font-semibold hover:border-[#00a79d] hover:text-[#00a79d] transition-colors shrink-0"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <Upload className="size-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={addSessionAndEdit}
              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors shrink-0"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <Plus className="size-4" strokeWidth={1.75} />
              Add Session
            </button>
          </div>
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
            isEditingAI={editingId === session.id && editingWithAI}
            isAuthor={isAuthor}
            onOpenMenu={() => { setOpenMenuId(session.id); }}
            onCloseMenu={() => setOpenMenuId(null)}
            onStartEdit={withAI => startEdit(session.id, withAI)}
            onSaveEdit={updates => saveEdit(session.id, updates)}
            onCancelEdit={cancelEdit}
            onDuplicate={() => duplicate(session.id)}
            onMoveUp={() => moveUp(session.id)}
            onMoveDown={() => moveDown(session.id)}
            onRequestDelete={() => requestDelete(session.id)}
            onUpdate={updated => {
              const orig = sessions.find(s => s.id === updated.id);
              setSessions(ss => ss.map(s => s.id === updated.id ? updated : s));
              if (isAuthor) persistSessionChanges(orig, updated);
            }}
            onSaveProgress={async patch => {
              await api.saveMyProgress(session.id, patch);
              setSessions(ss => ss.map(s => s.id === session.id ? { ...s, ...patch } : s));
            }}
          />
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-12 text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
            {!isLoggedIn
              ? 'Sign in to preview the full syllabus.'
              : !bubble.detailLoaded
                ? 'Loading syllabus…'
                : isFounder
                  ? 'Click "Add Session" to build your syllabus.'
                  : 'The founder hasn\'t added sessions yet.'}
          </div>
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

