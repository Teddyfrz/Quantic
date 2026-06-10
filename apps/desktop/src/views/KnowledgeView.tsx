import { useEffect, useState, type FormEvent } from "react";
import type { KbCategory, KbPage } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { formatDate } from "../lib/labels";
import { KbPageEditModal } from "../components/KbPageEditModal";
import { KbCategoryModal } from "../components/KbCategoryModal";
import { Markdown } from "../components/Markdown";

export function KnowledgeView({ applySearch }: { applySearch?: { query: string; nonce: number } }) {
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [pages, setPages] = useState<KbPage[] | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | "all">("all");
  const [selectedPage, setSelectedPage] = useState<KbPage | null>(null);
  const [query, setQuery] = useState("");
  const [newCat, setNewCat] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [creatingPage, setCreatingPage] = useState(false);
  const [editingPage, setEditingPage] = useState<KbPage | null>(null);
  const [editingCat, setEditingCat] = useState<KbCategory | null>(null);

  const loadCategories = async () => {
    const res = await api.listKbCategories();
    setCategories(res.categories);
  };

  const loadPages = async () => {
    const res = await api.listKbPages({
      categoryId: selectedCat === "all" ? undefined : selectedCat,
      q: query.trim() || undefined,
    });
    setPages(res.pages);
    // garde la page sélectionnée à jour si toujours présente
    setSelectedPage((cur) => (cur ? res.pages.find((p) => p.id === cur.id) ?? null : null));
  };

  const reload = async () => {
    setError(null);
    try {
      await Promise.all([loadCategories(), loadPages()]);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (applySearch) { setSelectedCat("all"); setQuery(applySearch.query); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applySearch?.nonce]);

  useEffect(() => {
    loadPages().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCat, query]);

  const addCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    try {
      await api.createKbCategory({ name: newCat.trim() });
      setNewCat("");
      await loadCategories();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Création impossible.");
    }
  };

  const catName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name ?? null : null;

  return (
    <div>
      <div className="page-header">
        <div className="row between">
          <div>
            <h1>Base de connaissances</h1>
            <p>Vos informations durables, organisées par catégories.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setCreatingPage(true)}>
            Nouvelle page
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="kb-layout">
        {/* Colonne gauche : recherche, catégories, pages */}
        <div className="kb-side">
          <input
            className="input full"
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="card" style={{ padding: 14 }}>
            <div className="kb-section-label">Catégories</div>
            <div
              className={`kb-cat ${selectedCat === "all" ? "active" : ""}`}
              onClick={() => setSelectedCat("all")}
            >
              <span>Toutes les pages</span>
            </div>
            {categories.map((c) => (
              <div
                key={c.id}
                className={`kb-cat ${selectedCat === c.id ? "active" : ""}`}
                onClick={() => setSelectedCat(c.id)}
              >
                <span>{c.name}</span>
                <button
                  className="edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCat(c);
                  }}
                >
                  Modifier
                </button>
              </div>
            ))}
            <form className="inline-add" onSubmit={addCategory} style={{ marginTop: 10 }}>
              <input
                className="input"
                placeholder="Nouvelle catégorie…"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
              />
              <button className="btn btn-ghost" type="submit" disabled={!newCat.trim()}>
                +
              </button>
            </form>
          </div>

          <div>
            <div className="kb-section-label">Pages</div>
            {pages === null ? (
              <div className="loading-state" style={{ padding: 20 }}>Chargement…</div>
            ) : pages.length === 0 ? (
              <div className="text-muted" style={{ fontSize: 13, padding: "8px 4px" }}>
                Aucune page.
              </div>
            ) : (
              pages.map((p) => (
                <div
                  key={p.id}
                  className={`kb-page-item ${selectedPage?.id === p.id ? "active" : ""}`}
                  onClick={() => setSelectedPage(p)}
                >
                  <div className="t">{p.title}</div>
                  <div className="m">
                    {catName(p.categoryId) ? `${catName(p.categoryId)} · ` : ""}
                    {formatDate(p.updatedAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Colonne droite : consultation */}
        <div className="card" style={{ minHeight: 320 }}>
          {selectedPage ? (
            <div>
              <div className="row between" style={{ marginBottom: 6 }}>
                <h2 style={{ fontSize: 22 }}>{selectedPage.title}</h2>
                <button className="btn btn-ghost" onClick={() => setEditingPage(selectedPage)}>
                  Modifier
                </button>
              </div>
              <div className="text-muted" style={{ fontSize: 12, marginBottom: 20 }}>
                {catName(selectedPage.categoryId) ?? "Sans catégorie"} · modifié le{" "}
                {formatDate(selectedPage.updatedAt)}
              </div>
              {selectedPage.content.trim() ? (
                <Markdown source={selectedPage.content} />
              ) : (
                <div className="text-muted" style={{ fontSize: 13 }}>Page vide.</div>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "80px 0" }}>
              Sélectionnez une page pour la consulter, ou créez-en une nouvelle.
            </div>
          )}
        </div>
      </div>

      {(creatingPage || editingPage) && (
        <KbPageEditModal
          page={editingPage}
          categories={categories}
          defaultCategoryId={selectedCat === "all" ? null : selectedCat}
          onClose={() => {
            setCreatingPage(false);
            setEditingPage(null);
          }}
          onSaved={() => {
            setCreatingPage(false);
            setEditingPage(null);
            void loadPages();
          }}
          onDeleted={() => {
            setEditingPage(null);
            setSelectedPage(null);
            void loadPages();
          }}
        />
      )}

      {editingCat && (
        <KbCategoryModal
          category={editingCat}
          onClose={() => setEditingCat(null)}
          onSaved={() => {
            setEditingCat(null);
            void reload();
          }}
          onDeleted={() => {
            setEditingCat(null);
            if (selectedCat === editingCat.id) setSelectedCat("all");
            void reload();
          }}
        />
      )}
    </div>
  );
}
