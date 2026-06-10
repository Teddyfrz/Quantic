import { useEffect, useState, type FormEvent } from "react";
import type { User, InvitationCode, AdminStats } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate } from "../lib/labels";

type Tab = "overview" | "stats" | "users" | "invites";

function formatBytes(n: number | null): string {
  if (n === null) return "—";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(2)} Mo`;
}

interface ApiStat { online: boolean; version?: string; latencyMs?: number }

export function AdminView() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<User[] | null>(null);
  const [invites, setInvites] = useState<InvitationCode[] | null>(null);
  const [stat, setStat] = useState<ApiStat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [u, i] = await Promise.all([api.listUsers(), api.listInvitations()]);
      setUsers(u.users);
      setInvites(i.invitations);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    }
  };

  const checkApi = async () => {
    const t0 = performance.now();
    try {
      const h = await api.health();
      setStat({ online: true, version: h.version, latencyMs: Math.round(performance.now() - t0) });
    } catch {
      setStat({ online: false });
    }
  };

  useEffect(() => {
    void load();
    void checkApi();
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Administration</h1>
        <p>Pilotage des membres et des accès.</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="seg">
        <button className={tab === "overview" ? "on" : ""} onClick={() => setTab("overview")}>Aperçu</button>
        <button className={tab === "stats" ? "on" : ""} onClick={() => setTab("stats")}>Statistiques</button>
        <button className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>Utilisateurs</button>
        <button className={tab === "invites" ? "on" : ""} onClick={() => setTab("invites")}>Invitations</button>
      </div>

      {tab === "overview" && <Overview users={users} invites={invites} stat={stat} onRefresh={checkApi} />}
      {tab === "stats" && <Stats />}
      {tab === "users" && <Users users={users} meId={me?.id} busy={busy} run={run} />}
      {tab === "invites" && <Invites invites={invites} busy={busy} run={run} />}
    </div>
  );
}

function Overview({ users, invites, stat, onRefresh }: {
  users: User[] | null; invites: InvitationCode[] | null; stat: ApiStat | null; onRefresh: () => void;
}) {
  if (!users || !invites) return <div className="loading-state">Chargement…</div>;
  const admins = users.filter((u) => u.role === "admin").length;
  const activeCodes = invites.filter((i) => i.isActive && i.usedCount < i.maxUses).length;
  const recent = users.slice(0, 5);

  return (
    <div>
      <div className="kpi-strip">
        <div className="kpi"><div className="label">Utilisateurs</div><div className="num">{users.length}</div></div>
        <div className="kpi"><div className="label">Administrateurs</div><div className="num">{admins}</div></div>
        <div className="kpi"><div className="label">Codes actifs</div><div className="num">{activeCodes}</div></div>
        <div className="kpi">
          <div className="label">API</div>
          <div className="num" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
            <span className={`dot ${stat?.online ? "online" : "offline"}`} />
            {stat ? (stat.online ? "En ligne" : "Hors ligne") : "…"}
          </div>
          {stat?.online && (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
              v{stat.version} · {stat.latencyMs} ms
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-title">
          <h2>Derniers inscrits</h2>
          <button className="btn btn-ghost" onClick={onRefresh}>Vérifier l'API</button>
        </div>
        <table className="table">
          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Inscrit le</th></tr></thead>
          <tbody>
            {recent.map((u) => (
              <tr key={u.id}>
                <td style={{ color: "var(--text-primary)" }}>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`badge ${u.role === "admin" ? "badge-admin" : ""}`}>{u.role}</span></td>
                <td>{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stats() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.adminStats());
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) return <div className="loading-state">Chargement…</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const groups = [...new Set(data.entries.map((e) => e.group))];

  return (
    <div>
      <div className="kpi-strip">
        <div className="kpi"><div className="label">Lignes en base</div><div className="num">{data.totalRows}</div></div>
        <div className="kpi"><div className="label">Taille de la BDD</div><div className="num" style={{ fontSize: 22, marginTop: 12 }}>{formatBytes(data.dbSizeBytes)}</div></div>
        <div className="kpi"><div className="label">Utilisateurs</div><div className="num">{data.users}</div></div>
        <div className="kpi"><div className="label">Codes actifs</div><div className="num">{data.activeInvites}</div></div>
      </div>

      <div className="stack" style={{ marginTop: 18 }}>
        {groups.map((g) => {
          const rows = data.entries.filter((e) => e.group === g);
          const max = Math.max(1, ...rows.map((r) => r.count));
          return (
            <div className="card" key={g}>
              <div className="card-title"><h2>{g}</h2></div>
              <div className="stack" style={{ gap: 12 }}>
                {rows.map((r) => (
                  <div key={r.label}>
                    <div className="row between" style={{ fontSize: 13, marginBottom: 5 }}>
                      <span>{r.label}</span>
                      <span className="mono" style={{ color: "var(--text-primary)" }}>{r.count}</span>
                    </div>
                    <div className="progress"><span style={{ width: `${(r.count / max) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-muted" style={{ fontSize: 12, marginTop: 14 }}>
        Généré le {formatDate(data.generatedAt)} à {new Date(data.generatedAt).toLocaleTimeString("fr-FR")} ·{" "}
        <button className="auth-link" style={{ fontSize: 12 }} onClick={() => void load()}>Rafraîchir</button>
      </div>
    </div>
  );
}

