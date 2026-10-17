// ─────────────────────────────────────────────────────────────────────────────
// Tests for the data layer's permission handling.
//
// The bug these guard against: PostgREST does NOT return an error when Row
// Level Security filters out the rows an UPDATE/DELETE was meant to touch.
// It returns success with zero rows. Without an explicit check, the app shows
// "Saved!" while nothing was written — the change silently vanishes on reload.
//
// So each mutation is driven twice against a fake Supabase client:
//   • rows returned  → the write landed  → must resolve
//   • zero rows      → RLS blocked it    → must reject
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Fake Supabase client ────────────────────────────────────────────────────
// Records the query chain so tests can assert a .select() was requested —
// without it, PostgREST returns no rows at all and the check can't work.

interface Outcome { data: unknown[] | null; error: unknown }

let outcome: Outcome = { data: [{ id: 'x' }], error: null };
let calls: string[] = [];
let rpcCalls: Array<{ fn: string; args: unknown }> = [];
let rpcOutcome: { data: unknown; error: unknown } = { data: null, error: null };

function makeChain() {
  const chain: Record<string, unknown> = {};
  for (const m of ['update', 'delete', 'insert', 'upsert', 'eq', 'select', 'is', 'in', 'order', 'single']) {
    chain[m] = (...args: unknown[]) => {
      calls.push(`${m}(${args.map(a => (typeof a === 'string' ? a : '…')).join(',')})`);
      return chain;
    };
  }
  // Make the chain awaitable — resolves to the configured PostgREST outcome.
  chain.then = (resolve: (v: Outcome) => unknown) => Promise.resolve(outcome).then(resolve);
  return chain;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => { calls.push(`from(${table})`); return makeChain(); },
    rpc: (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(rpcOutcome);
    },
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-1', email: 'a@b.c' } } }),
    },
  },
}));

import * as api from './api';

beforeEach(() => { rpcCalls = []; rpcOutcome = { data: null, error: null }; calls = []; outcome = { data: [{ id: 'x' }], error: null }; });

const allowed = () => { outcome = { data: [{ id: 'x' }], error: null }; };
const blocked = () => { outcome = { data: [], error: null } };  // RLS filtered it

// ─── The mutations that MUST fail loudly when RLS blocks them ────────────────

const guarded: Array<[string, () => Promise<unknown>]> = [
  ['updateBubbleRow',  () => api.updateBubbleRow('b1', { title: 'New title' })],
  ['deleteBubbleRow',  () => api.deleteBubbleRow('b1')],
  ['closeBubble',      () => api.closeBubble('b1')],
  ['leaveBubbleApi',   () => api.leaveBubbleApi('b1')],
  ['removeMember',     () => api.removeMember('b1', 'user-2')],
  ['updateSessionRow', () => api.updateSessionRow('s1', { title: 'Renamed' })],
  ['softDeleteSession',() => api.softDeleteSession('s1')],
  ['updateSectionRow', () => api.updateSectionRow('sec1', { title: 'Renamed' })],
  ['updateResourceRow',() => api.updateResourceRow('r1', { title: 'Renamed' })],
  ['deleteResourceRow',() => api.deleteResourceRow('r1')],
  ['updateMyProfile',  () => api.updateMyProfile({ name: 'Shanee' })],
];

describe('RLS-blocked writes surface as errors', () => {
  for (const [name, run] of guarded) {
    it(`${name} rejects when zero rows are touched`, async () => {
      blocked();
      await expect(run()).rejects.toThrow(/Not permitted/);
    });

    it(`${name} resolves when the write lands`, async () => {
      allowed();
      await expect(run()).resolves.not.toThrow();
    });

    it(`${name} asks for rows back (.select) so the check can work`, async () => {
      allowed();
      await run();
      expect(calls.some(c => c.startsWith('select('))).toBe(true);
    });
  }
});

// ─── Idempotent deletes must NOT throw on zero rows ──────────────────────────
// Removing something that is already gone is the desired end state, not a
// permission failure. These are the two deliberate exceptions.

describe('idempotent deletes tolerate zero rows', () => {
  it('leaveWaitlist resolves when the row is already gone', async () => {
    blocked();
    await expect(api.leaveWaitlist('b1')).resolves.toBeUndefined();
  });

  it('voteOnResource(null) resolves when no vote existed', async () => {
    blocked();
    await expect(api.voteOnResource('r1', null)).resolves.toBeUndefined();
  });
});

// ─── Real database errors still propagate ────────────────────────────────────

describe('genuine errors are not swallowed', () => {
  it('updateBubbleRow rethrows a PostgREST error', async () => {
    outcome = { data: null, error: { message: 'connection lost' } };
    await expect(api.updateBubbleRow('b1', { title: 'x' })).rejects.toBeDefined();
  });
});

