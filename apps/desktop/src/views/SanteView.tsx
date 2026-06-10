import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { HealthEntry, SportSession, SportIntensity } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { Sparkline } from "../components/Sparkline";
import { ProgressRing } from "../components/ProgressRing";
import { formatDate } from "../lib/labels";

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

const INTENSITY_LABEL: Record<SportIntensity, string> = { low: "Faible", medium: "Modérée", high: "Intense" };
const IconDumbbell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M6.5 6.5l11 11M4 8l-1 1 2 2 1-1M16 20l1-1-2-2-1 1M8 4 7 5l2 2 1-1M20 16l-1 1-2-2 1-1" /></svg>
);

export function SanteView() {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [sessions, setSessions] = useState<SportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [range, setRange] = useState(30);

  const [weight, setWeight] = useState("");
  const [water, setWater] = useState<number | null>(null);
  const [waterGoal, setWaterGoal] = useState("");
  const [bodyFeeling, setBodyFeeling] = useState("");
  const [busy, setBusy] = useState(false);

  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState<SportIntensity | "">("");
  const [sportBusy, setSportBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, s] = await Promise.all([api.listHealth(30), api.listSport(30)]);
      setEntries(h.entries);
      setSessions(s.sessions);
      const today = h.entries.find((e) => e.date === todayKey());
      setWeight(today?.weight != null ? String(today.weight) : "");
      setWater(today?.water ?? null);
      setWaterGoal(today?.waterGoal != null ? String(today.waterGoal) : "");
      setBodyFeeling(today?.bodyFeeling ?? "");
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveEntry = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.upsertHealth({
        date: todayKey(),
        weight: weight.trim() === "" ? null : Number(weight),
        water,
        waterGoal: waterGoal.trim() === "" ? null : Number(waterGoal),
        bodyFeeling: bodyFeeling.trim() || null,
      });
      setSaved(true);
      await load();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const addSport = async (e: FormEvent) => {
    e.preventDefault();
    if (!activity.trim() || !duration) return;
    setSportBusy(true);
    setError(null);
    try {
      await api.createSport({ date: todayKey(), activity: activity.trim(), durationMin: Number(duration), intensity: intensity || null });
      setActivity(""); setDuration(""); setIntensity("");
      await load();
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Ajout impossible.");
    } finally {
      setSportBusy(false);
    }
  };

  const removeSport = async (id: string) => { await api.deleteSport(id); await load(); };

  const days = useMemo(() => lastNDays(range), [range]);
  const byDate = useMemo(() => {
    const m = new Map<string, HealthEntry>();
    for (const e of entries) m.set(e.date, e);
    return m;
  }, [entries]);

  const weightSeries = days.map((d) => byDate.get(d)?.weight ?? null);
  const waterSeries = days.map((d) => byDate.get(d)?.water ?? null);
  const presentWeights = entries.filter((e) => e.weight != null).map((e) => e.weight as number);
  const latestWeight = entries.filter((e) => e.weight != null).at(-1)?.weight ?? null;
  const firstWeight = presentWeights[0] ?? null;
  const weightDelta = latestWeight != null && firstWeight != null ? Math.round((latestWeight - firstWeight) * 10) / 10 : null;

  const todayEntry = byDate.get(todayKey());
  const waterToday = todayEntry?.water ?? water ?? 0;
  const goalToday = todayEntry?.waterGoal ?? (waterGoal ? Number(waterGoal) : null);
  const waterPct = goalToday ? Math.min((Number(waterToday) / goalToday) * 100, 100) : 0;
  const totalMinutes = sessions.reduce((a, s) => a + s.durationMin, 0);

  const adjustWater = (delta: number) => setWater((w) => Math.max(0, (w ?? 0) + delta));

  return (
    <div>
      <div className="dash-hero">
        <div>
          <h1>Santé</h1>
          <div className="date">Poids, hydratation, activité — sans pression.</div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      {/* KPIs */}
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="k">Poids actuel</div>
          <div className="v">{latestWeight != null ? <>{latestWeight}<small> kg</small></> : "—"}</div>
          {weightDelta != null && weightDelta !== 0 && (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              {weightDelta > 0 ? "▲ +" : "▼ "}{weightDelta} kg sur {range} j
            </div>
          )}
        </div>
        <div className="stat">
          <div className="k">Hydratation du jour</div>
          <div className="water-ring" style={{ marginTop: 8 }}>
            <ProgressRing value={waterPct} size={64} stroke={7} />
            <div className="wr-meta">
              <div className="wr-now">{waterToday} ml</div>
              <div className="wr-goal">objectif {goalToday ?? "—"} ml</div>
            </div>
          </div>
        </div>
        <div className="stat">
          <div className="k">Activité (30 j)</div>
          <div className="v">{sessions.length}<small> séances</small></div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{totalMinutes} min au total</div>
        </div>
      </div>

      <div className="wellness-grid">
        {/* Entrée du jour */}
        <div className="card">
          <div className="card-title">
            <h2>Aujourd'hui</h2>
            {saved && <span className="text-muted">Enregistré ✓</span>}
          </div>

          <div className="metric">
            <div className="metric-head"><span className="ml">Poids</span><span className="mv">kg</span></div>
            <input className="input" type="number" step={0.1} style={{ width: 140 }} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ex. 72.4" />
          </div>

          <div className="metric">
            <div className="metric-head"><span className="ml">Hydratation</span><span className="mv">{waterToday} ml</span></div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <div className="stepper">
                <button type="button" onClick={() => adjustWater(-250)}>−</button>
                <span className="val">{water ?? 0}<small> ml</small></span>
                <button type="button" onClick={() => adjustWater(250)}>+</button>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => adjustWater(250)}>+1 verre</button>
            </div>
            <div className="metric-hint">
              <input className="input" type="number" step={50} style={{ width: 160 }} value={waterGoal} onChange={(e) => setWaterGoal(e.target.value)} placeholder="Objectif (ml), ex. 2000" />
            </div>
          </div>

          <div className="metric">
            <div className="metric-head"><span className="ml">Ressenti corporel</span></div>
            <textarea className="textarea full" value={bodyFeeling} onChange={(e) => setBodyFeeling(e.target.value)} placeholder="Comment se sent votre corps aujourd'hui ?" />
          </div>

          <button className="btn btn-primary" onClick={saveEntry} disabled={busy} style={{ marginTop: 16 }}>
            {busy ? "Enregistrement…" : "Enregistrer"}
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
            <div className="empty-state" style={{ padding: "28px 0" }}>Pas encore de données.</div>
          ) : (
            <>
              <div className="trend-card">
                <div className="th">
                  <span className="tl">Poids</span>
                  <span className="tnow">{latestWeight != null ? <>{latestWeight}<small> kg</small></> : "—"}</span>
                </div>
                <Sparkline values={weightSeries} accent />
              </div>
              <div className="trend-card">
                <div className="th">
                  <span className="tl">Hydratation</span>
                  <span className="tnow">{waterToday}<small> ml</small></span>
                </div>
                <Sparkline values={waterSeries} domain={[0, goalToday ?? 2500]} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sport */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-title"><h2>Sport</h2></div>
        <form className="row" onSubmit={addSport} style={{ gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <input className="input" style={{ flex: 2, minWidth: 160 }} placeholder="Activité (course, vélo…)" value={activity} onChange={(e) => setActivity(e.target.value)} />
          <input className="input" style={{ width: 130 }} type="number" min={1} placeholder="Durée (min)" value={duration} onChange={(e) => setDuration(e.target.value)} />
          <select className="select" value={intensity} onChange={(e) => setIntensity(e.target.value as SportIntensity | "")}>
            <option value="">Intensité</option>
            <option value="low">Faible</option>
            <option value="medium">Modérée</option>
            <option value="high">Intense</option>
          </select>
          <button className="btn btn-primary" type="submit" disabled={sportBusy || !activity.trim() || !duration}>Ajouter</button>
        </form>

        {sessions.length === 0 ? (
          <div className="empty-state" style={{ padding: "20px 0" }}>Aucune séance enregistrée.</div>
        ) : (
          <div>
            {sessions.map((s) => (
              <div className="session" key={s.id}>
                <span className="si"><IconDumbbell /></span>
                <div>
                  <div className="sa">{s.activity}</div>
                  <div className="sd">{formatDate(s.date)} · {s.durationMin} min</div>
                </div>
                <div className="sx">
                  {s.intensity && (
                    <span className="text-muted" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span className={`intensity-dot ${s.intensity}`} />{INTENSITY_LABEL[s.intensity]}
                    </span>
                  )}
                  <button className="btn btn-ghost" onClick={() => removeSport(s.id)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
