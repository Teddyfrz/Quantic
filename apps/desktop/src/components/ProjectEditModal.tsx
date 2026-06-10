import { useState } from "react";
import type { Project, ProjectStatus } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { PROJECT_STATUS_LABEL } from "../lib/labels";
import { Modal } from "./Modal";

interface Props {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

const STATUSES: ProjectStatus[] = ["active", "paused", "done"];

export function ProjectEditModal({ project, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        status,
      });
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
      await api.deleteProject(project.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Suppression impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title="Modifier le projet" onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label htmlFor="ep-name">Nom</label>
        <input id="ep-name" className="input full" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ep-desc">Description</label>
        <textarea
          id="ep-desc"
          className="textarea full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="ep-status">Statut</label>
        <select
          id="ep-status"
          className="select full"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

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
