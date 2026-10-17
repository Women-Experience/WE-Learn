import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { X, XCircle, Check, CheckCircle2, PartyPopper, AlertTriangle, Info, Bell } from "lucide-react";
import { errorMessage } from "../../data/api";
import { useApp } from "../../context/AppContext";
import { updateMyProfile } from "../../data/api";
import type { Bubble } from "../../types";

type Step = 'auth' | 'schedule' | 'hours' | 'experience' | 'confirm' | 'full' | 'done';
type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';

interface Props {
  bubble: Bubble;
  onClose: () => void;
  onEnter: () => void;
}

export function JoinBubbleModal({ bubble, onClose, onEnter }: Props) {
  const navigate = useNavigate();
  const { isLoggedIn, login, joinBubble, currentUser, bubbles } = useApp();
  const [step, setStep] = useState<Step>(isLoggedIn ? 'schedule' : 'auth');
  const [scheduleOk, setScheduleOk] = useState<boolean | null>(null);
  const [hours, setHours] = useState<string>('');
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [notifyOk, setNotifyOk] = useState(currentUser?.notifyConsent ?? false);
  const [wasWaitlisted, setWasWaitlisted] = useState(false);

  const [joining, setJoining] = useState(false);
  const isFull = bubble.takenSeats >= bubble.maxSeats;

  function handleLogin() {
    // Redirects to Google sign-in; the page navigates away and comes back signed in.
    login();
  }

  function handleSchedule(ok: boolean) {
    setScheduleOk(ok);
    if (!ok) {
      // suggest another bubble on same topic
      setStep('schedule'); // stays — we show suggestion below
    } else {
      setStep('hours');
    }
  }

  function handleHours() {
    const h = parseFloat(hours);
    if (isNaN(h) || h < 1.5) {
      setStep('hours'); // stay — show warning
      return;
    }
    setStep('experience');
  }

  function handleExperience(level: ExperienceLevel) {
    setExperience(level);
    setStep('confirm');
  }

  function handleConfirm() {
    if (joining) return;
    setJoining(true);
    // Notification consent (PRD step 6) — remembered on the profile.
    if (notifyOk && !currentUser?.notifyConsent) {
      updateMyProfile({ notifyConsent: true }).catch(() => {});
    }
    joinBubble(bubble.id)
      .then(outcome => {
        if (outcome === 'joined') {
          setStep('done');
        } else {
          setWasWaitlisted(true);
          setStep('full');
        }
      })
      .catch(err => toast.error(errorMessage(err, 'Could not join right now — please try again.')))
      .finally(() => setJoining(false));
  }

  function handleWaitlist() {
    if (joining) return;
    setJoining(true);
    joinBubble(bubble.id)
      .then(outcome => {
        if (outcome === 'waitlisted') toast.success("You're on the waitlist — we'll let you know when a spot opens.");
        else setStep('done'); // a seat opened up in the meantime!
        if (outcome === 'waitlisted') onClose();
      })
      .catch(err => toast.error(errorMessage(err, 'Could not join the waitlist — please try again.')))
      .finally(() => setJoining(false));
  }

  // Find an alternative bubble: same topic, open seats, and a DIFFERENT
  // day/time (she just told us this slot doesn't work). Per PRD matching
  // logic: topic is required; we prefer a different slot when suggesting.
  const alternative =
    bubbles.find(b =>
      b.id !== bubble.id && b.topic === bubble.topic && b.status === 'open'
      && (b.scheduleDay !== bubble.scheduleDay || b.scheduleTime !== bubble.scheduleTime))
    ?? bubbles.find(b =>
      b.id !== bubble.id && b.status === 'open'
      && b.level === bubble.level
      && (b.scheduleDay !== bubble.scheduleDay || b.scheduleTime !== bubble.scheduleTime));

  const hoursNum = parseFloat(hours);
  const hoursInsufficient = hours !== '' && !isNaN(hoursNum) && hoursNum < 1.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#E9ECEF] flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] text-[#6C757D] mb-1" style={{ fontFamily: 'var(--font-body)' }}>Joining</p>
            <h3 className="font-bold text-[18px] text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
              {bubble.title}
            </h3>
            <p className="text-[13px] text-[#6C757D] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              Every {bubble.scheduleDay} @ {bubble.scheduleTime}
            </p>
          </div>
          <button onClick={onClose} className="text-[#ADB5BD] hover:text-[#495057] shrink-0 mt-0.5">
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-6 py-5">

          {/* ── Step: Auth ── */}
          {step === 'auth' && (
            <div className="flex flex-col gap-4">
              <div className="text-center py-2">
                <div className="size-14 bg-[#E5F5F4] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="size-7" fill="none" viewBox="0 0 24 24">
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="#00a79d" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-[16px] font-semibold text-[#212529] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  Sign in to join
                </p>
                <p className="text-[13px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                  You can browse freely. To join a Bubble, just sign in.
                </p>
              </div>
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#E9ECEF] hover:bg-neutral-50 transition-colors text-[14px] font-medium text-[#212529]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="size-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
              <p className="text-center text-[12px] text-[#ADB5BD]" style={{ fontFamily: 'var(--font-body)' }}>
                We only use Google to verify your identity.
              </p>
            </div>
          )}

          {/* ── Step: Schedule ── */}
          {step === 'schedule' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#F8F9FA] rounded-xl p-4">
                <p className="text-[13px] text-[#6C757D] mb-1" style={{ fontFamily: 'var(--font-body)' }}>AI Commitment Check</p>
                <p className="text-[15px] font-semibold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                  Does every {bubble.scheduleDay} at {bubble.scheduleTime} work for you?
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSchedule(true)}
                  className="flex-1 py-3 rounded-xl bg-[#E5F5F4] text-[#008f86] font-semibold text-[14px] hover:bg-[#d0f5f1] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Yes, works for me
                </button>
                <button
                  onClick={() => handleSchedule(false)}
                  className="flex-1 py-3 rounded-xl bg-[#F1F3F5] text-[#495057] font-semibold text-[14px] hover:bg-[#E9ECEF] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Doesn't work
                </button>
              </div>

              {/* Alternative suggestion */}
              {scheduleOk === false && (
                <div className="mt-2 p-4 rounded-xl border border-[#E9ECEF] bg-white">
                  <p className="text-[13px] text-[#6C757D] mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                    No worries! Here's another option on the same topic:
                  </p>
                  {alternative ? (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                          {alternative.title}
                        </p>
                        <p className="text-[12px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                          Every {alternative.scheduleDay} @ {alternative.scheduleTime}
                        </p>
                      </div>
                      <button
                        onClick={() => { onClose(); navigate(`/group/${alternative.id}`); }}
                        className="text-[13px] text-[#00a79d] font-semibold hover:underline shrink-0"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        View →
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[13px] text-[#495057] mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                        No other Bubbles on this topic right now. You could start your own!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step: Hours ── */}
          {step === 'hours' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#F8F9FA] rounded-xl p-4">
                <p className="text-[13px] text-[#6C757D] mb-1" style={{ fontFamily: 'var(--font-body)' }}>AI Commitment Check</p>
                <p className="text-[15px] font-semibold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                  How many hours per week can you invest?
                </p>
                <p className="text-[13px] text-[#6C757D] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                  This Bubble requires 1.5 hrs/week minimum (90 min session + self-study).
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  placeholder="e.g. 2"
                  className="flex-1 px-4 py-3 rounded-xl border border-[#E9ECEF] text-[15px] focus:outline-none focus:border-[#00a79d] bg-[#F8F9FA]"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
                <span className="flex items-center text-[14px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                  hrs/week
                </span>
              </div>

              {hoursInsufficient && (
                <div className="p-3 bg-[#FFF3CD] border border-[#FAB005]/30 rounded-xl text-[13px] text-[#856404] flex items-start gap-2"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" strokeWidth={1.75} /> With less than 1.5 hrs/week, it's hard to get full value from the Bubble. Consider joining a lighter schedule or starting smaller.
                </div>
              )}

              {hoursInsufficient === false || hours === '' ? null : null}

              <button
                onClick={handleHours}
                disabled={!hours || isNaN(hoursNum) || hoursNum < 1.5}
                className="w-full py-3 rounded-xl font-semibold text-[14px] transition-all disabled:opacity-40"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: '#00a79d',
                  color: 'white',
                }}
              >
                Continue →
              </button>

              {hoursInsufficient && (
                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-[13px] text-[#6C757D] hover:text-[#495057] text-center"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  I'll reconsider and come back
                </button>
              )}
            </div>
          )}

          {/* ── Step: Experience ── */}
          {step === 'experience' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#F8F9FA] rounded-xl p-4">
                <p className="text-[13px] text-[#6C757D] mb-1" style={{ fontFamily: 'var(--font-body)' }}>AI Commitment Check</p>
                <p className="text-[15px] font-semibold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                  What is your current experience level with this topic?
                </p>
                <p className="text-[13px] text-[#6C757D] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                  This Bubble is set at <strong>{bubble.level}</strong> level.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {(['Beginner', 'Intermediate', 'Advanced'] as ExperienceLevel[]).map(l => (
                  <button
                    key={l}
                    onClick={() => handleExperience(l)}
                    className="w-full py-3 rounded-xl border text-[14px] font-semibold transition-colors"
                    style={{
                      fontFamily: 'var(--font-body)',
                      background: l === bubble.level ? '#E5F5F4' : 'white',
                      borderColor: l === bubble.level ? '#7ECFCA' : '#E9ECEF',
                      color: l === bubble.level ? '#008f86' : '#495057',
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Full ── */}
          {step === 'full' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="size-14 bg-[#FEE2E2] rounded-2xl flex items-center justify-center">
                <XCircle className="size-8 text-[#FA5252]" strokeWidth={1.5} />
              </div>
              <p className="text-[17px] font-bold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                This Bubble is full
              </p>
              {wasWaitlisted ? (
                <>
                  <p className="text-[14px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                    All {bubble.maxSeats} spots are taken, so we've added you to the waitlist.
                    The founder can admit you as soon as a seat opens up.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-[#00a79d] text-white font-semibold text-[14px] hover:bg-[#008f86] transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Got it
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[14px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                    All {bubble.maxSeats} spots are taken. Join the waitlist and the founder can admit you when a spot opens.
                  </p>
                  <button
                    onClick={handleWaitlist}
                    disabled={joining}
                    className="w-full py-3 rounded-xl border border-[#00a79d] text-[#00a79d] font-semibold text-[14px] hover:bg-[#E5F5F4] transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {joining ? 'Joining…' : 'Join Waitlist'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Step: Confirm ── */}
          {step === 'confirm' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#E5F5F4] rounded-xl p-4">
                <p className="text-[14px] font-semibold text-[#008f86] mb-2 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                  <CheckCircle2 className="size-4 shrink-0" strokeWidth={2} /> You're a great fit!
                </p>
                <p className="text-[13px] text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>
                  By joining, you commit to:
                </p>
                <ul className="mt-2 space-y-1.5">
                  {[
                    `90-min session every ${bubble.scheduleDay} @ ${bubble.scheduleTime}`,
                    '~1.5 hrs/week self-study',
                    'Showing up prepared and contributing to the group',
                  ].map(c => (
                    <li key={c} className="flex items-start gap-2 text-[13px] text-[#495057]" style={{ fontFamily: 'var(--font-body)' }}>
                      <Check className="size-3.5 text-[#00a79d] mt-0.5 shrink-0" strokeWidth={2.5} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              {experience && experience !== bubble.level && (
                <div className="p-3 bg-[#FFF3CD] border border-[#FAB005]/30 rounded-xl text-[13px] text-[#856404] flex items-start gap-2"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  <Info className="size-4 shrink-0 mt-0.5" strokeWidth={1.75} /> This Bubble is set at <strong>{bubble.level}</strong> level, while you marked yourself as <strong>{experience}</strong>. You can still join — the group can adjust pace together.
                </div>
              )}
              {/* Notification consent — join-flow PRD step 6 */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E9ECEF] cursor-pointer hover:bg-[#F8F9FA] transition-colors">
                <input
                  type="checkbox"
                  checked={notifyOk}
                  onChange={e => setNotifyOk(e.target.checked)}
                  className="mt-0.5 size-4 accent-[#00a79d]"
                />
                <span className="text-[13px] text-[#495057] flex items-start gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                  <Bell className="size-4 shrink-0 mt-0.5 text-[#00a79d]" strokeWidth={1.75} />
                  <span>Notify me about this Bubble's sessions and updates (needed to take part).</span>
                </span>
              </label>
              <button
                onClick={handleConfirm}
                disabled={joining || !notifyOk}
                title={!notifyOk ? 'Please allow notifications to join' : undefined}
                className="w-full py-3 rounded-xl font-bold text-[15px] text-white transition-all hover:bg-[#008f86] disabled:opacity-50"
                style={{ background: '#00a79d', fontFamily: 'var(--font-body)' }}
              >
                {joining ? 'Joining…' : "I'm in — Join Bubble"}
              </button>
              <button
                onClick={onClose}
                className="text-center text-[13px] text-[#6C757D] hover:text-[#495057]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Not now
              </button>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="size-16 bg-[#E5F5F4] rounded-2xl flex items-center justify-center">
                <PartyPopper className="size-8 text-[#00a79d]" strokeWidth={1.5} />
              </div>
              <p className="text-[18px] font-bold text-[#212529]" style={{ fontFamily: 'var(--font-display)' }}>
                Welcome to the Bubble!
              </p>
              <p className="text-[14px] text-[#6C757D]" style={{ fontFamily: 'var(--font-body)' }}>
                You've successfully joined <strong>{bubble.title}</strong>. Ready to dive in?
              </p>
              <button
                onClick={onEnter}
                className="w-full py-3 rounded-xl font-bold text-[15px] text-white hover:bg-[#008f86] transition-colors"
                style={{ background: '#00a79d', fontFamily: 'var(--font-body)' }}
              >
                Enter Bubble →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
