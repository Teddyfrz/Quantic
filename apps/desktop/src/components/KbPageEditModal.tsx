import { useState } from "react";
import type { KbPage, KbCategory } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { Modal } from "./Modal";
import { Markdown } from "./Markdown";

interface Props {
  page: KbPage | null; // null => création
  categories: KbCategory[];
  defaultCategoryId?: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export function KbPageEditModal({ page, categories, defaultCategoryId, onClose, onSaved, onDeleted }: Props) {
  const isNew = page === null;
  const [title, setTitle] = useState(page?.title ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [categoryId, setCategoryId] = useState(page?.categoryId ?? defaultCategoryId ?? "");
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
        await api.createKbPage({ title: title.trim(), content, categoryId: categoryId || null });
      } else {
        await api.updateKbPage(page!.id, { title: title.trim(), content, categoryId: categoryId || null });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!page) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteKbPage(page.id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Suppression impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title={isNew ? "Nouvelle page" : "Modifier la page"} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label htmlFor="kb-title">Titre</label>
        <input id="kb-title" className="input full" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="kb-cat">Catégorie</label>
        <select id="kb-cat" className="select full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sans catégorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
          <textarea id="kb-content" className="textarea full" style={{ minHeight: 220 }} value={content} onChange={(e) => setContent(e.target.value)} />
        )}
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
