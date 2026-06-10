import { useEffect, useMemo, useState } from "react";
import type { Contact } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { ContactEditModal } from "../components/ContactEditModal";

type ContactSort = "name" | "recent";

export function ContactsView({ applySearch }: { applySearch?: { query: string; nonce: number } }) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<ContactSort>("name");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const res = await api.listContacts({ q: query.trim() || undefined });
      setContacts(res.contacts);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (applySearch) { setQuery(applySearch.query); setTypeFilter("all"); }
  }, [applySearch?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const types = useMemo(
    () => [...new Set((contacts ?? []).map((c) => c.type).filter((t): t is string => Boolean(t)))].sort(),
    [contacts]
  );
  const shown = useMemo(
    () =>
      (contacts ?? [])
        .filter((c) => typeFilter === "all" || c.type === typeFilter)
        .sort((a, b) => (sort === "recent" ? b.updatedAt.localeCompare(a.updatedAt) : a.name.localeCompare(b.name))),
    [contacts, typeFilter, sort]
  );

  return (
    <div>
      <div className="page-header">
        <div className="row between">
          <div>
            <h1>Contacts</h1>
            <p>Votre carnet d'adresses.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Nouveau contact
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="list-toolbar">
        <input className="input" placeholder="Rechercher un contact (nom, email, entreprise)…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">Tous les types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as ContactSort)}>
          <option value="name">Nom (A→Z)</option>
          <option value="recent">Récents</option>
        </select>
        {contacts && <span className="list-count">{shown.length} / {contacts.length}</span>}
      </div>

      {contacts === null ? (
        <div className="loading-state">Chargement…</div>
      ) : shown.length === 0 ? (
        <div className="empty-state">
          {query || typeFilter !== "all" ? "Aucun contact ne correspond." : "Aucun contact pour le moment."}
        </div>
      ) : (
        <div className="grid-cards">
          {shown.map((c) => (
            <div className="card hoverable contact-card" key={c.id} onClick={() => setEditing(c)}>
              <div className="nm">{c.name}</div>
              {c.company && <div className="info">{c.company}</div>}
              {c.email && <div className="info">{c.email}</div>}
              {c.phone && <div className="info">{c.phone}</div>}
              {c.type && <span className="type">{c.type}</span>}
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <ContactEditModal
          contact={editing}
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
