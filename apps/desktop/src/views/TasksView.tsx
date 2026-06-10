import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Task, Project, TaskStatus, TaskPriority } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER, formatDate } from "../lib/labels";
import { TaskEditModal } from "../components/TaskEditModal";
import { TagManagerModal } from "../components/TagManagerModal";

type TaskSort = "recent" | "due" | "priority" | "title";
const PRIO_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function TasksView({ applySearch }: { applySearch?: { query: string; nonce: number } }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [prioFilter, setPrioFilter] = useState<TaskPriority | "all">("all");
  const [projFilter, setProjFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sort, setSort] = useState<TaskSort>("recent");
  const [managingTags, setManagingTags] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [t, p] = await Promise.all([api.listTasks(), api.listProjects()]);
      setTasks(t.tasks);
      setProjects(p.projects);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (applySearch) { setQuery(applySearch.query); setStatusFilter("all"); }
  }, [applySearch?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const projectName = (id: string | null) =>
    id ? projects.find((p) => p.id === id)?.name ?? null : null;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.createTask({
        title: title.trim(),
        priority: priority || null,
        projectId: projectId || null,
      });
      setTitle("");
      setPriority("");
      setProjectId("");
      await load();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (task: Task, status: TaskStatus) => {
    await api.updateTask(task.id, { status });
    await load();
  };
  const remove = async (id: string) => {
    await api.deleteTask(id);
    await load();
  };

  const all = tasks ?? [];
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: all.length, todo: 0, doing: 0, done: 0 };
    for (const t of all) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [all]);

  const allTags = useMemo(
    () => [...new Set(all.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b)),
    [all]
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((t) => statusFilter === "all" || t.status === statusFilter)
      .filter((t) => prioFilter === "all" || t.priority === prioFilter)
      .filter((t) => projFilter === "all" || (projFilter === "none" ? !t.projectId : t.projectId === projFilter))
      .filter((t) => tagFilter === "all" || t.tags.includes(tagFilter))
      .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q) || t.tags.some((g) => g.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "priority") return (PRIO_RANK[a.priority ?? "z"] ?? 9) - (PRIO_RANK[b.priority ?? "z"] ?? 9);
        if (sort === "due") return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [all, query, statusFilter, prioFilter, projFilter, tagFilter, sort]);

  const STATUS_FILTERS: { id: TaskStatus | "all"; label: string }[] = [
    { id: "all", label: "Toutes" },
    ...TASK_STATUS_ORDER.map((s) => ({ id: s, label: TASK_STATUS_LABEL[s] })),
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Tâches</h1>
        <p>Toutes vos tâches, tous projets confondus.</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      <form className="card" onSubmit={create} style={{ marginBottom: 22 }}>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 2, minWidth: 200 }}
            placeholder="Nouvelle tâche…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority | "")}>
            <option value="">Priorité</option>
            <option value="low">Basse</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
          <select className="select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Sans projet</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit" disabled={busy || !title.trim()}>
            Ajouter
          </button>
        </div>
      </form>

      {tasks === null ? (
        <div className="loading-state">Chargement…</div>
      ) : all.length === 0 ? (
        <div className="empty-state">Aucune tâche. Ajoutez votre première tâche ci-dessus.</div>
      ) : (
        <>
          <div className="list-toolbar">
            <input className="input" placeholder="Rechercher une tâche…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="select" value={prioFilter} onChange={(e) => setPrioFilter(e.target.value as TaskPriority | "all")}>
              <option value="all">Toutes priorités</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
            <select className="select" value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
              <option value="all">Tous les projets</option>
              <option value="none">Sans projet</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {allTags.length > 0 && (
              <select className="select" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                <option value="all">Tous les tags</option>
                {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
              </select>
            )}
            {allTags.length > 0 && (
              <button className="btn btn-ghost" onClick={() => setManagingTags(true)}>Gérer les tags</button>
            )}
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as TaskSort)}>
              <option value="recent">Récentes</option>
              <option value="due">Échéance</option>
              <option value="priority">Priorité</option>
              <option value="title">Titre (A→Z)</option>
            </select>
            <span className="list-count">{shown.length} / {all.length}</span>
          </div>
          <div className="filter-chips">
            {STATUS_FILTERS.map((f) => (
              <button key={f.id} className={`chip ${statusFilter === f.id ? "on" : ""}`} onClick={() => setStatusFilter(f.id)}>
                {f.label}<span className="cnt">{statusCounts[f.id] ?? 0}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="empty-state">Aucune tâche ne correspond.</div>
          ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Tâche</th>
                <th>Projet</th>
                <th>Priorité</th>
                <th>Échéance</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((task) => (
                <tr key={task.id}>
                  <td style={{ color: "var(--text-primary)", cursor: "pointer" }} onClick={() => setEditing(task)}>
                    {task.title}
                    {task.tags.length > 0 && (
                      <div className="tags-row" style={{ marginTop: 5 }}>
                        {task.tags.map((g) => (
                          <span
                            className="tag-pill"
                            key={g}
                            onClick={(e) => { e.stopPropagation(); setTagFilter(g); }}
                            style={{ cursor: "pointer" }}
                          >
                            #{g}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>{projectName(task.projectId) ?? "—"}</td>
                  <td>
                    {task.priority ? (
                      <span className="row" style={{ gap: 6 }}>
                        <span className={`prio ${task.priority}`} />
                        {task.priority}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{task.dueDate ? formatDate(task.dueDate) : "—"}</td>
                  <td>
                    <select
                      className="select"
                      style={{ padding: "5px 8px", fontSize: 12 }}
                      value={task.status}
                      onChange={(e) => setStatus(task, e.target.value as TaskStatus)}
                    >
                      {TASK_STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost" onClick={() => remove(task.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}

      {editing && (
        <TaskEditModal
          task={editing}
          projects={projects}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
          onDeleted={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {managingTags && (
        <TagManagerModal
          tasks={all}
          onClose={() => setManagingTags(false)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}
