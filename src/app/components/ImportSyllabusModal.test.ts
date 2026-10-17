import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));

import { parseImportText } from './ImportSyllabusModal';

describe('parseImportText', () => {
  it('parses plain JSON', () => {
    expect(parseImportText('{"a":1}').value).toEqual({ a: 1 });
  });
  it('accepts a ```json fenced block from an AI tool', () => {
    expect(parseImportText('```json\n{"a":1}\n```').value).toEqual({ a: 1 });
  });
  it('explains broken JSON in plain words', () => {
    expect(parseImportText('{"a":').error).toMatch(/not valid JSON/);
  });
  it('asks for input when empty', () => {
    expect(parseImportText('  ').error).toMatch(/Paste/);
  });
});
