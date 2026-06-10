import { useState, type KeyboardEvent } from "react";
import type { Task, Project, TaskStatus, TaskPriority, TaskRecurrence } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER } from "../lib/labels";
import { Modal } from "./Modal";

interface Props {
  task: Task;
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

// ISO -> yyyy-mm-dd pour <input type="date">
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function TaskEditModal({ task, projects, onClose, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority | "">(task.priority ?? "");
  const [projectId, setProjectId] = useState(task.projectId ?? "");
  const [dueDate, setDueDate] = useState(toDateInput(task.dueDate));
  const [recurrence, setRecurrence] = useState<TaskRecurrence | "">(task.recurrence ?? "");
  const [tags, setTags] = useState<string[]>(task.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addTag = (raw: string) => {
    const v = raw.trim();
    if (v && !tags.includes(v) && tags.length < 12) setTags([...tags, v]);
    setTagInput("");
  };
  const onTagKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
    else if (e.key === "Backspace" && !tagInput && tags.length) setTags(tags.slice(0, -1));
  };
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority: priority || null,
        projectId: projectId || null,
        dueDate: dueDate ? new Date(dueDate + "T00:00:00.000Z").toISOString() : null,
        recurrence: recurrence || null,
        tags,
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
      await api.deleteTask(task.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Suppression impossible.");
      setBusy(false);
    }
  };

  return (
    <Modal title="Modifier la tâche" onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label htmlFor="et-title">Titre</label>
        <input id="et-title" className="input full" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="et-desc">Description</label>
        <textarea
          id="et-desc"
          className="textarea full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="et-status">Statut</label>
          <select
            id="et-status"
            className="select full"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            {TASK_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="et-prio">Priorité</label>
          <select
            id="et-prio"
            className="select full"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority | "")}
          >
            <option value="">Aucune</option>
            <option value="low">Basse</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="et-project">Projet lié</label>
          <select
            id="et-project"
            className="select full"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Sans projet</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="et-due">Échéance</label>
          <input
            id="et-due"
            className="input full"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="et-rec">Récurrence</label>
        <select id="et-rec" className="select full" value={recurrence} onChange={(e) => setRecurrence(e.target.value as TaskRecurrence | "")}>
          <option value="">Aucune</option>
          <option value="daily">Quotidienne</option>
          <option value="weekly">Hebdomadaire</option>
          <option value="monthly">Mensuelle</option>
        </select>
        {recurrence && !dueDate && (
          <span className="text-muted" style={{ fontSize: 12 }}>Ajoute une échéance : la prochaine occurrence sera créée à la complétion.</span>
        )}
      </div>
      <div className="field">
        <label htmlFor="et-tags">Tags <span className="text-muted" style={{ fontSize: 11 }}>· Entrée ou virgule pour valider</span></label>
        <div className="tags-edit">
          {tags.map((t) => (
            <span className="tag-pill" key={t}>
              {t}
              <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Retirer ${t}`}>×</button>
            </span>
          ))}
          <input
            id="et-tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onTagKey}
            onBlur={() => tagInput.trim() && addTag(tagInput)}
            placeholder={tags.length ? "" : "ex. urgent, perso, courses"}
          />
        </div>
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
          <button className="btn btn-primary" onClick={save} disabled={busy || !title.trim()}>
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
}
