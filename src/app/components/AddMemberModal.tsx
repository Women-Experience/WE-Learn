import { useState } from "react";
import { X, UserPlus, Copy, Check } from "lucide-react";

interface Props {
  bubbleTitle: string;
  onClose: () => void;
}

/**
 * Honest v1 invite: the founder shares the bubble's link herself
 * (WhatsApp, email, …). Whoever opens it can sign in and go through the
 * normal join flow. Emailed invites arrive with the email service later.
 */
export function AddMemberModal({ bubbleTitle, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const inviteLink = `${window.location.origin}${window.location.pathname}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div className="px-5 pt-5 pb-4 border-b border-[#E9ECEF] flex items-center justify-between">
          <h3 className="font-bold text-[17px] text-[#212529] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <UserPlus className="size-5 text-[#00a79d]" strokeWidth={1.75} />
            Add a member
          </h3>
          <button onClick={onClose} className="text-[#ADB5BD] hover:text-[#495057] transition-colors">
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="text-[13px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
            Share this link with someone you'd like to join <strong>{bubbleTitle}</strong>.
            When she opens it, she can sign in and join in a few taps.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>
              Invite link
            </label>
            <div className="flex gap-2">
              <input
                type="text" readOnly value={inviteLink}
                className="flex-1 px-3 py-2.5 rounded-xl border border-[#E9ECEF] text-[13px] bg-[#F8F9FA] text-[#6C757D] truncate"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <button onClick={handleCopy} type="button"
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#00a79d] text-white text-[13px] font-semibold hover:bg-[#008f86] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}>
                {copied
                  ? <><Check className="size-4" strokeWidth={2} /> Copied</>
                  : <><Copy className="size-4" strokeWidth={1.75} /> Copy</>}
              </button>
            </div>
          </div>

          <p className="text-[12px] text-[#ADB5BD]" style={{ fontFamily: 'var(--font-body)' }}>
            Seats are limited to your Bubble's size — joins above the limit go to the waitlist.
          </p>
        </div>
      </div>
    </div>
  );
}
