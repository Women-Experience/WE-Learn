import { useState, useRef, useEffect } from "react";
import {
  Video, FileText, Book, Wrench, Mic, Paperclip,
  ThumbsUp, ThumbsDown, ExternalLink, CheckCircle2,
  Pencil, Trash2, Plus, X, MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import type { Bubble, Resource, ResourceType } from "../../types";
import { useApp } from "../../context/AppContext";
import { getMemberById } from "../../data/mock";

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ResourceType, { icon: typeof Video; label: string }> = {
  video:   { icon: Video,     label: 'Video'   },
  article: { icon: FileText,  label: 'Article' },
  book:    { icon: Book,      label: 'Book'    },
  tool:    { icon: Wrench,    label: 'Tool'    },
  podcast: { icon: Mic,       label: 'Podcast' },
  other:   { icon: Paperclip, label: 'Other'   },
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

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
      <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div className="px-6 pt-6 pb-5 flex flex-col gap-3">
          <div className="size-11 rounded-xl bg-[#FEE2E2] flex items-center justify-center">
            <Trash2 className="size-5 text-[#FA5252]" strokeWidth={1.75} />
          </div>
          <h3 className="font-bold text-[17px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
            Delete "{title}"?
          </h3>
          <p className="text-[13px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
            This resource will be removed from the Bubble.
          </p>
          <div className="flex gap-3 mt-2">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-[#E9ECEF] text-[14px] text-[#6C757D] hover:bg-[#F8F9FA] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}>
              Cancel
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-[#FA5252] text-white text-[14px] font-semibold hover:bg-[#E03131] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Resource Card ────────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  canDelete,
  canEdit,
  onDelete,
  onVote,
  onSave,
}: {
  resource: Resource;
  canDelete: boolean;
  canEdit: boolean;
  onDelete: () => void;
  onVote: (vote: 'up' | 'down') => void;
  onSave: (updated: Resource) => void;
}) {
  const cfg = TYPE_CONFIG[resource.type];
  const TypeIcon = cfg.icon;
  const upCount   = resource.communityRatings.filter(r => r.vote === 'up').length;
  const downCount = resource.communityRatings.filter(r => r.vote === 'down').length;
  const uploader  = getMemberById(resource.uploadedById);

  const [menuOpen, setMenuOpen]     = useState(false);
  const [isEditing, setIsEditing]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Inline edit state
  const [editTitle,   setEditTitle]   = useState(resource.title);
  const [editUrl,     setEditUrl]     = useState(resource.url);
  const [editType,    setEditType]    = useState<ResourceType>(resource.type);
  const [editDesc,    setEditDesc]    = useState(resource.description ?? '');
  const [editWatched, setEditWatched] = useState(resource.watched ?? false);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  function handleSave() {
    onSave({ ...resource, title: editTitle, url: editUrl, type: editType, description: editDesc, watched: editWatched });
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setEditTitle(resource.title);
    setEditUrl(resource.url);
    setEditType(resource.type);
    setEditDesc(resource.description ?? '');
    setEditWatched(resource.watched ?? false);
    setIsEditing(false);
  }

  if (isEditing) {
    const EditTypeIcon = TYPE_CONFIG[editType].icon;
    return (
      <div className="bg-white rounded-xl p-4 flex flex-col gap-3" style={{ boxShadow: 'var(--shadow-md)', border: '2px solid #7ECFCA' }}>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-[14px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
            Edit resource
          </p>
          <button onClick={handleCancelEdit} className="text-[#ADB5BD] hover:text-[#495057]">
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <input
          type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
          placeholder="Title"
          className="px-3 py-2 rounded-lg border border-[#E9ECEF] text-[14px] bg-[#F8F9FA] focus:outline-none focus:border-[#00a79d]"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <input
          type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)}
          placeholder="https://..."
          className="px-3 py-2 rounded-lg border border-[#E9ECEF] text-[14px] bg-[#F8F9FA] focus:outline-none focus:border-[#00a79d]"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_CONFIG) as ResourceType[]).map(t => {
            const Icon = TYPE_CONFIG[t].icon;
            return (
              <button key={t} type="button" onClick={() => setEditType(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-colors"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: editType === t ? '#E5F5F4' : 'white',
                  borderColor: editType === t ? '#7ECFCA' : '#E9ECEF',
                  color: editType === t ? '#008f86' : '#6C757D',
                  fontWeight: editType === t ? 600 : 400,
                }}>
                <Icon className="size-3" strokeWidth={1.75} /> {TYPE_CONFIG[t].label}
              </button>
            );
          })}
        </div>
        <textarea
          value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
          placeholder="Short description"
          className="px-3 py-2 rounded-lg border border-[#E9ECEF] text-[13px] bg-[#F8F9FA] focus:outline-none focus:border-[#00a79d] resize-none"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <label className="flex items-center gap-2 text-[13px] text-[#495057] cursor-pointer"
          style={{ fontFamily: 'var(--font-body)' }}>
          <input type="checkbox" checked={editWatched} onChange={e => setEditWatched(e.target.checked)}
            className="size-4 accent-[#00a79d]" />
          I've watched / read it
        </label>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={handleCancelEdit}
            className="px-4 py-2 rounded-lg text-[13px] text-[#6C757D] hover:bg-[#F8F9FA] border border-[#E9ECEF] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!editTitle.trim() || !editUrl.trim() || !editDesc.trim()}
            className="px-4 py-2 rounded-lg bg-[#00a79d] text-white text-[13px] font-semibold hover:bg-[#008f86] transition-colors disabled:opacity-40"
            style={{ fontFamily: 'var(--font-body)' }}>
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl p-4 flex gap-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        {/* Type icon */}
        <div className="size-10 rounded-xl bg-[#F8F9FA] flex items-center justify-center shrink-0">
          <TypeIcon className="size-5 text-[#00a79d]" strokeWidth={1.75} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <a href={resource.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[15px] text-[#212529] hover:text-[#00a79d] transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}>
                {resource.title}
                <ExternalLink className="size-3.5 opacity-50" strokeWidth={1.75} />
              </a>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-[#ADB5BD] bg-[#F8F9FA] px-2 py-0.5 rounded-full"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  {cfg.label}
                </span>
                {resource.watched && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#40C057]" style={{ fontFamily: 'var(--font-body)' }}>
                    <CheckCircle2 className="size-3" strokeWidth={2} /> Watched by sharer
                  </span>
                )}
              </div>
            </div>

            {/* ⋮ menu */}
            {(canEdit || canDelete) && (
              <div ref={menuRef} className="relative shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
                  className="size-8 rounded-lg flex items-center justify-center text-[#ADB5BD] hover:text-[#212529] hover:bg-[#F8F9FA] transition-colors"
                >
                  <MoreVertical className="size-4" strokeWidth={1.75} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-[#E9ECEF] py-1"
                    style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 140 }}
                    onClick={e => e.stopPropagation()}>
                    {canEdit && (
                      <button
                        onClick={() => { setIsEditing(true); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[#212529] hover:bg-[#F8F9FA] text-left"
                        style={{ fontFamily: 'var(--font-body)' }}>
                        <Pencil className="size-4 shrink-0" strokeWidth={1.75} />
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => { setShowDelete(true); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[#FA5252] hover:bg-[#FFF5F5] text-left"
                        style={{ fontFamily: 'var(--font-body)' }}>
                        <Trash2 className="size-4 shrink-0" strokeWidth={1.75} />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-[13px] text-[#6C757D] mt-2 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            {resource.description}
          </p>

          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-[12px] text-[#ADB5BD]"
              style={{ fontFamily: 'var(--font-body)' }}>
              {uploader && <img src={uploader.avatar} alt="" className="size-4 rounded-full object-cover" />}
              Shared by {uploader?.name ?? 'Unknown'} · {resource.uploadedAt}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onVote('up')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] hover:bg-[#E5F5F4] transition-colors"
                style={{ fontFamily: 'var(--font-body)', color: upCount > 0 ? '#00a79d' : '#6C757D' }}>
                <ThumbsUp className="size-3.5" strokeWidth={1.75} /> {upCount}
              </button>
              <button onClick={() => onVote('down')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] hover:bg-[#FEE2E2] transition-colors"
                style={{ fontFamily: 'var(--font-body)', color: downCount > 0 ? '#FA5252' : '#6C757D' }}>
                <ThumbsDown className="size-3.5" strokeWidth={1.75} /> {downCount}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDelete && (
        <DeleteConfirmModal
          title={resource.title}
          onConfirm={() => { setShowDelete(false); onDelete(); }}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

// ─── Upload Form ──────────────────────────────────────────────────────────────

function UploadForm({ onSubmit, open, onOpenChange }: {
  onSubmit: (r: Omit<Resource, 'id' | 'communityRatings'>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentUser } = useApp();
  const [url, setUrl]     = useState('');
  const [title, setTitle] = useState('');
  const [type, setType]   = useState<ResourceType>('article');
  const [desc, setDesc]   = useState('');
  const [watched, setWatched] = useState(false);
  const [rating, setRating]   = useState<'up' | 'down' | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url || !title || !desc.trim()) return;
    onSubmit({
      type, title, url, description: desc,
      uploadedById: currentUser?.id ?? 'user-me',
      uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      watched, personalRating: rating,
    });
    setUrl(''); setTitle(''); setDesc(''); setWatched(false); setRating(null);
    onOpenChange(false);
  }

  if (!open) {
    return (
      <button onClick={() => onOpenChange(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#7ECFCA] text-[#00a79d] hover:bg-[#E5F5F4] transition-colors text-[14px] font-medium"
        style={{ fontFamily: 'var(--font-body)' }}>
        <Plus className="size-4" strokeWidth={2} />
        Share a resource with the group
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 flex flex-col gap-4"
      style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-[16px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
          Share a resource
        </p>
        <button type="button" onClick={() => onOpenChange(false)} className="text-[#ADB5BD] hover:text-[#495057]">
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>URL *</label>
          <input type="url" value={url} onChange={e => setUrl(e.target.value)} required
            placeholder="https://..."
            className="px-3 py-2 rounded-lg border border-[#E9ECEF] text-[14px] bg-[#F8F9FA] focus:outline-none focus:border-[#00a79d]"
            style={{ fontFamily: 'var(--font-body)' }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>Title *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
            placeholder="Resource title"
            className="px-3 py-2 rounded-lg border border-[#E9ECEF] text-[14px] bg-[#F8F9FA] focus:outline-none focus:border-[#00a79d]"
            style={{ fontFamily: 'var(--font-body)' }} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>Type</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_CONFIG) as ResourceType[]).map(t => {
            const Icon = TYPE_CONFIG[t].icon;
            return (
              <button key={t} type="button" onClick={() => setType(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] transition-colors border"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: type === t ? '#E5F5F4' : 'white',
                  borderColor: type === t ? '#7ECFCA' : '#E9ECEF',
                  color: type === t ? '#008f86' : '#6C757D',
                  fontWeight: type === t ? 600 : 400,
                }}>
                <Icon className="size-3.5" strokeWidth={1.75} /> {TYPE_CONFIG[t].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>Description *</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          placeholder="Why are you sharing this? What's it about?"
          className="px-3 py-2 rounded-lg border border-[#E9ECEF] text-[14px] bg-[#F8F9FA] focus:outline-none focus:border-[#00a79d] resize-none"
          style={{ fontFamily: 'var(--font-body)' }} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <label className="flex items-center gap-2 text-[13px] text-[#495057] cursor-pointer"
          style={{ fontFamily: 'var(--font-body)' }}>
          <input type="checkbox" checked={watched} onChange={e => setWatched(e.target.checked)}
            className="size-4 accent-[#00a79d]" />
          I've watched / read it
        </label>
        <div className="flex items-center gap-2 text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>
          <span className="text-[#6C757D]">Your rating:</span>
          <button type="button" onClick={() => setRating(r => r === 'up' ? null : 'up')}
            className={`px-3 py-1.5 rounded-full border transition-colors ${rating === 'up' ? 'bg-[#E5F5F4] border-[#7ECFCA] text-[#00a79d]' : 'border-[#E9ECEF] text-[#6C757D]'}`}>
            <ThumbsUp className="size-3.5" strokeWidth={1.75} />
          </button>
          <button type="button" onClick={() => setRating(r => r === 'down' ? null : 'down')}
            className={`px-3 py-1.5 rounded-full border transition-colors ${rating === 'down' ? 'bg-[#FEE2E2] border-[#FCA5A5] text-[#FA5252]' : 'border-[#E9ECEF] text-[#6C757D]'}`}>
            <ThumbsDown className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={() => onOpenChange(false)}
          className="px-4 py-2 rounded-xl text-[13px] text-[#6C757D] hover:bg-neutral-50"
          style={{ fontFamily: 'var(--font-body)' }}>
          Cancel
        </button>
        <button type="submit" disabled={!url.trim() || !title.trim() || !desc.trim()}
          className="px-5 py-2 rounded-xl bg-[#00a79d] text-white text-[13px] font-semibold hover:bg-[#008f86] transition-colors disabled:opacity-40"
          style={{ fontFamily: 'var(--font-body)' }}>
          Share resource
        </button>
      </div>
    </form>
  );
}

// ─── ResourcesTab ─────────────────────────────────────────────────────────────

export function ResourcesTab({ bubble, isFounder }: { bubble: Bubble; isFounder: boolean }) {
  const { currentUser } = useApp();
  const [resources, setResources] = useState<Resource[]>(bubble.resources);
  const [filter, setFilter] = useState<ResourceType | 'all'>('all');
  const [showAddResource, setShowAddResource] = useState(false);

  const filtered = resources.filter(r => filter === 'all' || r.type === filter);

  function addResource(partial: Omit<Resource, 'id' | 'communityRatings'>) {
    setResources(rs => [...rs, { ...partial, id: `r-${Date.now()}`, communityRatings: [] }]);
    setFilter('all');
  }

  function deleteResource(id: string) {
    const snapshot = [...resources];
    setResources(rs => rs.filter(r => r.id !== id));
    toast('Resource deleted', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => setResources(snapshot),
      },
    });
  }

  function saveResource(updated: Resource) {
    setResources(rs => rs.map(r => r.id === updated.id ? updated : r));
  }

  function vote(resourceId: string, v: 'up' | 'down') {
    if (!currentUser) return;
    setResources(rs => rs.map(r => {
      if (r.id !== resourceId) return r;
      const existing = r.communityRatings.find(cr => cr.userId === currentUser.id);
      let updated = r.communityRatings.filter(cr => cr.userId !== currentUser.id);
      if (!existing || existing.vote !== v) updated = [...updated, { userId: currentUser.id, vote: v }];
      return { ...r, communityRatings: updated };
    }));
  }

  const allTypes = [...new Set(resources.map(r => r.type))];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
            Resources
          </h2>
          <p className="text-[13px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
            {resources.length} shared by members
          </p>
        </div>
        <button
          onClick={() => setShowAddResource(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors shrink-0"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <Plus className="size-4" strokeWidth={1.75} />
          Add Resource
        </button>
      </div>

      {/* Type filters */}
      {allTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')}
            className="px-3 py-1.5 rounded-full text-[13px] border transition-colors"
            style={{
              fontFamily: 'var(--font-body)',
              background: filter === 'all' ? '#212529' : 'white',
              color: filter === 'all' ? 'white' : '#6C757D',
              borderColor: filter === 'all' ? '#212529' : '#E9ECEF',
            }}>
            All ({resources.length})
          </button>
          {allTypes.map(t => {
            const Icon = TYPE_CONFIG[t].icon;
            return (
              <button key={t} onClick={() => setFilter(t)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] border transition-colors"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: filter === t ? '#E5F5F4' : 'white',
                  color: filter === t ? '#008f86' : '#6C757D',
                  borderColor: filter === t ? '#7ECFCA' : '#E9ECEF',
                }}>
                <Icon className="size-3.5" strokeWidth={1.75} /> {TYPE_CONFIG[t].label}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
          No resources yet. Be the first to share something!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(r => (
            <ResourceCard
              key={r.id}
              resource={r}
              canDelete={isFounder || r.uploadedById === currentUser?.id}
              canEdit={r.uploadedById === currentUser?.id}
              onDelete={() => deleteResource(r.id)}
              onVote={v => vote(r.id, v)}
              onSave={saveResource}
            />
          ))}
        </div>
      )}

      {/* Add Resource form — shown when triggered from header button or dashed card */}
      <UploadForm
        onSubmit={r => { addResource(r); setShowAddResource(false); }}
        open={showAddResource}
        onOpenChange={setShowAddResource}
      />
    </div>
  );
}
