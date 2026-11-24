import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import type { Member, Session } from "../../types";
import { computeGroupProgress } from "./groupProgress";

const body = { fontFamily: 'var(--font-body)' } as const;

/**
 * Course Guide banner: MY progress on top, and an expandable board showing
 * every Member's progress plus one line of encouragement about the session
 * the group is working on.
 */
export function GroupProgressBanner({ sessions, members, meId, founderId }: {
  sessions: Session[]; members: Member[]; meId?: string; founderId: string;
}) {
  const [open, setOpen] = useState(false);
  const p = computeGroupProgress(sessions, members, meId);
  const showGroup = members.length > 1 && p.total > 0;

  return (
    <div className="rounded-2xl px-5 pt-5 pb-4 text-white" style={{ background: 'linear-gradient(135deg, #00a79d 0%, #008f86 100%)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80 mb-1" style={body}>Your progress</p>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[13px] font-semibold text-white" style={body}>
          {p.total === 0
            ? 'No sessions yet'
            : p.myDone === 0
              ? `0 of ${p.total} sessions · Get started`
              : p.myDone === p.total
                ? `All ${p.total} sessions done`
                : `${p.myDone} of ${p.total} sessions done`}
        </p>
        {p.total > 0 && (
          <span className="text-[13px] font-semibold text-white ml-3 shrink-0" style={body}>{p.myPct}%</span>
        )}
      </div>
      <div className="bg-white/30 rounded-full h-2 w-full" role="progressbar" aria-label="Your progress"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.myPct}>
        <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${p.myPct}%` }} />
      </div>

      {p.message && (
        <p className="text-[13px] text-white mt-3 leading-snug" style={body}>{p.message}</p>
      )}

      {showGroup && (
        <>
          <button
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-white/90 hover:text-white transition-colors"
            style={body}
          >
            <Users className="size-3.5" strokeWidth={2} />
            {open ? 'Hide group progress' : `See how the group is doing (${members.length})`}
            <ChevronDown className="size-3.5 transition-transform" strokeWidth={2}
              style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
          </button>

          {open && (
            <ul className="mt-3 flex flex-col gap-2">
              {p.board.map(({ member, done, pct, isMe }) => (
                <li key={member.id} className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{ background: isMe ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)' }}>
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="size-7 rounded-full object-cover border-2 border-white/60 shrink-0" />
                  ) : (
                    <span className="size-7 rounded-full bg-white/25 flex items-center justify-center text-[12px] font-bold shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-semibold truncate" style={body}>
                        {isMe ? 'You' : member.name}
                        {member.id === founderId && <span className="font-normal text-white/75"> · Founder</span>}
                      </p>
                      <span className="text-[12px] text-white/85 shrink-0" style={body}>
                        {done}/{p.total}{done === p.total ? ' 🎉' : ''}
                      </span>
                    </div>
                    <div className="bg-white/25 rounded-full h-1.5 mt-1">
                      <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
