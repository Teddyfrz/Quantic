import { useState } from "react";
import type { CalendarEvent, Project } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { Modal } from "./Modal";

interface Props {
  event: CalendarEvent | null; // null => création
  projects: Project[];
  defaultDate?: string; // yyyy-mm-dd
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function EventEditModal({ event, projects, defaultDate, onClose, onSaved, onDeleted }: Props) {
  const isNew = event === null;
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [date, setDate] = useState(event ? toDateInput(event.startAt) : defaultDate ?? "");
  const [projectId, setProjectId] = useState(event?.projectId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!title.trim() || !date) return;
    setBusy(true);
    setError(null);
    const startAt = new Date(date + "T00:00:00.000Z").toISOString();
    try {
      if (isNew) {
        await api.createEvent({ title: title.trim(), description: description.trim() || null, startAt, allDay: true, projectId: projectId || null });
      } else {
        await api.updateEvent(event!.id, { title: title.trim(), description: description.trim() || null, startAt, projectId: projectId || null });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!event) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteEvent(event.id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Suppression impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title={isNew ? "Nouvel événement" : "Modifier l'événement"} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label htmlFor="ev-title">Titre</label>
        <input id="ev-title" className="input full" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ev-date">Date</label>
        <input id="ev-date" className="input full" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ev-project">Projet lié</label>
        <select id="ev-project" className="select full" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Aucun</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="ev-desc">Description</label>
        <textarea id="ev-desc" className="textarea full" value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <button className="btn btn-primary" onClick={save} disabled={busy || !title.trim() || !date}>
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
}
