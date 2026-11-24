import { describe, it, expect } from 'vitest';
import type { Member, Session } from '../../types';
import { computeGroupProgress, celebration, listNames } from './groupProgress';

const m = (id: string, name: string): Member => ({
  id, name, role: 'member', avatar: '', title: '', joinDate: '', postCount: 0, online: false,
});
const s = (n: number, completedBy: string[]): Session => ({
  id: `s${n}`, number: n, title: `Topic ${n}`, status: 'draft', date: '', duration: 90, xp: 0,
  level: 'Beginner', learningObjective: '', ledBy: '', submissionTypes: [], sections: [], completedBy,
});

const ann = m('a', 'Ann Levi'), bea = m('b', 'Bea'), cleo = m('c', 'Cleo'), dana = m('d', 'Dana');
const group = [ann, bea, cleo];

describe('computeGroupProgress', () => {
  it('counts MY sessions, not the group status', () => {
    const p = computeGroupProgress([s(1, ['a', 'b']), s(2, ['b']), s(3, [])], group, 'a');
    expect(p.myDone).toBe(1);
    expect(p.myPct).toBe(33);
    expect(p.total).toBe(3);
  });

  it('ranks the board by sessions done, me first on ties', () => {
    const p = computeGroupProgress([s(1, ['a', 'b', 'c']), s(2, ['b'])], group, 'c');
    expect(p.board.map(r => `${r.member.id}:${r.done}`)).toEqual(['b:2', 'c:1', 'a:1']);
    expect(p.board.find(r => r.isMe)?.member.id).toBe('c');
  });

  it('focuses on the first session not finished by everyone', () => {
    const p = computeGroupProgress([s(1, ['a', 'b', 'c']), s(2, ['b']), s(3, [])], group, 'a');
    expect(p.focus?.id).toBe('s2');
    expect(p.focusDoneBy.map(x => x.id)).toEqual(['b']);
    expect(p.focusPending.map(x => x.id)).toEqual(['a', 'c']);
  });

  it('nudges me when others are ahead', () => {
    const p = computeGroupProgress([s(1, ['b', 'c'])], group, 'a');
    expect(p.message).toBe("Bea and Cleo finished S01 · Topic 1. You're next!");
  });

  it('invites me to go first when nobody has finished', () => {
    expect(computeGroupProgress([s(1, [])], group, 'a').message).toBe('Be the first to finish S01 · Topic 1.');
  });

  it('asks me to cheer on the others once I am done', () => {
    const p = computeGroupProgress([s(1, ['a'])], group, 'a');
    expect(p.message).toBe("You're ready for the next session. Cheer on Bea and Cleo: still on S01.");
  });

  it('celebrates when the whole group is done', () => {
    expect(computeGroupProgress([s(1, ['a', 'b', 'c'])], group, 'a').message).toMatch(/whole group finished/);
  });

  it('ignores completions of people who are no longer members', () => {
    const p = computeGroupProgress([s(1, ['a', 'b', 'c', 'gone'])], group, 'a');
    expect(p.focus).toBeNull();
  });

  it('handles an empty syllabus or unknown members quietly', () => {
    expect(computeGroupProgress([], group, 'a').message).toBe('');
    expect(computeGroupProgress([s(1, [])], [], 'a').message).toBe('');
    expect(computeGroupProgress([], group, 'a').myPct).toBe(0);
  });
});

describe('listNames', () => {
  it('uses first names and summarises long lists', () => {
    expect(listNames([ann])).toBe('Ann');
    expect(listNames([ann, bea, cleo, dana])).toBe('Ann, Bea and 2 others');
    expect(listNames([ann, bea, cleo])).toBe('Ann, Bea and 1 other');
  });
});

describe('celebration', () => {
  it('first, in company, or everyone', () => {
    expect(celebration(s(1, []), group, 'a')).toMatch(/first one/);
    expect(celebration(s(1, ['b']), group, 'a')).toMatch(/good company with Bea/);
    expect(celebration(s(1, ['b', 'c']), group, 'a')).toMatch(/Everyone has finished/);
  });
});
