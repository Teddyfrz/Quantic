import { useState } from "react";
import type { Note, Project } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { Modal } from "./Modal";
import { Markdown } from "./Markdown";

interface Props {
  note: Note | null; // null => création
  projects: Project[];
  defaultProjectId?: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export function NoteEditModal({ note, projects, defaultProjectId, onClose, onSaved, onDeleted }: Props) {
  const isNew = note === null;
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [projectId, setProjectId] = useState(note?.projectId ?? defaultProjectId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        await api.createNote({ title: title.trim(), content, projectId: projectId || null });
      } else {
        await api.updateNote(note!.id, { title: title.trim(), content, projectId: projectId || null });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!note) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteNote(note.id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Suppression impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title={isNew ? "Nouvelle note" : "Modifier la note"} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label htmlFor="n-title">Titre</label>
        <input id="n-title" className="input full" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>Contenu <span className="text-muted" style={{ fontSize: 11 }}>· markdown</span></label>
        <div className="md-tabs">
          <button type="button" className={!preview ? "on" : ""} onClick={() => setPreview(false)}>Écrire</button>
          <button type="button" className={preview ? "on" : ""} onClick={() => setPreview(true)}>Aperçu</button>
        </div>
        {preview ? (
          content.trim() ? <Markdown source={content} className="md-preview" /> : <div className="md-preview text-muted">Rien à prévisualiser.</div>
        ) : (
          <textarea id="n-content" className="textarea full" style={{ minHeight: 160 }} value={content} onChange={(e) => setContent(e.target.value)} />
        )}
      </div>
      <div className="field">
        <label htmlFor="n-project">Projet lié</label>
        <select id="n-project" className="select full" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Sans projet</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="modal-actions">
        {!isNew ? (
          confirmDelete ? (
            <button className="btn btn-danger" onClick={remove} disabled={busy}>
              Confirmer la suppression
            </button>
          ) : (
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
              Supprimer
            </button>
          )
        ) : (
          <span />
        )}
        <div className="right">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !title.trim()}>
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
}
