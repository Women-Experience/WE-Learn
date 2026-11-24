import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Crown, Hand } from "lucide-react";
import {
  fetchOwnershipRequests, requestOwnership, respondOwnershipRequest,
  withdrawOwnershipRequest, fetchMyHoldsSeat, setFounderSeat,
} from "../../data/api";
import { errorMessage } from "../../data/api";
import { useApp } from "../../context/AppContext";
import type { Bubble, OwnershipRequest } from "../../types";

const font = { fontFamily: 'var(--font-body)' } as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Ownership requests (Member asks to take over; Founder answers) and the
 * Founder's choice of whether she also learns in her own Bubble.
 */
export function OwnershipPanel({ bubble, isFounder, isMember }: {
  bubble: Bubble; isFounder: boolean; isMember: boolean;
}) {
  const { currentUser, refreshBubbles, refreshUser } = useApp();
  const [requests, setRequests] = useState<OwnershipRequest[]>([]);
  const [holdsSeat, setHoldsSeat] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    fetchOwnershipRequests(bubble.id).then(setRequests).catch(() => {});
  }

  useEffect(() => {
    if (!currentUser) return;
    load();
    if (isFounder) fetchMyHoldsSeat(bubble.id).then(setHoldsSeat).catch(() => {});
  }, [bubble.id, isFounder, currentUser?.id]);

  const mine = requests.find(r => r.requesterId === currentUser?.id);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      load();
      refreshBubbles();
      refreshUser();
    } catch (err) {
      toast.error(errorMessage(err, 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Founder: do I learn here too? */}
      {isFounder && holdsSeat !== null && (
        <div className="bg-white rounded-xl p-4 flex items-center gap-3 flex-wrap" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <Crown className="size-5 text-[#FAB005] shrink-0" strokeWidth={1.75} />
          <div className="flex-1 min-w-[200px]">
            <p className="text-[14px] font-semibold text-[#212529]" style={font}>
              {holdsSeat ? 'You learn in this Bubble' : 'You facilitate only'}
            </p>
            <p className="text-[12px] text-[#6C757D]" style={font}>
              {holdsSeat
                ? 'You take one of the seats. Give it up to leave all seats for learners.'
                : 'You hold no seat, so every seat is free for learners.'}
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() => run(
              () => setFounderSeat(bubble.id, !holdsSeat).then(() => setHoldsSeat(!holdsSeat)),
              holdsSeat ? 'You no longer hold a seat' : 'You now hold a seat',
            )}
            className="px-3.5 py-2 min-h-[40px] rounded-xl border border-[#E9ECEF] text-[13px] font-semibold text-[#495057] hover:border-[#00a79d] hover:text-[#00a79d] transition-colors disabled:opacity-50"
            style={font}>
            {holdsSeat ? 'Give up my seat' : 'Take a seat'}
          </button>
        </div>
      )}

      {/* Founder: pending requests */}
      {isFounder && requests.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-[#ADB5BD] font-semibold uppercase tracking-wider" style={font}>
            Requests to take over ({requests.length})
          </p>
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-4 border border-[#FFE8A3]" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <p className="text-[14px] font-semibold text-[#212529]" style={font}>
                {r.requesterName} would like to take over this Bubble
              </p>
              {r.message && <p className="text-[13px] text-[#495057] mt-1" style={font}>"{r.message}"</p>}
              <p className="text-[12px] text-[#6C757D] mt-1" style={font}>
                {r.status === 'escalated'
                  ? 'No answer in time, so the Admins decide.'
                  : `Please answer by ${fmt(r.dueAt)}. After that the Admins decide.`}
              </p>
              {r.status === 'pending' && (
                <>
                  <p className="text-[12px] text-[#6C757D] mt-1" style={font}>
                    If you accept, she becomes the Founder and you stay as a Member.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button disabled={busy}
                      onClick={() => run(() => respondOwnershipRequest(r.id, false), 'Request declined')}
                      className="px-4 py-2 rounded-xl border border-[#E9ECEF] text-[13px] text-[#6C757D] hover:bg-[#F8F9FA] disabled:opacity-50"
                      style={font}>Decline</button>
                    <button disabled={busy}
                      onClick={() => run(() => respondOwnershipRequest(r.id, true), `${r.requesterName} is now the Founder`)}
                      className="px-4 py-2 rounded-xl bg-[#00a79d] text-white text-[13px] font-semibold hover:bg-[#008f86] disabled:opacity-50"
                      style={font}>Accept</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Member: ask to take over */}
      {!isFounder && isMember && bubble.status !== 'closed' && (
        mine ? (
          <div className="bg-[#FFF9E6] border border-[#FFE8A3] rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <Hand className="size-5 text-[#856404] shrink-0" strokeWidth={1.75} />
            <p className="flex-1 min-w-[200px] text-[13px] text-[#856404]" style={font}>
              {mine.status === 'escalated'
                ? 'Your request is with the Admins now.'
                : `Your request was sent. The Founder answers by ${fmt(mine.dueAt)}, then the Admins decide.`}
            </p>
            <button disabled={busy}
              onClick={() => run(() => withdrawOwnershipRequest(mine.id), 'Request withdrawn')}
              className="px-3.5 py-2 rounded-xl border border-[#E9ECEF] bg-white text-[13px] text-[#6C757D] hover:bg-[#F8F9FA] disabled:opacity-50"
              style={font}>Withdraw</button>
          </div>
        ) : asking ? (
          <div className="bg-white rounded-xl p-4 flex flex-col gap-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-[14px] font-semibold text-[#212529]" style={font}>Ask to take over this Bubble</p>
            <p className="text-[12px] text-[#6C757D]" style={font}>
              The Founder gets 5 working days to answer. If she doesn't, the Admins decide.
              If you want a separate copy instead, use Fork.
            </p>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} maxLength={500}
              placeholder="Why would you like to lead it? (optional)"
              className="text-[13px] px-3 py-2 rounded-lg border border-[#E9ECEF] focus:border-[#00a79d] focus:outline-none resize-none"
              style={font} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAsking(false)}
                className="px-4 py-2 rounded-xl border border-[#E9ECEF] text-[13px] text-[#6C757D] hover:bg-[#F8F9FA]"
                style={font}>Cancel</button>
              <button disabled={busy}
                onClick={() => run(async () => { await requestOwnership(bubble.id, message.trim()); setAsking(false); setMessage(''); }, 'Request sent')}
                className="px-4 py-2 rounded-xl bg-[#00a79d] text-white text-[13px] font-semibold hover:bg-[#008f86] disabled:opacity-50"
                style={font}>Send request</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAsking(true)}
            className="self-start flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl border border-[#E9ECEF] text-[13px] text-[#495057] hover:border-[#00a79d] hover:text-[#00a79d] transition-colors"
            style={font}>
            <Hand className="size-4" strokeWidth={1.75} /> Ask to take over this Bubble
          </button>
        )
      )}
    </div>
  );
}
