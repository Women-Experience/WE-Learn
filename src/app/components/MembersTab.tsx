import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Crown, Search, UserPlus, ArrowRight, Clock } from "lucide-react";
import { getBubbleMembers } from "../../data/display";
import {
  removeMember as removeMemberApi,
  fetchWaitlist, admitFromWaitlist, transferFounder,
  type WaitlistEntry,
} from "../../data/api";
import { useApp } from "../../context/AppContext";
import { AddMemberModal } from "./AddMemberModal";
import { OwnershipPanel } from "./OwnershipPanel";
import type { Bubble, Member } from "../../types";

/** Avatar with initial fallback (no more broken-image icons). */
function MemberAvatar({ name, src, size = 48 }: { name: string; src?: string; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden border-2 border-[#E9ECEF] bg-[#E5F5F4] flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span className="font-bold text-[#008f86]" style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.4 }}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

interface Props {
  bubble: Bubble;
  isFounder: boolean;
  onJoin?: () => void;
}

function MemberCard({ member, isFounder, isSelf, onRemove, onMakeFounder, onLeave }: {
  member: Member; isFounder: boolean; isSelf?: boolean;
  onRemove?: () => void; onMakeFounder?: () => void; onLeave?: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [confirmFounder, setConfirmFounder] = useState(false);

  return (
    <div className="bg-white rounded-xl p-4 flex items-start gap-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="relative shrink-0">
        <MemberAvatar name={member.name} src={member.avatar} />
        {member.role === 'founder' && (
          <div className="absolute -top-1 -right-1 size-5 bg-[#FAB005] rounded-full flex items-center justify-center">
            <Crown className="size-3 text-white" strokeWidth={2} fill="white" />
          </div>
        )}
        {member.online && (
          <div className="absolute bottom-0 right-0 size-3 bg-[#40C057] rounded-full border-2 border-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-[15px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
            {member.name}
          </p>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{
              fontFamily: 'var(--font-body)',
              background: member.role === 'founder' ? '#FFF3CD' : '#F1F3F5',
              color: member.role === 'founder' ? '#856404' : '#6C757D',
            }}
          >
            {member.role === 'founder' ? 'Founder' : 'Member'}
          </span>
        </div>
        <p className="text-[13px] text-[#6C757D] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
          {member.title}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[12px] text-[#ADB5BD]"
          style={{ fontFamily: 'var(--font-body)' }}>
          <span>Joined {member.joinDate}</span>
          <span>·</span>
          <span>{member.postCount} posts</span>
          {member.online && <span className="text-[#40C057]">· Online</span>}
        </div>
      </div>

      {/* Actions: founder manages others; a member can leave */}
      {isFounder && member.role !== 'founder' && (
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {!confirm && !confirmFounder ? (
            <>
              <button
                onClick={() => setConfirm(true)}
                className="text-[12px] text-[#ADB5BD] hover:text-[#FA5252] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Remove
              </button>
              {onMakeFounder && (
                <button
                  onClick={() => setConfirmFounder(true)}
                  className="text-[12px] text-[#ADB5BD] hover:text-[#FAB005] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Make founder
                </button>
              )}
            </>
          ) : confirm ? (
            <div className="flex flex-col items-end gap-1.5">
              <p className="text-[11px] text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>Are you sure?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(false)} className="text-[12px] text-[#6C757D] hover:underline"
                  style={{ fontFamily: 'var(--font-body)' }}>Cancel</button>
                <button onClick={onRemove} className="text-[12px] text-[#FA5252] font-semibold hover:underline"
                  style={{ fontFamily: 'var(--font-body)' }}>Remove</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1.5">
              <p className="text-[11px] text-[#495057] text-right max-w-[160px]" style={{ fontFamily: 'var(--font-body)' }}>
                Hand the founder role to {member.name}? You'll become a regular member.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmFounder(false)} className="text-[12px] text-[#6C757D] hover:underline"
                  style={{ fontFamily: 'var(--font-body)' }}>Cancel</button>
                <button onClick={onMakeFounder} className="text-[12px] text-[#FAB005] font-semibold hover:underline"
                  style={{ fontFamily: 'var(--font-body)' }}>Confirm</button>
              </div>
            </div>
          )}
        </div>
      )}
      {isSelf && member.role !== 'founder' && onLeave && (
        <div className="shrink-0">
          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              className="text-[12px] text-[#ADB5BD] hover:text-[#FA5252] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Leave Bubble
            </button>
          ) : (
            <div className="flex flex-col items-end gap-1.5">
              <p className="text-[11px] text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>Leave this Bubble?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(false)} className="text-[12px] text-[#6C757D] hover:underline"
                  style={{ fontFamily: 'var(--font-body)' }}>Stay</button>
                <button onClick={onLeave} className="text-[12px] text-[#FA5252] font-semibold hover:underline"
                  style={{ fontFamily: 'var(--font-body)' }}>Leave</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MembersTab({ bubble, isFounder, onJoin }: Props) {
  const { refreshBubbles, refreshUser, currentUser, isLoggedIn, leaveBubble } = useApp();
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<Member[]>(getBubbleMembers(bubble));
  const [showAddMember, setShowAddMember] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  // Keep in sync when the member list arrives/changes from the database
  useEffect(() => {
    setMembers(getBubbleMembers(bubble));
  }, [bubble.members]);

  // Founder sees her waitlist
  useEffect(() => {
    if (isFounder) {
      fetchWaitlist(bubble.id).then(setWaitlist).catch(() => {});
    }
  }, [isFounder, bubble.id, bubble.takenSeats]);

  const isFull = bubble.takenSeats >= bubble.maxSeats;

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  function removeMember(id: string) {
    const snapshot = members;
    setMembers(ms => ms.filter(m => m.id !== id));
    removeMemberApi(bubble.id, id)
      .then(() => { toast.success('Member removed'); refreshBubbles(); })
      .catch(() => {
        setMembers(snapshot);
        toast.error('Could not remove this member');
      });
  }

  function admit(entry: WaitlistEntry) {
    admitFromWaitlist(bubble.id, entry.userId)
      .then(() => {
        toast.success(`${entry.name} joined the Bubble`);
        setWaitlist(ws => ws.filter(w => w.userId !== entry.userId));
        refreshBubbles();
      })
      .catch(err => toast.error(err?.message ?? 'Could not admit from the waitlist'));
  }

  function makeFounder(m: Member) {
    transferFounder(bubble.id, m.id)
      .then(() => {
        toast.success(`${m.name} is now the founder`);
        refreshBubbles();
        refreshUser();
      })
      .catch(() => toast.error('Could not transfer the founder role'));
  }

  function leaveThisBubble() {
    leaveBubble(bubble.id)
      .then(() => toast.success('You left the Bubble'))
      .catch(() => toast.error('Could not leave the Bubble'));
  }

  const founders = filtered.filter(m => m.role === 'founder');
  const regularMembers = filtered.filter(m => m.role !== 'founder');

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[18px] font-bold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
            Members
          </h2>
          <p className="text-[13px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
            {bubble.takenSeats} of {bubble.maxSeats} seats taken
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 min-h-[44px] rounded-xl border border-[#E9ECEF] text-[14px] bg-white focus:outline-none focus:border-[#00a79d] w-44 sm:w-52"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </div>

          {/* Action button: Add Member (founder) or Join (visitor) */}
          {isFounder ? (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors shrink-0"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <UserPlus className="size-4" strokeWidth={1.75} />
              Add Member
            </button>
          ) : (
            /* A full Bubble is still joinable — the server puts you on the
               waitlist. Matches the main Join CTA on the bubble card. */
            <button
              onClick={onJoin}
              title={isFull ? 'This Bubble is full — you can join the waitlist' : undefined}
              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors shrink-0"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {isFull ? 'Join waitlist' : 'Join'} <ArrowRight className="size-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <OwnershipPanel bubble={bubble} isFounder={isFounder}
        isMember={!!currentUser && bubble.memberIds.includes(currentUser.id)} />

      {/* Founder(s) */}
      {founders.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-[#ADB5BD] font-semibold uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-body)' }}>
            Founder
          </p>
          {founders.map(m => (
            <MemberCard key={m.id} member={m} isFounder={isFounder} />
          ))}
        </div>
      )}

      {/* Members */}
      {regularMembers.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-[#ADB5BD] font-semibold uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-body)' }}>
            Members ({regularMembers.length})
          </p>
          {regularMembers.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              isFounder={isFounder}
              isSelf={m.id === currentUser?.id}
              onRemove={() => removeMember(m.id)}
              onMakeFounder={() => makeFounder(m)}
              onLeave={leaveThisBubble}
            />
          ))}
        </div>
      )}

      {/* Waitlist — founder only */}
      {isFounder && waitlist.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-[#ADB5BD] font-semibold uppercase tracking-wider flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-body)' }}>
            <Clock className="size-3.5" strokeWidth={2} /> Waitlist ({waitlist.length})
          </p>
          {waitlist.map(w => (
            <div key={w.userId} className="bg-white rounded-xl p-4 flex items-center gap-4"
              style={{ boxShadow: 'var(--shadow-sm)' }}>
              <MemberAvatar name={w.name} src={w.avatar} size={40} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                  {w.name}
                </p>
                <p className="text-[12px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                  {w.title || 'Waiting'} · since {w.since}
                </p>
              </div>
              <button
                onClick={() => admit(w)}
                disabled={bubble.takenSeats >= bubble.maxSeats}
                title={bubble.takenSeats >= bubble.maxSeats ? 'No free seats' : undefined}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-[#00a79d] text-white text-[13px] font-semibold hover:bg-[#008f86] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Admit
              </button>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
          {!isLoggedIn
            ? 'Sign in to see who\'s in this Bubble.'
            : search
              ? `No members found matching "${search}"`
              : 'Member details are visible to Bubble members.'}
        </div>
      )}

      {showAddMember && (
        <AddMemberModal bubbleTitle={bubble.title} onClose={() => setShowAddMember(false)} />
      )}
    </div>
  );
}
