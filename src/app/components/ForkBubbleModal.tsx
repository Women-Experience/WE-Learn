import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { GitFork, X } from "lucide-react";
import { errorMessage } from "../../data/api";
import { useApp } from "../../context/AppContext";
import type { Bubble } from "../../types";

/**
 * Fork: open a Bubble of your own on this Bubble's syllabus. The sessions are
 * copied as an independent copy; a credit to the original always stays.
 */
export function ForkBubbleModal({ bubble, onClose }: { bubble: Bubble; onClose: () => void }) {
  const navigate = useNavigate();
  const { forkBubble } = useApp();
  const [title, setTitle] = useState(bubble.title);
  const [seats, setSeats] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const newId = await forkBubble(bubble.id, {
        title: title.trim() || undefined,
        maxSeats: seats,
      });
      toast.success('Your Bubble is ready');
      onClose();
      navigate(`/group/${newId}`);
    } catch (err) {
      // The server's messages are written for people (limits, sign-in).
      setError(errorMessage(err, 'Could not fork this Bubble. Please try again.'));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <button onClick={onClose} aria-label="Close"
          className="absolute top-4 right-4 text-[#6C757D] hover:text-[#212529]">
          <X className="size-5" strokeWidth={1.75} />
        </button>
        <div className="px-6 pt-6 pb-5">
          <div className="size-12 bg-[#E5F5F4] rounded-2xl flex items-center justify-center mb-4">
            <GitFork className="size-6 text-[#00a79d]" strokeWidth={1.75} />
          </div>
          <h3 className="font-bold text-[17px] text-[#212529] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Open your own Bubble on this syllabus
          </h3>
          <p className="text-[14px] text-[#6C757D] mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            The sessions are copied to a Bubble that is yours. You can change them freely and the original stays
            untouched. A credit to "{bubble.title}" always stays on your Bubble.
          </p>

          <label className="block text-[12px] font-medium text-[#6C757D] mb-1" style={{ fontFamily: 'var(--font-body)' }}>
            Name
          </label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
            className="w-full text-[14px] px-3 py-2 rounded-lg border border-[#E9ECEF] focus:border-[#00a79d] focus:outline-none mb-3"
            style={{ fontFamily: 'var(--font-body)' }} />

          <label className="block text-[12px] font-medium text-[#6C757D] mb-1" style={{ fontFamily: 'var(--font-body)' }}>
            Seats for learners
          </label>
          <select value={seats} onChange={e => setSeats(Number(e.target.value))}
            className="w-full text-[14px] px-3 py-2 rounded-lg border border-[#E9ECEF] bg-white focus:border-[#00a79d] focus:outline-none mb-1"
            style={{ fontFamily: 'var(--font-body)' }}>
            {[2, 3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={n}>{n}{n === 4 ? ' (recommended)' : ''}</option>
            ))}
          </select>
          <p className="text-[12px] text-[#ADB5BD] mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            You can start with fewer. People can join until it is full.
          </p>

          {error && (
            <p role="alert" className="text-[13px] text-[#B91C1C] bg-[#FEE2E2] rounded-lg px-3 py-2 mb-4"
              style={{ fontFamily: 'var(--font-body)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#E9ECEF] text-[14px] text-[#6C757D] hover:bg-[#F8F9FA] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}>Cancel</button>
            <button onClick={submit} disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] transition-colors disabled:opacity-60"
              style={{ fontFamily: 'var(--font-body)' }}>
              {busy ? 'Creating…' : 'Create my Bubble'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
