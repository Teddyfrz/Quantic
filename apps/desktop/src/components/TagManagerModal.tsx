import { useMemo, useState } from "react";
import type { Task } from "@quantic/shared";
import { api } from "../lib/api";
import { Modal } from "./Modal";

interface Props {
  tasks: Task[];
  onClose: () => void;
  onChanged: () => void; // recharge les tâches
}

export function TagManagerModal({ tasks, onClose, onChanged }: Props) {
  const tags = useMemo(
    () => [...new Set(tasks.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b)),
    [tasks]
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = (tag: string) => tasks.filter((t) => t.tags.includes(tag)).length;

  const rename = async (oldTag: string) => {
    const next = draft.trim();
    if (!next || next === oldTag) { setEditing(null); return; }
    setBusy(true);
    setError(null);
    try {
      const affected = tasks.filter((t) => t.tags.includes(oldTag));
      for (const t of affected) {
        const newTags = [...new Set(t.tags.map((g) => (g === oldTag ? next : g)))];
        await api.updateTask(t.id, { tags: newTags });
      }
      setEditing(null);
      onChanged();
    } catch {
      setError("Renommage impossible.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (tag: string) => {
    setBusy(true);
    setError(null);
    try {
      const affected = tasks.filter((t) => t.tags.includes(tag));
      for (const t of affected) {
        await api.updateTask(t.id, { tags: t.tags.filter((g) => g !== tag) });
      }
      setConfirmDel(null);
      onChanged();
    } catch {
      setError("Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Gérer les tags" onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}
      {tags.length === 0 ? (
        <div className="empty-state" style={{ padding: "24px 0" }}>
          Aucun tag pour l'instant. Ajoute des tags depuis une tâche.
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {tags.map((tag) => (
            <div className="row between" key={tag} style={{ gap: 10, padding: "8px 10px", border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
              {editing === tag ? (
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void rename(tag); if (e.key === "Escape") setEditing(null); }}
                />
              ) : (
                <span className="row" style={{ gap: 10 }}>
                  <span className="tag-pill">#{tag}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>{count(tag)} tâche(s)</span>
                </span>
              )}

              <span className="row" style={{ gap: 6 }}>
                {editing === tag ? (
                  <>
                    <button className="btn btn-primary" disabled={busy} onClick={() => void rename(tag)}>Renommer</button>
                    <button className="btn btn-ghost" disabled={busy} onClick={() => setEditing(null)}>Annuler</button>
                  </>
                ) : confirmDel === tag ? (
                  <button className="btn btn-danger" disabled={busy} onClick={() => void remove(tag)}>Confirmer</button>
                ) : (
                  <>
                    <button className="btn btn-ghost" disabled={busy} onClick={() => { setEditing(tag); setDraft(tag); setConfirmDel(null); }}>Renommer</button>
                    <button className="btn btn-danger" disabled={busy} onClick={() => { setConfirmDel(tag); setEditing(null); }}>Supprimer</button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="modal-actions">
        <span />
        <div className="right">
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </Modal>
  );
}
