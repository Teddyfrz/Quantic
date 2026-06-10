import { useEffect, useRef, useState, type ReactNode, type ChangeEvent } from "react";
import type { MyProfile, PublicProfile, PresenceStatus, ProfileVisibility } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate } from "../lib/labels";
import { fileToDataUrl } from "../lib/image";
import { Modal } from "../components/Modal";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#cbb8ff,#9b7cff)",
  "linear-gradient(135deg,#9fd0ff,#5f8ad9)",
  "linear-gradient(135deg,#a0e0c0,#5fd08a)",
  "linear-gradient(135deg,#ffd29f,#d98a5f)",
  "linear-gradient(135deg,#ffb4c6,#e06a8b)",
  "linear-gradient(135deg,#cfd4dc,#8b93a1)",
];
const STATUS: { id: PresenceStatus; label: string }[] = [
  { id: "available", label: "Disponible" },
  { id: "focus", label: "Focus" },
  { id: "away", label: "Absent" },
  { id: "offline", label: "Hors ligne" },
];
const statusLabel = (s: PresenceStatus) => STATUS.find((x) => x.id === s)?.label ?? "";
const gradientOf = (c: string) => AVATAR_GRADIENTS[Number(c) || 0];
const initials = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const Icon = {
  github: (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85l-.01 2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" /></svg>),
  x: (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.4l8.1-9.3L.9 2h7.2l5 6.6zm-1.2 18h1.9L7.1 4H5z" /></svg>),
  linkedin: (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 8.5v10H3.5v-10zM5 3.5A1.75 1.75 0 1 1 5 7a1.75 1.75 0 0 1 0-3.5zM9 8.5h2.9v1.4h.04c.4-.76 1.4-1.56 2.86-1.56 3.06 0 3.7 2 3.7 4.6v5.56h-3v-4.93c0-1.18-.02-2.7-1.64-2.7-1.64 0-1.9 1.28-1.9 2.6v5.03H9z" /></svg>),
  instagram: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>),
  globe: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>),
};
function detectLink(raw: string): { href: string; label: string; icon: ReactNode } {
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let host = raw;
  try { host = new URL(href).hostname.replace(/^www\./, ""); } catch { /* garde raw */ }
  const l = href.toLowerCase();
  if (l.includes("github.com")) return { href, label: "GitHub", icon: Icon.github };
  if (l.includes("x.com") || l.includes("twitter.com")) return { href, label: "X", icon: Icon.x };
  if (l.includes("linkedin.com")) return { href, label: "LinkedIn", icon: Icon.linkedin };
  if (l.includes("instagram.com")) return { href, label: "Instagram", icon: Icon.instagram };
  return { href, label: host, icon: Icon.globe };
}

function ProfileCard({ p }: { p: PublicProfile }) {
  const handle = p.handle || p.name.toLowerCase().replace(/\s+/g, "");
  const bannerStyle = p.bannerUrl ? { backgroundImage: `url(${p.bannerUrl})` } : undefined;
  const avatarStyle = p.avatarUrl
    ? { backgroundImage: `url(${p.avatarUrl})` }
    : { background: gradientOf(p.avatarColor) };
  return (
    <div className="profile-card">
      <div className="profile-banner" style={bannerStyle} />
      <div className="profile-body">
        <div className="profile-top">
          <div className="avatar-xl" style={avatarStyle}>{p.avatarUrl ? "" : initials(p.name)}</div>
          <div className="profile-id">
            <div className="profile-name">{p.name}</div>
            <div className="profile-handle">@{handle}</div>
          </div>
        </div>
        <span className="profile-status" style={{ marginTop: 14 }}>
          <span className={`status-dot ${p.status}`} />
          {statusLabel(p.status)}{p.statusText ? ` · ${p.statusText}` : ""}
        </span>
        {p.bio && <p className="profile-bio">{p.bio}</p>}
        {p.location && (
          <div className="profile-loc">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
            {p.location}
          </div>
        )}
        {p.links.length > 0 && (
          <div className="profile-links">
            {p.links.map((raw, i) => {
              const d = detectLink(raw);
              return <a className="link-chip" key={i} href={d.href} target="_blank" rel="noreferrer noopener">{d.icon}{d.label}</a>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function SocialView() {
  const [tab, setTab] = useState<"me" | "directory">("me");
  return (
    <div>
      <div className="page-header">
        <h1>Social</h1>
        <p>Ton profil et l'annuaire des membres.</p>
      </div>
      <div className="seg">
        <button className={tab === "me" ? "on" : ""} onClick={() => setTab("me")}>Mon profil</button>
        <button className={tab === "directory" ? "on" : ""} onClick={() => setTab("directory")}>Annuaire</button>
      </div>
      {tab === "me" ? <MyProfilePanel /> : <DirectoryPanel />}
    </div>
  );
}

function MyProfilePanel() {
  const { user, updateName } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [counts, setCounts] = useState<{ projects: number; notes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<PresenceStatus>("available");
  const [statusText, setStatusText] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [avatarColor, setAvatarColor] = useState("0");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [linksText, setLinksText] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("members");

  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.myProfile().then(({ profile: p }) => {
      setProfile(p);
      setHandle(p.handle ?? ""); setStatus(p.status); setStatusText(p.statusText ?? "");
      setLocation(p.location ?? ""); setBio(p.bio ?? ""); setAvatarColor(p.avatarColor || "0");
      setAvatarUrl(p.avatarUrl); setBannerUrl(p.bannerUrl);
      setLinksText(p.links.join("\n")); setVisibility(p.visibility);
    }).catch((e) => setError(e instanceof ApiException ? e.message : "Chargement impossible."));
    Promise.all([api.listProjects(), api.listNotes()])
      .then(([pr, n]) => setCounts({ projects: pr.projects.length, notes: n.notes.length }))
      .catch(() => setCounts({ projects: 0, notes: 0 }));
  }, []);

  if (!profile) return <div className="loading-state">Chargement…</div>;

  const pickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { setAvatarUrl(await fileToDataUrl(f, 256, 256)); } catch { setError("Image avatar invalide."); }
  };
  const pickBanner = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { setBannerUrl(await fileToDataUrl(f, 1280, 400, 0.78)); } catch { setError("Image bannière invalide."); }
  };

  const links = linksText.split("\n").map((l) => l.trim()).filter(Boolean);
  const preview: PublicProfile = {
    ...profile, name: name.trim() || profile.name, handle: handle.trim() || null, status, statusText: statusText.trim() || null,
    location: location.trim() || null, bio: bio.trim() || null, avatarColor, avatarUrl, bannerUrl, links,
  };

  const save = async () => {
    setError(null);
    try {
      if (name.trim() && name.trim() !== user?.name) await updateName(name.trim());
      const { profile: p } = await api.updateMyProfile({
        handle: handle.trim() || null, status, statusText: statusText.trim() || null,
        location: location.trim() || null, bio: bio.trim() || null,
        avatarColor, avatarUrl, bannerUrl, links, visibility,
      });
      setProfile({ ...p, name: name.trim() || p.name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Enregistrement impossible.");
    }
  };

  return (
    <div className="social-grid">
      <div className="social-edit">
        <ProfileCard p={preview} />
        <div className="social-stats">
          <div className="stat"><div className="k">Membre depuis</div><div className="v" style={{ fontSize: 16 }}>{formatDate(profile.memberSince)}</div></div>
          <div className="stat"><div className="k">Projets</div><div className="v">{counts ? counts.projects : "—"}</div></div>
          <div className="stat"><div className="k">Notes</div><div className="v">{counts ? counts.notes : "—"}</div></div>
        </div>
      </div>

      <div className="card social-edit">
        <div className="card-title"><h2>Modifier le profil</h2></div>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="visibility-row">
          <div>
            <div style={{ fontSize: 14 }}>Visible dans l'annuaire</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {visibility === "members" ? "Les autres membres voient ton profil." : "Ton profil reste privé."}
            </div>
          </div>
          <div className={`toggle ${visibility === "members" ? "on" : ""}`} role="switch" aria-checked={visibility === "members"}
            onClick={() => setVisibility(visibility === "members" ? "private" : "members")} />
        </div>

        {/* Images */}
        <div className="field">
          <label>Photos</label>
          <div className="upload-row">
            <label className="upload">
              <input ref={avatarInput} type="file" accept="image/*" onChange={pickAvatar} />
              {avatarUrl ? "Changer l'avatar" : "Ajouter un avatar"}
            </label>
            {avatarUrl && <button className="upload-clear" onClick={() => setAvatarUrl(null)}>retirer l'avatar</button>}
          </div>
          <div className="upload-row" style={{ marginTop: 8 }}>
            <label className="upload">
              <input ref={bannerInput} type="file" accept="image/*" onChange={pickBanner} />
              {bannerUrl ? "Changer la bannière" : "Ajouter une bannière"}
            </label>
            {bannerUrl && <button className="upload-clear" onClick={() => setBannerUrl(null)}>retirer la bannière</button>}
          </div>
        </div>

        {!avatarUrl && (
          <div className="field">
            <label>Couleur d'avatar (sans photo)</label>
            <div className="swatch-row">
              {AVATAR_GRADIENTS.map((g, i) => (
                <div key={i} className={`swatch-pick ${String(i) === avatarColor ? "on" : ""}`} style={{ background: g }} onClick={() => setAvatarColor(String(i))} />
              ))}
            </div>
          </div>
        )}

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="pname">Nom</label>
            <input id="pname" className="input full" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ton nom" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="handle">Identifiant (@)</label>
            <input id="handle" className="input full" value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s+/g, ""))} placeholder="pseudo" />
          </div>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="loc">Localisation</label>
            <input id="loc" className="input full" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ex. Lille" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="status">Statut</label>
            <select id="status" className="select full" value={status} onChange={(e) => setStatus(e.target.value as PresenceStatus)}>
              {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="stext">Message d'état</label>
          <input id="stext" className="input full" value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder="Sur quoi tu bosses…" maxLength={80} />
        </div>

        <div className="field">
          <label htmlFor="bio">Bio</label>
          <textarea id="bio" className="textarea full" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Quelques mots sur toi…" />
        </div>
        <div className="field">
          <label htmlFor="links">Liens (un par ligne)</label>
          <textarea id="links" className="textarea full" value={linksText} onChange={(e) => setLinksText(e.target.value)} placeholder={"github.com/pseudo\nlinkedin.com/in/pseudo\nmonsite.fr"} />
        </div>

        <button className="btn btn-primary" onClick={save}>{saved ? "Enregistré ✓" : "Enregistrer le profil"}</button>
      </div>
    </div>
  );
}

function DirectoryPanel() {
  const [profiles, setProfiles] = useState<PublicProfile[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PresenceStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicProfile | null>(null);

  useEffect(() => {
    api.listProfiles(query.trim() || undefined)
      .then(({ profiles: p }) => setProfiles(p))
      .catch((e) => setError(e instanceof ApiException ? e.message : "Chargement impossible."));
  }, [query]);

  const all = profiles ?? [];
  const countOf = (s: PresenceStatus) => all.filter((p) => p.status === s).length;
  const shown = filter === "all" ? all : all.filter((p) => p.status === filter);

  const chips: { id: PresenceStatus | "all"; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: all.length },
    ...STATUS.map((s) => ({ id: s.id, label: s.label, count: countOf(s.id) })),
  ];

  return (
    <div>
      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      <p className="text-muted" style={{ marginBottom: 16, fontSize: 13 }}>
        Vois en un coup d'œil qui est disponible et sur quoi chacun travaille.
      </p>

      <input className="input full" style={{ marginBottom: 16 }} placeholder="Rechercher un membre (nom, identifiant, lieu)…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {/* Filtres de présence */}
      <div className="filter-chips">
        {chips.map((c) => (
          <button key={c.id} className={`chip ${filter === c.id ? "on" : ""}`} onClick={() => setFilter(c.id)}>
            {c.id !== "all" && <span className={`status-dot ${c.id}`} />}
            {c.label}
            <span className="cnt">{c.count}</span>
          </button>
        ))}
      </div>

      {profiles === null ? (
        <div className="loading-state">Chargement…</div>
      ) : shown.length === 0 ? (
        <div className="empty-state">
          {all.length === 0 ? "Aucun membre visible pour l'instant." : "Personne dans cette catégorie."}
        </div>
      ) : (
        <div className="grid-cards">
          {shown.map((p) => {
            const avStyle = p.avatarUrl ? { backgroundImage: `url(${p.avatarUrl})` } : { background: gradientOf(p.avatarColor) };
            const bnStyle = p.bannerUrl ? { backgroundImage: `url(${p.bannerUrl})` } : undefined;
            return (
              <div className="card hoverable member-card" key={p.userId} onClick={() => setSelected(p)}>
                <div className="member-banner" style={bnStyle} />
                <div className="member-body">
                  <div className="av" style={avStyle}>{p.avatarUrl ? "" : initials(p.name)}</div>
                  <div className="member-top">
                    <div className="nm">{p.name}</div>
                    {p.role === "admin" && <span className="badge badge-admin">admin</span>}
                  </div>
                  <div className="hd">@{p.handle || p.name.toLowerCase().replace(/\s+/g, "")}</div>
                  <div className="st"><span className={`status-dot ${p.status}`} />{statusLabel(p.status)}{p.location ? ` · ${p.location}` : ""}</div>
                  {p.statusText && <div className="member-msg">« {p.statusText} »</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <Modal title="Profil" className="modal-wide" onClose={() => setSelected(null)}>
          <ProfileCard p={selected} />
        </Modal>
      )}
    </div>
  );
}
