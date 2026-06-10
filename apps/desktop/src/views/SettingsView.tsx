import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { getPrefs, setPrefs, type ThemeName } from "../lib/prefs";
import { formatDate } from "../lib/labels";
import { checkForAppUpdate, installAppUpdate, type AppUpdateState } from "../lib/updater";

interface ApiStat {
  online: boolean;
  version?: string;
  latencyMs?: number;
  checkedAt: string;
}

export function SettingsView() {
  const { user, logout } = useAuth();
  const [prefs, setPrefsState] = useState(getPrefs());
  const [stat, setStat] = useState<ApiStat | null>(null);
  const [checking, setChecking] = useState(false);
  const [appUpdate, setAppUpdate] = useState<AppUpdateState | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const update = (patch: Parameters<typeof setPrefs>[0]) => {
    setPrefsState(setPrefs(patch));
  };

  const checkApi = async () => {
    setChecking(true);
    const t0 = performance.now();
    try {
      const h = await api.health();
      setStat({
        online: true,
        version: h.version,
        latencyMs: Math.round(performance.now() - t0),
        checkedAt: new Date().toISOString(),
      });
    } catch {
      setStat({ online: false, checkedAt: new Date().toISOString() });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void checkApi();
  }, []);

  const checkUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    try {
      setAppUpdate(await checkForAppUpdate());
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Verification impossible.");
    } finally {
      setCheckingUpdate(false);
    }
  };

  const installUpdate = async () => {
    setInstallingUpdate(true);
    setUpdateError(null);
    try {
      await installAppUpdate(setUpdateProgress);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Installation impossible.");
      setInstallingUpdate(false);
    }
  };

  const themes: { id: ThemeName; label: string; swatch: string }[] = [
    { id: "sombre", label: "Sombre", swatch: "swatch-sombre" },
    { id: "blanc", label: "Blanc", swatch: "swatch-blanc" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Paramètres</h1>
        <p>Préférences de l'application et informations de compte.</p>
      </div>

      {/* Thème */}
      <div className="card settings-section">
        <div className="card-title">
          <h2>Mises a jour</h2>
          <button className="btn btn-ghost" onClick={checkUpdate} disabled={checkingUpdate || installingUpdate}>
            {checkingUpdate ? "Recherche..." : "Verifier"}
          </button>
        </div>
        {appUpdate?.available ? (
          <>
            <div className="kv"><span className="key">Version actuelle</span><span>{appUpdate.currentVersion ?? "0.1.0"}</span></div>
            <div className="kv"><span className="key">Version disponible</span><span>{appUpdate.version}</span></div>
            {appUpdate.date && (
              <div className="kv"><span className="key">Publication</span><span>{new Date(appUpdate.date).toLocaleDateString("fr-FR")}</span></div>
            )}
            {appUpdate.notes && <p className="text-secondary" style={{ marginTop: 12 }}>{appUpdate.notes}</p>}
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={installUpdate} disabled={installingUpdate}>
              {installingUpdate ? (updateProgress == null ? "Installation..." : `Installation ${updateProgress}%`) : "Installer et relancer"}
            </button>
          </>
        ) : (
          <p className="text-secondary">
            {appUpdate ? "Quantic est a jour." : "Verifiez les releases GitHub depuis l'application desktop."}
          </p>
        )}
        {updateError && <div className="error-banner" style={{ marginTop: 12 }}>{updateError}</div>}
      </div>

      <div className="card settings-section">
        <div className="card-title"><h2>Thème du dashboard</h2></div>
        <div className="theme-choices">
          {themes.map((t) => (
            <div
              key={t.id}
              className={`theme-tile ${prefs.theme === t.id ? "on" : ""}`}
              onClick={() => update({ theme: t.id })}
            >
              <div className={`theme-swatch ${t.swatch}`} />
              <div className="lbl">
                <span>{t.label}</span>
                {prefs.theme === t.id && <span style={{ color: "var(--accent-purple)" }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Météo */}
      <div className="card settings-section">
        <div className="card-title"><h2>Météo</h2></div>
        <div className="row between">
          <span className="text-secondary">Afficher la météo sur le dashboard</span>
          <div
            className={`toggle ${prefs.weatherEnabled ? "on" : ""}`}
            onClick={() => update({ weatherEnabled: !prefs.weatherEnabled })}
            role="switch"
            aria-checked={prefs.weatherEnabled}
          />
        </div>
        {prefs.weatherEnabled && (
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="wcity">Ville</label>
            <input
              id="wcity"
              className="input"
              style={{ maxWidth: 280 }}
              value={prefs.weatherCity}
              onChange={(e) => update({ weatherCity: e.target.value })}
              placeholder="ex. Paris"
            />
          </div>
        )}
      </div>

      {/* Stats API */}
      <div className="card settings-section">
        <div className="card-title">
          <h2>État de l'API</h2>
          <button className="btn btn-ghost" onClick={checkApi} disabled={checking}>
            {checking ? "Vérification…" : "Vérifier"}
          </button>
        </div>
        {stat ? (
          <>
            <div className="kv">
              <span className="key">Statut</span>
              <span className="row" style={{ gap: 8 }}>
                <span className={`dot ${stat.online ? "online" : "offline"}`} />
                {stat.online ? "En ligne" : "Hors ligne"}
              </span>
            </div>
            <div className="kv"><span className="key">Version</span><span>{stat.version ?? "—"}</span></div>
            <div className="kv"><span className="key">Latence</span><span>{stat.latencyMs != null ? `${stat.latencyMs} ms` : "—"}</span></div>
            <div className="kv">
              <span className="key">Dernière vérification</span>
              <span>{new Date(stat.checkedAt).toLocaleTimeString("fr-FR")}</span>
            </div>
          </>
        ) : (
          <div className="loading-state">Vérification…</div>
        )}
      </div>

      {/* Compte (lecture seule — le nom et l'identifiant se modifient dans Social › Mon profil) */}
      <div className="card settings-section">
        <div className="card-title"><h2>Compte</h2></div>
        <div className="kv"><span className="key">Nom</span><span>{user?.name}</span></div>
        <div className="kv"><span className="key">Email</span><span>{user?.email}</span></div>
        <div className="kv">
          <span className="key">Rôle</span>
          <span className={`badge ${user?.role === "admin" ? "badge-admin" : ""}`}>{user?.role}</span>
        </div>
        <div className="kv">
          <span className="key">Créé le</span>
          <span>{user ? formatDate(user.createdAt) : "—"}</span>
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={logout}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