function Users({ users, meId, busy, run }: {
  users: User[] | null; meId?: string; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  if (!users) return <div className="loading-state">Chargement…</div>;

  const filtered = users
    .filter((u) => {
      const q = query.trim().toLowerCase();
      return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    })
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.createdAt.localeCompare(a.createdAt)));

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Rechercher (nom, email)…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as "recent" | "name")}>
          <option value="recent">Plus récents</option>
          <option value="name">Nom (A→Z)</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">Aucun utilisateur.</div>
      ) : (
        <table className="table">
          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Inscrit le</th><th></th></tr></thead>
          <tbody>
            {filtered.map((u) => {
              const self = u.id === meId;
              return (
                <tr key={u.id}>
                  <td style={{ color: "var(--text-primary)" }}>{u.name}{self && <span className="text-muted" style={{ fontSize: 12 }}> (vous)</span>}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${u.role === "admin" ? "badge-admin" : ""}`}>{u.role}</span></td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {self ? (
                      <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                    ) : (
                      <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost" disabled={busy}
                          onClick={() => run(() => api.setUserRole(u.id, u.role === "admin" ? "user" : "admin"))}>
                          {u.role === "admin" ? "Rétrograder" : "Promouvoir"}
                        </button>
                        {confirmDel === u.id ? (
                          <button className="btn btn-danger" disabled={busy}
                            onClick={() => run(() => api.deleteUser(u.id)).then(() => setConfirmDel(null))}>
                            Confirmer
                          </button>
                        ) : (
                          <button className="btn btn-danger" disabled={busy} onClick={() => setConfirmDel(u.id)}>Supprimer</button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Invites({ invites, busy, run }: {
  invites: InvitationCode[] | null; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [maxUses, setMaxUses] = useState("1");
  const [expiry, setExpiry] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  if (!invites) return <div className="loading-state">Chargement…</div>;

  const create = (e: FormEvent) => {
    e.preventDefault();
    void run(() => api.createInvitation({
      maxUses: Math.max(1, Number(maxUses) || 1),
      expiresAt: expiry ? new Date(expiry + "T23:59:59.000Z").toISOString() : null,
    }));
    setExpiry("");
  };

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };

  return (
    <div className="card">
      <div className="card-title"><h2>Codes d'invitation</h2></div>

      <form className="row" onSubmit={create} style={{ gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <div className="field">
          <label style={{ fontSize: 12 }}>Utilisations</label>
          <input className="input" style={{ width: 110 }} type="number" min={1} max={1000} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
        </div>
        <div className="field">
          <label style={{ fontSize: 12 }}>Expiration (optionnel)</label>
          <input className="input" style={{ width: 170 }} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ alignSelf: "flex-end" }}>Créer un code</button>
      </form>

      {invites.length === 0 ? (
        <div className="empty-state">Aucun code d'invitation.</div>
      ) : (
        <table className="table">
          <thead><tr><th>Code</th><th>Utilisations</th><th>Expiration</th><th>État</th><th></th></tr></thead>
          <tbody>
            {invites.map((inv) => {
              const exhausted = inv.usedCount >= inv.maxUses;
              const ok = inv.isActive && !exhausted;
              return (
                <tr key={inv.id}>
                  <td>
                    <button className="mono" style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", padding: 0 }} onClick={() => copy(inv.code)} title="Copier">
                      {inv.code}{copied === inv.code ? " ✓" : ""}
                    </button>
                  </td>
                  <td>{inv.usedCount} / {inv.maxUses}</td>
                  <td>{inv.expiresAt ? formatDate(inv.expiresAt) : "—"}</td>
                  <td><span className={`badge ${ok ? "badge-admin" : ""}`}>{ok ? "Actif" : exhausted ? "Épuisé" : "Désactivé"}</span></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                      {inv.isActive && (
                        <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => api.disableInvitation(inv.id))}>Désactiver</button>
                      )}
                      <button className="btn btn-danger" disabled={busy} onClick={() => run(() => api.deleteInvitation(inv.id))}>Suppr.</button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