// ─── No-op guard: an empty patch must not hit the database at all ────────────

describe('empty patches short-circuit', () => {
  it('updateBubbleRow with no fields makes no request', async () => {
    allowed();
    await api.updateBubbleRow('b1', {});
    expect(calls).toEqual([]);
  });
});

// ─── URL hygiene (defence in depth vs stored XSS) ────────────────────────────

describe('safeUrl', () => {
  it.each([
    ['https://example.com', 'https://example.com'],
    ['http://example.com', 'http://example.com'],
    ['  https://example.com  ', 'https://example.com'],
  ])('accepts %s', (input, expected) => {
    expect(api.safeUrl(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://example.com',
    '',
    null,
    undefined,
  ])('rejects %s', (input) => {
    expect(api.safeUrl(input as string)).toBeNull();
  });
});

// ─── Date round-tripping (the off-by-one-day bug in negative timezones) ──────

describe('toIsoDate', () => {
  it('round-trips a display date', () => {
    expect(api.toIsoDate('Mar 14, 2026')).toBe('2026-03-14');
  });
  it('returns null for TBD and junk', () => {
    expect(api.toIsoDate('TBD')).toBeNull();
    expect(api.toIsoDate('not a date')).toBeNull();
    expect(api.toIsoDate(null)).toBeNull();
  });
});


// ─── Stage A: RPC wrappers ───────────────────────────────────────────────────

describe('stage A RPC wrappers', () => {
  it('forkBubble sends the right arguments and returns the new id', async () => {
    rpcOutcome = { data: 'new-id', error: null };
    const id = await api.forkBubble('src', { title: 'T', maxSeats: 4 });
    expect(id).toBe('new-id');
    expect(rpcCalls[0]).toEqual({
      fn: 'fork_bubble',
      args: {
        source_bubble: 'src', p_title: 'T', p_max_seats: 4, p_schedule_day: null,
        p_schedule_time: null, p_start_date: null, p_founder_learns: null,
      },
    });
  });

  it('createBubble passes founderLearns through', async () => {
    rpcOutcome = { data: 'b9', error: null };
    await api.createBubble({
      title: 't', topic: 't', description: 'd', level: 'Beginner', maxSeats: 4,
      scheduleDay: 'Monday', scheduleTime: '7:00 PM', founderLearns: false,
    });
    expect((rpcCalls[0].args as Record<string, unknown>).p_founder_learns).toBe(false);
  });

  it('transferFounder passes leave_bubble', async () => {
    await api.transferFounder('b', 'u2', true);
    expect(rpcCalls[0].args).toEqual({ target_bubble: 'b', new_founder: 'u2', leave_bubble: true });
  });

  it('setFounderSeat calls set_founder_seat', async () => {
    await api.setFounderSeat('b', false);
    expect(rpcCalls[0]).toEqual({ fn: 'set_founder_seat', args: { target_bubble: 'b', p_learns: false } });
  });

  it('ownership functions call the matching RPCs', async () => {
    rpcOutcome = { data: 'req-1', error: null };
    expect(await api.requestOwnership('b', 'hi')).toBe('req-1');
    await api.respondOwnershipRequest('req-1', true);
    await api.withdrawOwnershipRequest('req-1');
    expect(rpcCalls.map(c => c.fn)).toEqual([
      'request_ownership', 'respond_ownership_request', 'withdraw_ownership_request',
    ]);
  });

  it('validateSyllabusImport returns the server verdict', async () => {
    rpcOutcome = { data: { ok: false, errors: [{ path: 'sessions[0].title', message: 'missing' }] }, error: null };
    const r = await api.validateSyllabusImport({});
    expect(r.ok).toBe(false);
    expect(r.errors[0].path).toBe('sessions[0].title');
  });

  it('importSyllabus returns the count of added sessions', async () => {
    rpcOutcome = { data: 3, error: null };
    expect(await api.importSyllabus('b', {})).toBe(3);
    expect(rpcCalls[0].fn).toBe('import_syllabus');
  });

  it('server errors are thrown, not swallowed', async () => {
    rpcOutcome = { data: null, error: new Error('You can learn in 1 open Bubble(s) at a time') };
    await expect(api.forkBubble('src')).rejects.toThrow(/learn in 1 open/);
    await expect(api.setFounderSeat('b', true)).rejects.toThrow();
    await expect(api.requestOwnership('b')).rejects.toThrow();
  });
});

describe('errorMessage', () => {
  it('reads the message of a plain Supabase error object', () => {
    expect(api.errorMessage({ message: 'You can learn in 1 open Bubble(s)' }, 'x')).toMatch(/learn in 1/);
  });
  it('falls back when there is no message', () => {
    expect(api.errorMessage(null, 'fallback')).toBe('fallback');
    expect(api.errorMessage({}, 'fallback')).toBe('fallback');
  });
});
