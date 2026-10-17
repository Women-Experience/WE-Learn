import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileUp, ClipboardCopy, X } from "lucide-react";
import { importSyllabus, validateSyllabusImport, type ImportIssue } from "../../data/api";
import { errorMessage } from "../../data/api";
import { useApp } from "../../context/AppContext";
import type { Bubble } from "../../types";

const font = { fontFamily: 'var(--font-body)' } as const;

/** AI tools often wrap JSON in a ```json fence; accept that. */
export function parseImportText(raw: string): { value?: unknown; error?: string } {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) text = fenced[1];
  if (!text) return { error: 'Paste your syllabus here or upload a file.' };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: 'This is not valid JSON. Make sure you copied the whole block, from the first { to the last }.' };
  }
}

export function ImportSyllabusModal({ bubble, onClose }: { bubble: Bubble; onClose: () => void }) {
  const { loadBubbleDetail } = useApp();
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [valid, setValid] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Validate on the server (debounced) so the messages match what Import enforces.
  useEffect(() => {
    setValid(false);
    setIssues([]);
    if (!text.trim()) { setParseError(null); return; }
    const parsed = parseImportText(text);
    if (parsed.error) { setParseError(parsed.error); return; }
    setParseError(null);
    setChecking(true);
    let stale = false;
    const t = setTimeout(() => {
      validateSyllabusImport(parsed.value)
        .then(r => { if (!stale) { setValid(r.ok); setIssues(r.errors); } })
        .catch(() => { if (!stale) setParseError('Could not check the syllabus right now. Try again.'); })
        .finally(() => { if (!stale) setChecking(false); });
    }, 400);
    return () => { stale = true; clearTimeout(t); };
  }, [text]);

  async function copyPrompt() {
    try {
      const res = await fetch('/syllabus-import-prompt.txt');
      if (!res.ok) throw new Error();
      await navigator.clipboard.writeText(await res.text());
      toast.success('Prompt copied. Paste it into Claude, ChatGPT or any AI tool.');
    } catch {
      toast.error('Could not copy the prompt');
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) { toast.error('This file is too large for a syllabus.'); return; }
    file.text().then(setText).catch(() => toast.error('Could not read this file'));
  }

  async function submit() {
    const parsed = parseImportText(text);
    if (parsed.error || !valid) return;
    setBusy(true);
    try {
      const n = await importSyllabus(bubble.id, parsed.value);
      await loadBubbleDetail(bubble.id);
      toast.success(`${n} session${n === 1 ? '' : 's'} added`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not import this syllabus'));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-[#6C757D] hover:text-[#212529]">
          <X className="size-5" strokeWidth={1.75} />
        </button>
        <div className="px-6 pt-6 pb-5">
          <h3 className="font-bold text-[17px] text-[#212529] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Import a syllabus
          </h3>
          <p className="text-[14px] text-[#6C757D] mb-4" style={font}>
            Built a course in Claude, ChatGPT or another tool? Bring it here. The sessions are added at the end of
            your syllabus, locked until you open them, so you can review each one first.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={copyPrompt}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E9ECEF] text-[13px] text-[#495057] hover:border-[#00a79d] hover:text-[#00a79d]"
              style={font}>
              <ClipboardCopy className="size-4" strokeWidth={1.75} /> Copy the AI prompt
            </button>
            <a href="/syllabus-template.json" download="syllabus-template.json"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E9ECEF] text-[13px] text-[#495057] hover:border-[#00a79d] hover:text-[#00a79d]"
              style={font}>
              <Download className="size-4" strokeWidth={1.75} /> Download the template
            </a>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E9ECEF] text-[13px] text-[#495057] hover:border-[#00a79d] hover:text-[#00a79d]"
              style={font}>
              <FileUp className="size-4" strokeWidth={1.75} /> Upload a file
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json,text/plain" className="hidden"
              onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>

          <textarea value={text} onChange={e => setText(e.target.value)} rows={9} spellCheck={false}
            placeholder='Paste the JSON here, starting with { "format": "we-syllabus", …'
            className="w-full text-[12px] font-mono px-3 py-2 rounded-lg border border-[#E9ECEF] focus:border-[#00a79d] focus:outline-none resize-y mb-3" />

          {parseError && (
            <p role="alert" className="text-[13px] text-[#B91C1C] bg-[#FEE2E2] rounded-lg px-3 py-2 mb-3" style={font}>{parseError}</p>
          )}
          {!parseError && checking && (
            <p className="text-[13px] text-[#6C757D] mb-3" style={font}>Checking…</p>
          )}
          {!parseError && !checking && issues.length > 0 && (
            <div role="alert" className="text-[13px] text-[#B91C1C] bg-[#FEE2E2] rounded-lg px-3 py-2 mb-3" style={font}>
              <p className="font-semibold mb-1">Please fix these before importing:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {issues.slice(0, 8).map((e, i) => (
                  <li key={i}><code className="text-[12px]">{e.path}</code>: {e.message}</li>
                ))}
              </ul>
              {issues.length > 8 && <p className="mt-1">…and {issues.length - 8} more.</p>}
            </div>
          )}
          {!parseError && !checking && valid && (
            <p className="text-[13px] text-[#008f86] bg-[#E5F5F4] rounded-lg px-3 py-2 mb-3" style={font}>
              Looks good. Ready to import.
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#E9ECEF] text-[14px] text-[#6C757D] hover:bg-[#F8F9FA]"
              style={font}>Cancel</button>
            <button onClick={submit} disabled={!valid || checking || busy}
              className="flex-1 py-2.5 rounded-xl bg-[#00a79d] text-white text-[14px] font-semibold hover:bg-[#008f86] disabled:opacity-50 disabled:cursor-not-allowed"
              style={font}>
              {busy ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
