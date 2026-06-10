import { useState } from "react";
import type { KbCategory } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { Modal } from "./Modal";

interface Props {
  category: KbCategory;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function KbCategoryModal({ category, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateKbCategory(category.id, { name: name.trim() });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteKbCategory(category.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Suppression impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title="Modifier la catégorie" onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field">
        <label htmlFor="kbc-name">Nom</label>
        <input id="kbc-name" className="input full" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <p className="text-muted" style={{ fontSize: 12 }}>
        Supprimer la catégorie ne supprime pas ses pages : elles deviennent « sans catégorie ».
      </p>
      <div className="modal-actions">
        {confirmDelete ? (
          <button className="btn btn-danger" onClick={remove} disabled={busy}>
            Confirmer la suppression
          </button>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
            Supprimer
          </button>
        )}
        <div className="right">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !name.trim()}>
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
}
