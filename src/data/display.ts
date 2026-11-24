// Presentation helpers shared across components (formerly part of mock.ts).

import type { Bubble, Member } from '../types';

/** Members of a bubble, as loaded from the database (empty when signed out). */
export function getBubbleMembers(bubble: Bubble): Member[] {
  return bubble.members ?? [];
}

/** Find a member by id across a bubble's loaded member list. */
export function getBubbleMemberById(bubble: Bubble, id: string): Member | undefined {
  return bubble.members?.find(m => m.id === id);
}

export const STATUS_LABELS: Record<Bubble['status'], string> = {
  open:   'Starting Soon',
  full:   'Full',
  active: 'In Progress',
  closed: 'Closed',
};

export const STATUS_COLORS: Record<Bubble['status'], { bg: string; text: string; border: string }> = {
  open:   { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD' },
  full:   { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
  active: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  closed: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' },
};
