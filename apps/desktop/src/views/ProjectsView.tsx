import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Project, ProjectStatus } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { PROJECT_STATUS_LABEL } from "../lib/labels";
import { ProjectDetailView } from "./ProjectDetailView";
import { ProjectEditModal } from "../components/ProjectEditModal";

type ProjSort = "recent" | "name" | "progress";

export function ProjectsView({ applySearch }: { applySearch?: { query: string; nonce: number } }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [sort, setSort] = useState<ProjSort>("recent");

  const load = async () => {
    setError(null);
    try {
      const res = await api.listProjects();
      setProjects(res.projects);
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

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.createProject({ name: name.trim(), description: description.trim() || null });
      setName("");
      setDescription("");
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  };

  const all = projects ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length, active: 0, paused: 0, done: 0 };
    for (const p of all) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [all]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((p) => statusFilter === "all" || p.status === statusFilter)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "progress") return b.progress - a.progress;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [all, query, statusFilter, sort]);

  const STATUS_FILTERS: { id: ProjectStatus | "all"; label: string }[] = [
    { id: "all", label: "Tous" },
    { id: "active", label: PROJECT_STATUS_LABEL.active },
    { id: "paused", label: PROJECT_STATUS_LABEL.paused },
    { id: "done", label: PROJECT_STATUS_LABEL.done },
  ];

  if (selected) {
    return (
      <ProjectDetailView
        projectId={selected}
        onBack={() => {
          setSelected(null);
          void load();
        }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="row between">
          <div>
            <h1>Projets</h1>
            <p>Vos projets et leur avancement.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Annuler" : "Nouveau projet"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      {creating && (
        <form className="card stack" onSubmit={create} style={{ marginBottom: 22 }}>
          <div className="field">
            <label htmlFor="pname">Nom</label>
            <input
              id="pname"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du projet"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pdesc">Description</label>
            <textarea
              id="pdesc"
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle"
            />
          </div>
          <div>
            <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
              Créer le projet
            </button>
          </div>
        </form>
      )}

      {projects === null ? (
        <div className="loading-state">Chargement…</div>
      ) : all.length === 0 ? (
        <div className="empty-state">Aucun projet pour le moment. Créez votre premier projet.</div>
      ) : (
        <>
          <div className="list-toolbar">
            <input className="input" placeholder="Rechercher un projet…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as ProjSort)}>
              <option value="recent">Récents</option>
              <option value="name">Nom (A→Z)</option>
              <option value="progress">Progression</option>
            </select>
            <span className="list-count">{shown.length} / {all.length}</span>
          </div>
          <div className="filter-chips">
            {STATUS_FILTERS.map((f) => (
              <button key={f.id} className={`chip ${statusFilter === f.id ? "on" : ""}`} onClick={() => setStatusFilter(f.id)}>
                {f.label}<span className="cnt">{counts[f.id] ?? 0}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="empty-state">Aucun projet ne correspond.</div>
          ) : (
        <div className="grid-cards">
          {shown.map((p) => (
            <div className="card hoverable project-card" key={p.id} onClick={() => setSelected(p.id)}>
              <div className="row between">
                <h2>{p.name}</h2>
                <span className="row" style={{ gap: 8 }}>
                  <span className="status-pill">{PROJECT_STATUS_LABEL[p.status]}</span>
                  <button
                    className="task-actions"
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(p);
                    }}
                  >
                    Modifier
                  </button>
                </span>
              </div>
              <div className="desc">{p.description || "Sans description."}</div>
              <div className="progress-row">
                <div className="progress">
                  <span style={{ width: `${p.progress}%` }} />
                </div>
                <span>{p.progress}%</span>
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                {p.doneCount} / {p.taskCount} tâches
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {editing && (
        <ProjectEditModal
          project={editing}
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
    </div>
  );
}
