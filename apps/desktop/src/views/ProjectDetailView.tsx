import { useEffect, useState, type FormEvent } from "react";
import type { Project, Task, Note, TaskStatus } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  PROJECT_STATUS_LABEL,
  formatDate,
} from "../lib/labels";
import { ProjectEditModal } from "../components/ProjectEditModal";
import { TaskEditModal } from "../components/TaskEditModal";
import { NoteEditModal } from "../components/NoteEditModal";

interface Props {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetailView({ projectId, onBack }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [creatingNote, setCreatingNote] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [res, all, projNotes] = await Promise.all([
        api.getProject(projectId),
        api.listProjects(),
        api.listNotes({ projectId }),
      ]);
      setProject(res.project);
      setTasks(res.tasks);
      setProjects(all.projects);
      setNotes(projNotes.notes);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const addTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      await api.createTask({ title: newTitle.trim(), projectId, status: "todo" });
      setNewTitle("");
      await load();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  };

  const moveTask = async (task: Task, status: TaskStatus) => {
    await api.updateTask(task.id, { status });
    await load();
  };

  const removeTask = async (id: string) => {
    await api.deleteTask(id);
    await load();
  };

  if (error) {
    return (
      <div>
        <button className="back-link" onClick={onBack}>← Retour aux projets</button>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!project || tasks === null) {
    return <div className="loading-state">Chargement…</div>;
  }

  const byStatus = (s: TaskStatus) => tasks.filter((t) => t.status === s);

  return (
    <div>
      <button className="back-link" onClick={onBack}>← Retour aux projets</button>

      <div className="page-header">
        <div className="row between">
          <h1>{project.name}</h1>
          <span className="row" style={{ gap: 10 }}>
            <span className="status-pill">{PROJECT_STATUS_LABEL[project.status]}</span>
            <button className="btn btn-ghost" onClick={() => setEditingProject(true)}>
              Modifier
            </button>
          </span>
        </div>
        {project.description && <p>{project.description}</p>}
      </div>

      {/* Méta projet + progression */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="progress-row" style={{ marginBottom: 12 }}>
          <span>Progression</span>
          <div className="progress">
            <span style={{ width: `${project.progress}%` }} />
          </div>
          <span>{project.progress}%</span>
        </div>
        <div className="row" style={{ gap: 28, fontSize: 13, color: "var(--text-muted)" }}>
          <span>{project.doneCount} / {project.taskCount} tâches terminées</span>
          <span>Créé le {formatDate(project.createdAt)}</span>
          <span>Modifié le {formatDate(project.updatedAt)}</span>
        </div>
      </div>

      {/* Ajout rapide de tâche */}
      <form className="inline-add" onSubmit={addTask} style={{ marginBottom: 18 }}>
        <input
          className="input"
          placeholder="Nouvelle tâche…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={busy || !newTitle.trim()}>
          Ajouter
        </button>
      </form>

      {/* Kanban */}
      <div className="kanban">
        {TASK_STATUS_ORDER.map((status) => {
          const list = byStatus(status);
          return (
            <div className="kanban-col" key={status}>
              <h3>
                <span>{TASK_STATUS_LABEL[status]}</span>
                <span>{list.length}</span>
              </h3>
              {list.length === 0 ? (
                <div className="text-muted" style={{ fontSize: 12, padding: "8px 2px" }}>
                  Aucune tâche.
                </div>
              ) : (
                list.map((task) => (
                  <div className="task-row" key={task.id}>
                    <div
                      className="title"
                      style={{ cursor: "pointer" }}
                      onClick={() => setEditingTask(task)}
                    >
                      {task.title}
                    </div>
                    <div className="meta">
                      {task.priority && <span className={`prio ${task.priority}`} />}
                      {task.dueDate && <span>éch. {formatDate(task.dueDate)}</span>}
                    </div>
                    {task.tags.length > 0 && (
                      <div className="tags-row">
                        {task.tags.map((g) => (
                          <span className="tag-pill" key={g}>#{g}</span>
                        ))}
                      </div>
                    )}
                    <div className="task-actions">
                      {status !== "todo" && (
                        <button onClick={() => moveTask(task, prevStatus(status))}>←</button>
                      )}
                      {status !== "done" && (
                        <button onClick={() => moveTask(task, nextStatus(status))}>→</button>
                      )}
                      <button onClick={() => removeTask(task.id)}>Suppr.</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Notes liées */}
      <div className="card" style={{ marginTop: 22 }}>
        <div className="card-title">
          <h2>Notes liées</h2>
          <button className="btn btn-ghost" onClick={() => setCreatingNote(true)}>
            Nouvelle note
          </button>
        </div>
        {notes.length === 0 ? (
          <div className="empty-state" style={{ padding: "20px 0" }}>
            Aucune note liée à ce projet.
          </div>
        ) : (
          <div className="dash-list">
            {notes.map((n) => (
              <div
                className="dash-task"
                key={n.id}
                style={{ cursor: "pointer" }}
                onClick={() => setEditingNote(n)}
              >
                <span>{n.title}</span>
                <span className="tag">{formatDate(n.updatedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {(editingNote || creatingNote) && (
        <NoteEditModal
          note={editingNote}
          projects={projects}
          defaultProjectId={projectId}
          onClose={() => {
            setEditingNote(null);
            setCreatingNote(false);
          }}
          onSaved={() => {
            setEditingNote(null);
            setCreatingNote(false);
            void load();
          }}
          onDeleted={() => {
            setEditingNote(null);
            void load();
          }}
        />
      )}

      {editingProject && (
        <ProjectEditModal
          project={project}
          onClose={() => setEditingProject(false)}
          onSaved={() => {
            setEditingProject(false);
            void load();
          }}
          onDeleted={() => {
            setEditingProject(false);
            onBack();
          }}
        />
      )}

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          projects={projects}
          onClose={() => setEditingTask(null)}
          onSaved={() => {
            setEditingTask(null);
            void load();
          }}
          onDeleted={() => {
            setEditingTask(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function nextStatus(s: TaskStatus): TaskStatus {
  return s === "todo" ? "doing" : "done";
}
function prevStatus(s: TaskStatus): TaskStatus {
  return s === "done" ? "doing" : "todo";
}
