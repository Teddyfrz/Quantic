import { useEffect, useMemo, useState } from "react";
import type { TrackingEntry } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { Scale } from "../components/Scale";
import { Sparkline } from "../components/Sparkline";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function lastNDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

const SCALE_5 = ["Très bas", "Bas", "Moyen", "Bon", "Excellent"];
const STRESS_5 = ["Très calme", "Calme", "Moyen", "Tendu", "Très tendu"];

export function SuiviView() {
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [range, setRange] = useState(7);

  const [mental, setMental] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listTracking(30);
      setEntries(res.entries);
      const today = res.entries.find((e) => e.date === todayKey());
      setMental(today?.mental ?? null);
      setEnergy(today?.energy ?? null);
      setStress(today?.stress ?? null);
      setSleepHours(today?.sleepHours ?? null);
      setReflection(today?.reflection ?? "");
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.upsertTracking({ date: todayKey(), mental, energy, stress, sleepHours, reflection: reflection.trim() || null });
      setSaved(true);
      await load();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const days = useMemo(() => lastNDays(range), [range]);
  const byDate = useMemo(() => {
    const m = new Map<string, TrackingEntry>();
    for (const e of entries) m.set(e.date, e);
    return m;
  }, [entries]);
  const series = (key: "mental" | "energy" | "stress" | "sleepHours") => days.map((d) => byDate.get(d)?.[key] ?? null);
  const avg = (vals: (number | null)[]) => {
    const p = vals.filter((v): v is number => v !== null);
    return p.length ? Math.round((p.reduce((a, b) => a + b, 0) / p.length) * 10) / 10 : null;
  };
  const last = (vals: (number | null)[]) => [...vals].reverse().find((v) => v !== null) ?? null;

  const dateLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const adjustSleep = (delta: number) =>
    setSleepHours((s) => Math.max(0, Math.min(24, Math.round(((s ?? 0) + delta) * 2) / 2)));

  const trends: { key: "mental" | "energy" | "stress" | "sleepHours"; label: string; max: number; unit?: string; accent?: boolean }[] = [
    { key: "mental", label: "Mental", max: 5, accent: true },
    { key: "energy", label: "Énergie", max: 5, accent: true },
    { key: "stress", label: "Stress", max: 5 },
    { key: "sleepHours", label: "Sommeil", max: 12, unit: " h", accent: true },
  ];

  return (
    <div>
      <div className="dash-hero">
        <div>
          <h1>Suivi</h1>
          <div className="date">{dateLabel}</div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="wellness-grid">
        {/* Entrée du jour */}
        <div className="card">
          <div className="card-title">
            <h2>Comment ça va aujourd'hui ?</h2>
            {saved && <span className="text-muted">Enregistré ✓</span>}
          </div>

          <div className="metric">
            <div className="metric-head">
              <span className="ml">Mental</span>
              <span className="mv">{mental ? SCALE_5[mental - 1] : "—"}</span>
            </div>
            <Scale value={mental} onChange={setMental} />
          </div>
          <div className="metric">
            <div className="metric-head">
              <span className="ml">Énergie</span>
              <span className="mv">{energy ? SCALE_5[energy - 1] : "—"}</span>
            </div>
            <Scale value={energy} onChange={setEnergy} />
          </div>
          <div className="metric">
            <div className="metric-head">
              <span className="ml">Stress</span>
              <span className="mv">{stress ? STRESS_5[stress - 1] : "—"}</span>
            </div>
            <Scale value={stress} onChange={setStress} />
          </div>
          <div className="metric">
            <div className="metric-head">
              <span className="ml">Sommeil</span>
              <span className="mv">cette nuit</span>
            </div>
            <div className="stepper">
              <button type="button" onClick={() => adjustSleep(-0.5)} aria-label="Moins">−</button>
              <span className="val">{sleepHours != null ? <>{sleepHours}<small> h</small></> : <small>—</small>}</span>
              <button type="button" onClick={() => adjustSleep(0.5)} aria-label="Plus">+</button>
            </div>
          </div>
          <div className="metric">
            <div className="metric-head"><span className="ml">Réflexion libre</span></div>
            <textarea className="textarea full" value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Ce que vous avez en tête…" />
          </div>

          <button className="btn btn-primary" onClick={save} disabled={busy} style={{ marginTop: 16 }}>
            {busy ? "Enregistrement…" : "Enregistrer ma journée"}
          </button>
        </div>

        {/* Tendances */}
        <div className="card">
          <div className="card-title">
            <h2>Tendances</h2>
            <div className="seg">
              {[7, 14, 30].map((n) => (
                <button key={n} className={range === n ? "on" : ""} onClick={() => setRange(n)}>{n} j</button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="loading-state">Chargement…</div>
          ) : entries.length === 0 ? (
            <div className="empty-state" style={{ padding: "28px 0" }}>
              Pas encore de données. Votre première entrée lancera la tendance.
            </div>
          ) : (
            trends.map((t) => {
              const vals = series(t.key);
              const cur = last(vals);
              const a = avg(vals);
              return (
                <div className="trend-card" key={t.key}>
                  <div className="th">
                    <span className="tl">{t.label}</span>
                    <span className="tnow">{cur != null ? <>{cur}<small>{t.unit ?? ` / ${t.max}`}</small></> : "—"}</span>
                  </div>
                  <Sparkline values={vals} domain={[0, t.max]} accent={t.accent} />
                  <div className="tavg">Moyenne {range} j : {a != null ? `${a}${t.unit ?? ` / ${t.max}`}` : "—"}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
