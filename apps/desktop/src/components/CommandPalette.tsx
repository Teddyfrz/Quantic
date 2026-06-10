import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SearchResult, SearchKind } from "@quantic/shared";
import { api } from "../lib/api";

export type CmdView = "projects" | "tasks" | "notes" | "knowledge" | "contacts";

const KIND_VIEW: Record<SearchKind, CmdView> = {
  project: "projects",
  task: "tasks",
  note: "notes",
  kbPage: "knowledge",
  contact: "contacts",
};

const KIND_ICON: Record<SearchKind, ReactNode> = {
  project: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  task: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2" /></svg>,
  note: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 3h11l3 3v15H5z" /><path d="M9 9h6M9 13h6" /></svg>,
  kbPage: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /></svg>,
  contact: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" /></svg>,
};

interface Props {
  onClose: () => void;
  onNavigate: (view: CmdView, query: string) => void;
}

export function CommandPalette({ onClose, onNavigate }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      api.search(term).then((r) => { if (!cancelled) { setResults(r.results); setActive(0); } }).catch(() => undefined);
    }, 160);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const choose = (r: SearchResult) => {
    onNavigate(KIND_VIEW[r.kind], r.title);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); choose(results[active]); }
  };

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="cmdk-input">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.7"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher partout (projets, tâches, notes, contacts…)" />
          <span className="esc">Échap</span>
        </div>
        <div className="cmdk-list">
          {q.trim() === "" ? (
            <div className="cmdk-empty">Tape pour rechercher dans tous tes modules.</div>
          ) : results.length === 0 ? (
            <div className="cmdk-empty">Aucun résultat.</div>
          ) : (
            results.map((r, i) => (
              <div
                key={`${r.kind}-${r.id}`}
                className={`cmdk-item ${i === active ? "on" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
              >
                <span className="ico">{KIND_ICON[r.kind]}</span>
                <span className="t">{r.title}</span>
                <span className="s">{r.subtitle}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
