import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./lib/auth";
import { api } from "./lib/api";
import { AuthView } from "./views/AuthView";
import { DashboardView } from "./views/DashboardView";
import { AdminView } from "./views/AdminView";
import { ProjectsView } from "./views/ProjectsView";
import { TasksView } from "./views/TasksView";
import { NotesView } from "./views/NotesView";
import { KnowledgeView } from "./views/KnowledgeView";
import { CalendarView } from "./views/CalendarView";
import { ContactsView } from "./views/ContactsView";
import { SuiviView } from "./views/SuiviView";
import { SanteView } from "./views/SanteView";
import { FinanceView } from "./views/FinanceView";
import { SettingsView } from "./views/SettingsView";
import { SocialView } from "./views/SocialView";
import { Logo } from "./components/Logo";
import { NavIcon } from "./components/NavIcons";
import { CommandPalette, type CmdView } from "./components/CommandPalette";
import { Reminders } from "./components/Reminders";
import { getPrefs, setPrefs } from "./lib/prefs";

export interface ApplySearch { query: string; nonce: number }

type View =
  | "dashboard"
  | "projects"
  | "tasks"
  | "calendar"
  | "notes"
  | "knowledge"
  | "contacts"
  | "suivi"
  | "sante"
  | "finance"
  | "social"
  | "settings"
  | "admin";

interface NavEntry {
  id: View;
  label: string;
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#cbb8ff,#9b7cff)",
  "linear-gradient(135deg,#9fd0ff,#5f8ad9)",
  "linear-gradient(135deg,#a0e0c0,#5fd08a)",
  "linear-gradient(135deg,#ffd29f,#d98a5f)",
  "linear-gradient(135deg,#ffb4c6,#e06a8b)",
  "linear-gradient(135deg,#cfd4dc,#8b93a1)",
];
const initials = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const MAIN_NAV: NavEntry[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "projects", label: "Projets" },
  { id: "tasks", label: "Tâches" },
  { id: "calendar", label: "Calendrier" },
  { id: "notes", label: "Notes" },
  { id: "knowledge", label: "Base de connaissances" },
  { id: "contacts", label: "Contacts" },
];
const PERSO_NAV: NavEntry[] = [
  { id: "suivi", label: "Suivi" },
  { id: "sante", label: "Santé" },
  { id: "finance", label: "Finance" },
];

export function App() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [collapsed, setCollapsed] = useState(getPrefs().sidebarCollapsed);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatar, setAvatar] = useState<{ url: string | null; color: string }>({ url: null, color: "0" });
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{ view: CmdView; query: string; nonce: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    api.myProfile()
      .then(({ profile }) => setAvatar({ url: profile.avatarUrl, color: profile.avatarColor }))
      .catch(() => undefined);
  }, [user]);

  // Raccourci ⌘K / Ctrl+K pour la recherche globale.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigateFromSearch = (target: CmdView, query: string) => {
    setView(target);
    setPendingSearch({ view: target, query, nonce: Date.now() });
  };

  const applyFor = (v: View): ApplySearch | undefined =>
    pendingSearch && pendingSearch.view === v ? { query: pendingSearch.query, nonce: pendingSearch.nonce } : undefined;

  const renderView = (): ReactNode => {
    switch (view) {
      case "dashboard": return <DashboardView />;
      case "projects": return <ProjectsView applySearch={applyFor("projects")} />;
      case "tasks": return <TasksView applySearch={applyFor("tasks")} />;
      case "calendar": return <CalendarView />;
      case "notes": return <NotesView applySearch={applyFor("notes")} />;
      case "knowledge": return <KnowledgeView applySearch={applyFor("knowledge")} />;
      case "contacts": return <ContactsView applySearch={applyFor("contacts")} />;
      case "suivi": return <SuiviView />;
      case "sante": return <SanteView />;
      case "finance": return <FinanceView />;
      case "social": return <SocialView />;
      case "settings": return <SettingsView />;
      case "admin": return user?.role === "admin" ? <AdminView /> : <DashboardView />;
    }
  };

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    setPrefs({ sidebarCollapsed: next });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }} className="text-muted">
        Chargement…
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const NavButton = ({ id, label }: NavEntry) => (
    <button
      className={`nav-item ${view === id ? "active" : ""}`}
      onClick={() => setView(id)}
      title={collapsed ? label : undefined}
    >
      <span className="nav-ico">{NavIcon[id]}</span>
      <span className="nav-label">{label}</span>
    </button>
  );

  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <Logo className="mark" size={28} />
          <span className="nav-label">QUANTIC</span>
          <button className="collapse-btn" onClick={toggleSidebar} title={collapsed ? "Déployer" : "Réduire"} aria-label="Réduire le menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
            </svg>
          </button>
        </div>

        <nav className="nav-list">
          <button className="nav-item" onClick={() => setCmdkOpen(true)} title={collapsed ? "Rechercher (⌘K)" : undefined}>
            <span className="nav-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
            <span className="nav-label">Rechercher</span>
            <span className="nav-label" style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "1px 6px" }}>⌘K</span>
          </button>

          {MAIN_NAV.map((e) => <NavButton key={e.id} {...e} />)}

          <div className="nav-section"><span className="nav-label">Personnel</span></div>
          {PERSO_NAV.map((e) => <NavButton key={e.id} {...e} />)}

          {user.role === "admin" && (
            <>
              <div className="nav-section"><span className="nav-label">Administration</span></div>
              <NavButton id="admin" label="Panel admin" />
            </>
          )}
        </nav>

        <div className="spacer" />

        <Reminders collapsed={collapsed} />
        <NavButton id="social" label="Social" />

        {/* Menu compte */}
        <div className="user-area">
          <button className={`user-chip ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen((v) => !v)} title={collapsed ? user.name : undefined}>
            <span className="uc-av" style={avatar.url ? { backgroundImage: `url(${avatar.url})` } : { background: AVATAR_GRADIENTS[Number(avatar.color) || 0] }}>
              {avatar.url ? "" : initials(user.name)}
            </span>
            <span className="nav-label" style={{ minWidth: 0, flex: 1 }}>
              <span className="uc-name"><span>{user.name}</span>{user.role === "admin" && <span className="badge badge-admin">admin</span>}</span>
              <span className="uc-mail" style={{ display: "block" }}>{user.email}</span>
            </span>
            <span className="uc-chevron nav-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="user-menu">
                <div className="mu-head">
                  <div className="n">{user.name}{user.role === "admin" && <span className="badge badge-admin">admin</span>}</div>
                  <div className="e">{user.email}</div>
                </div>
                <button onClick={() => { setView("settings"); setMenuOpen(false); }}>
                  <span className="nav-ico">{NavIcon.settings}</span> Paramètres
                </button>
                <div className="mu-sep" />
                <button className="danger" onClick={logout}>
                  <span className="nav-ico">{NavIcon.logout}</span> Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      <main className="main">
        <div key={view} className="view-anim">
          {renderView()}
        </div>
      </main>

      {cmdkOpen && (
        <CommandPalette onClose={() => setCmdkOpen(false)} onNavigate={navigateFromSearch} />
      )}
    </div>
  );
}
