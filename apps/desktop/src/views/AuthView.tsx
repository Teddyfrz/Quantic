import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { ApiException } from "../lib/api";
import { Logo } from "../components/Logo";

type Mode = "login" | "register";

/* Icônes (jeu cohérent, stroke 1.6) */
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
  </svg>
);
const IconKey = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="8" cy="15" r="4" />
    <path d="m10.8 12.2 8.2-8.2M16 5l3 3M14 7l3 3" />
  </svg>
);
const IconBriefcase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const IconNote = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M5 3h11l3 3v15H5z" />
    <path d="M9 9h6M9 13h6M9 17h4" />
  </svg>
);
const IconPulse = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 12h4l2 6 4-14 2 8h6" />
  </svg>
);
const IconArrow = () => (
  <svg className="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const FEATURES: { icon: ReactNode; title: string; desc: string }[] = [
  { icon: <IconBriefcase />, title: "Projets et tâches", desc: "Structure ton travail et avance sereinement." },
  { icon: <IconNote />, title: "Notes connectées", desc: "Relie tes idées, tes ressources, tes projets." },
  { icon: <IconPulse />, title: "Équilibre personnel", desc: "Suivi, santé et finances au même endroit." },
];

export function AuthView() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [stayConnected, setStayConnected] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password, code);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  return (
    <div className="auth-split">
      {/* Volet gauche */}
      <section className="auth-hero">
        <div className="auth-logo">
          <Logo className="mark" size={64} />
          <span className="word">QUANTIC</span>
        </div>
        <h1>
          Ton espace.
          <br />
          Ta clarté. Tes projets.
        </h1>
        <p className="lede">
          Une application pour organiser ton travail, tes idées et ton équilibre personnel.
        </p>
        <div className="auth-features">
          {FEATURES.map((f) => (
            <div className="auth-feature" key={f.title}>
              <span className="ico">{f.icon}</span>
              <div>
                <div className="ft">{f.title}</div>
                <div className="fd">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Volet droit : carte */}
      <section className="auth-panel">
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === "login" ? "on" : ""}`} onClick={() => switchMode("login")}>
            Connexion
          </button>
          <button className={`auth-tab ${mode === "register" ? "on" : ""}`} onClick={() => switchMode("register")}>
            Créer un compte
          </button>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="name">Nom ou pseudo</label>
              <div className="auth-input-wrap">
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton nom" required />
                <span className="ico"><IconUser /></span>
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <div className="auth-input-wrap">
              <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" required />
              <span className="ico"><IconMail /></span>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password">Mot de passe</label>
            <div className="auth-input-wrap">
              <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? "8 caractères minimum" : "••••••••"} required />
              <span className="ico"><IconLock /></span>
            </div>
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="code">Code d'invitation</label>
              <div className="auth-input-wrap">
                <input id="code" className="input mono" value={code} onChange={(e) => setCode(e.target.value.trim())} placeholder="QNT-XXXXXXXX" required />
                <span className="ico"><IconKey /></span>
              </div>
            </div>
          )}

          {mode === "login" && (
            <div className="auth-row">
              <label className="auth-check">
                <input type="checkbox" checked={stayConnected} onChange={(e) => setStayConnected(e.target.checked)} />
                Rester connecté
              </label>
              <button
                type="button"
                className="auth-link"
                onClick={() => setInfo("Contacte un administrateur pour réinitialiser ton mot de passe.")}
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {info && <div className="alert">{info}</div>}

          <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>
            {busy ? "Patiente…" : mode === "login" ? "Se connecter" : "Créer le compte"}
            {!busy && <IconArrow />}
          </button>
        </form>

        <p className="auth-legal">
          En continuant, tu acceptes nos <b>Conditions d'utilisation</b> et notre{" "}
          <b>Politique de confidentialité</b>.
        </p>
      </section>
    </div>
  );
}
