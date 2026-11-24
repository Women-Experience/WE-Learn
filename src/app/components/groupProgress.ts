// Group progress: each Member marks her own Sessions done. These helpers turn
// the completions into personal numbers, a per-member board, and one line of
// encouragement about the Session the group is working on now.

import type { Member, Session } from "../../types";

export interface MemberProgress {
  member: Member;
  done: number;
  pct: number;
  isMe: boolean;
}

export interface GroupProgress {
  total: number;
  myDone: number;
  myPct: number;
  board: MemberProgress[];        // most sessions done first; me first on ties
  focus: Session | null;          // first session not yet finished by everyone
  focusDoneBy: Member[];          // current members who finished the focus session
  focusPending: Member[];         // current members who haven't yet
  message: string;                // encouragement line ('' when nothing to say)
}

export const sessionLabel = (s: Pick<Session, 'number'>) => `S${String(s.number).padStart(2, '0')}`;

const firstName = (m: Member) => m.name.split(' ')[0] || m.name;

/** "Dana", "Dana and Noa", "Dana, Noa and 2 others". */
export function listNames(people: Member[], meId?: string): string {
  const names = people.map(m => (m.id === meId ? 'you' : firstName(m)));
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]} and ${rest} ${rest === 1 ? 'other' : 'others'}`;
}

/** Members (current ones only) who marked this session done. */
export function doneMembers(session: Session, members: Member[]): Member[] {
  const ids = new Set(session.completedBy ?? []);
  return members.filter(m => ids.has(m.id));
}

export function computeGroupProgress(sessions: Session[], members: Member[], meId?: string): GroupProgress {
  const total = sessions.length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const doneCount = (id: string) => sessions.filter(s => (s.completedBy ?? []).includes(id)).length;

  const myDone = meId ? doneCount(meId) : 0;

  const board = members
    .map(m => ({ member: m, done: doneCount(m.id), pct: 0, isMe: m.id === meId }))
    .map(p => ({ ...p, pct: pct(p.done) }))
    .sort((a, b) => b.done - a.done || Number(b.isMe) - Number(a.isMe) || a.member.name.localeCompare(b.member.name));

  const focus = members.length
    ? sessions.find(s => doneMembers(s, members).length < members.length) ?? null
    : null;
  const focusDoneBy = focus ? doneMembers(focus, members) : [];
  const focusPending = focus ? members.filter(m => !focusDoneBy.includes(m)) : [];

  let message = '';
  if (total === 0 || members.length === 0) {
    message = '';
  } else if (!focus) {
    message = members.length === 1
      ? 'You finished every session. Amazing work! 🎉'
      : 'The whole group finished every session. Amazing work! 🎉';
  } else {
    const label = `${sessionLabel(focus)} · ${focus.title}`;
    const iAmPending = !!meId && focusPending.some(m => m.id === meId);
    const others = focusPending.filter(m => m.id !== meId);
    if (iAmPending && focusDoneBy.length > 0) {
      message = `${listNames(focusDoneBy)} finished ${label}. You're next!`;
    } else if (iAmPending) {
      message = `Be the first to finish ${label}.`;
    } else if (meId && members.some(m => m.id === meId)) {
      message = others.length
        ? `You're ready for the next session. Cheer on ${listNames(others)}: still on ${sessionLabel(focus)}.`
        : `You're ready for the next session.`;
    } else {
      message = `${focusDoneBy.length} of ${members.length} finished ${label}.`;
    }
  }

  return { total, myDone, myPct: pct(myDone), board, focus, focusDoneBy, focusPending, message };
}

/** Toast after marking a session done: a little celebration, with group context. */
export function celebration(session: Session, members: Member[], meId: string): string {
  const others = doneMembers(session, members).filter(m => m.id !== meId);
  const pending = members.filter(m => m.id !== meId && !others.includes(m));
  if (members.length > 1 && pending.length === 0) return `${sessionLabel(session)} done! Everyone has finished it 🎉`;
  if (others.length === 0) return `${sessionLabel(session)} done! You're the first one to finish it 🚀`;
  return `${sessionLabel(session)} done! You're in good company with ${listNames(others)} 💪`;
}
