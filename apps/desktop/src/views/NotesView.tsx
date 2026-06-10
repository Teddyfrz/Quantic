import { useEffect, useState } from "react";
import type { Note, Project } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { formatDate } from "../lib/labels";
import { NoteEditModal } from "../components/NoteEditModal";

type NoteSort = "recent" | "title";

export function NotesView({ applySearch }: { applySearch?: { query: string; nonce: number } }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sort, setSort] = useState<NoteSort>("recent");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [n, p] = await Promise.all([api.listNotes(), api.listProjects()]);
      setNotes(n.notes);
      setProjects(p.projects);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (applySearch) { setQuery(applySearch.query); setProjectFilter("all"); }
  }, [applySearch?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const projectName = (id: string | null) =>
    id ? projects.find((p) => p.id === id)?.name ?? null : null;

  const filtered = (notes ?? [])
    .filter((n) => {
      const q = query.trim().toLowerCase();
      if (q && !(n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))) return false;
      if (projectFilter === "none" && n.projectId) return false;
      if (projectFilter !== "all" && projectFilter !== "none" && n.projectId !== projectFilter) return false;
      return true;
    })
    .sort((a, b) => (sort === "title" ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt)));

  return (
    <div>
      <div className="page-header">
        <div className="row between">
          <div>
            <h1>Notes</h1>
            <p>Vos notes rapides.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Nouvelle note
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="list-toolbar">
        <input className="input" placeholder="Rechercher dans les notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="all">Tous les projets</option>
          <option value="none">Sans projet</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as NoteSort)}>
          <option value="recent">Récentes</option>
          <option value="title">Titre (A→Z)</option>
        </select>
        {notes && <span className="list-count">{filtered.length} / {notes.length}</span>}
      </div>

      {notes === null ? (
        <div className="loading-state">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {notes.length === 0 ? "Aucune note pour le moment." : "Aucune note ne correspond à la recherche."}
        </div>
      ) : (
        <div className="grid-cards">
          {filtered.map((n) => (
            <div className="card hoverable project-card" key={n.id} onClick={() => setEditing(n)}>
              <h2>{n.title}</h2>
              <div className="desc">{n.content || "Note vide."}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                {projectName(n.projectId) ? `${projectName(n.projectId)} · ` : ""}
                {formatDate(n.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <NoteEditModal
          note={editing}
          projects={projects}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
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
