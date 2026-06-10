import { useEffect, useState, type FormEvent } from "react";
import type { Project, Task, Note, CalendarEvent } from "@quantic/shared";
import { useAuth } from "../lib/auth";
import { api, ApiException } from "../lib/api";
import { TASK_STATUS_LABEL, formatDate } from "../lib/labels";
import { getPrefs } from "../lib/prefs";
import { fetchWeather, type Weather } from "../lib/weather";
import { ProgressRing } from "../components/ProgressRing";

function greeting(h: number): string {
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function WeatherIcon({ code }: { code: number }) {
  const p = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (code === 0 || code === 1)
    return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>;
  if (code >= 51 && code <= 82)
    return <svg {...p}><path d="M7 16a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1.5A3.5 3.5 0 0 1 17 16z" /><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2" /></svg>;
  if (code >= 71 && code <= 75)
    return <svg {...p}><path d="M7 16a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1.5A3.5 3.5 0 0 1 17 16z" /><path d="M9 20h.01M12 21h.01M15 20h.01" /></svg>;
  return <svg {...p}><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1.5A3.5 3.5 0 0 1 17 18z" /></svg>;
}

const IconCheck = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>);
const IconFlow = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 12h4l2 6 4-14 2 8h6" /></svg>);
const IconFolder = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
const IconDoc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 3h11l3 3v15H5z" /><path d="M9 9h6M9 13h6" /></svg>);

interface Upcoming {
  id: string;
  title: string;
  date: string; // iso
  kind: "event" | "deadline";
}

export function DashboardView() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const prefs = getPrefs();
    if (prefs.weatherEnabled && prefs.weatherCity.trim()) {
      fetchWeather(prefs.weatherCity.trim()).then(setWeather).catch(() => setWeather(null));
    }
  }, []);

  const reload = () => {
    const from = new Date().toISOString();
    return Promise.all([api.listProjects(), api.listTasks(), api.listNotes({ limit: 4 }), api.listEvents({ from })])
      .then(([p, t, n, e]) => {
        setProjects(p.projects);
        setTasks(t.tasks);
        setNotes(n.notes);
        setEvents(e.events);
      })
      .catch((err) => setError(err instanceof ApiException ? err.message : "Chargement impossible."));
  };

  useEffect(() => {
    void reload();
  }, []);

  const [quickTitle, setQuickTitle] = useState("");
  const completeTask = async (id: string) => {
    await api.updateTask(id, { status: "done" });
    await reload();
  };
  const quickAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    await api.createTask({ title: quickTitle.trim() });
    setQuickTitle("");
    await reload();
  };

  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const clock = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const Header = (
    <div className="dash-hero">
      <div>
        <h1>{greeting(now.getHours())}, {user?.name}</h1>
        <div className="date">{dateLabel}</div>
      </div>
      <div className="now">
        {weather && (
          <div className="weather-chip">
            <span className="wx-ico"><WeatherIcon code={weather.code} /></span>
            <span className="wx-temp">{weather.temperature}°</span>
            <span className="wx-meta">
              <div className="wx-city">{weather.city}</div>
              <div className="wx-label">{weather.label}</div>
            </span>
          </div>
        )}
        <div className="clock">{clock}</div>
      </div>
    </div>
  );

  if (error) return <div>{Header}<div className="alert alert-error">{error}</div></div>;
  if (projects === null || tasks === null) return <div>{Header}<div className="loading-state">Chargement…</div></div>;

  const openTasks = tasks.filter((t) => t.status !== "done");
  const doingTasks = tasks.filter((t) => t.status === "doing");
  const activeProjects = projects.filter((p) => p.status === "active");
  const todays = [...openTasks]
    .sort((a, b) => (b.status === "doing" ? 1 : 0) - (a.status === "doing" ? 1 : 0))
    .slice(0, 7);
  const activeProject = activeProjects[0] ?? projects[0] ?? null;
  const projectName = (id: string | null) => (id ? projects.find((p) => p.id === id)?.name ?? null : null);

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming: Upcoming[] = [
    ...events.map((e) => ({ id: `e-${e.id}`, title: e.title, date: e.startAt, kind: "event" as const })),
    ...tasks
      .filter((t) => t.dueDate && t.status !== "done" && t.dueDate.slice(0, 10) >= todayKey)
      .map((t) => ({ id: `t-${t.id}`, title: t.title, date: t.dueDate as string, kind: "deadline" as const })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const kpis = [
    { label: "Tâches ouvertes", value: String(openTasks.length), icon: <IconCheck /> },
    { label: "En cours", value: String(doingTasks.length), icon: <IconFlow /> },
    { label: "Projets actifs", value: String(activeProjects.length), icon: <IconFolder /> },
    { label: "Notes", value: String(notes.length), icon: <IconDoc /> },
  ];

  return (
    <div>
      {Header}

      <div className="kpi-strip">
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <span className="kpi-ico">{k.icon}</span>
            <div className="label">{k.label}</div>
            <div className="num">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bento">
        <div className="col-left">
          {/* Aujourd'hui */}
          <div className="card tile-today">
            <div className="card-title">
              <h2>Aujourd'hui</h2>
              <span className="text-muted">{openTasks.length} à traiter</span>
            </div>
            <form className="inline-add" onSubmit={quickAdd} style={{ marginBottom: 14 }}>
              <input className="input" placeholder="Ajouter une tâche rapide…" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} />
              <button className="btn btn-ghost" type="submit" disabled={!quickTitle.trim()}>+</button>
            </form>
            {todays.length === 0 ? (
              <div className="empty-state" style={{ padding: "24px 0" }}>Rien à faire. Profitez-en.</div>
            ) : (
              <div className="dash-list">
                {todays.map((t) => (
                  <div className="dash-task" key={t.id}>
                    <button className="task-check" title="Marquer terminé" onClick={() => completeTask(t.id)} />
                    {t.priority && <span className={`prio ${t.priority}`} />}
                    <span className="grow">{t.title}</span>
                    <span className="tag">
                      {projectName(t.projectId) ? `${projectName(t.projectId)} · ` : ""}
                      {TASK_STATUS_LABEL[t.status]}
                      {t.dueDate ? ` · ${formatDate(t.dueDate)}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* À venir */}
          <div className="card">
            <div className="card-title"><h2>À venir</h2></div>
            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: "24px 0" }}>Aucune échéance à l'horizon.</div>
            ) : (
              <div>
                {upcoming.map((u) => {
                  const d = new Date(u.date);
                  return (
                    <div className="up-item" key={u.id}>
                      <span className={`up-bar ${u.kind}`} />
                      <span className="up-date">
                        <div className="d">{d.getUTCDate()}</div>
                        <div className="m">{d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}</div>
                      </span>
                      <span className="up-body">
                        <div className="up-title">{u.title}</div>
                        <div className="up-kind">{u.kind === "event" ? "Événement" : "Échéance"}</div>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="col-right">
          {/* Projet actif avec anneau */}
          <div className="card">
            <div className="card-title"><h2>Projet actif</h2></div>
            {activeProject ? (
              <div className="tile-project">
                <ProgressRing value={activeProject.progress} />
                <div className="meta">
                  <div className="pname">{activeProject.name}</div>
                  <div className="pstat">{activeProject.description || "Sans description."}</div>
                  <div className="pcount">{activeProject.doneCount} / {activeProject.taskCount} tâches terminées</div>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "24px 0" }}>Aucun projet pour l'instant.</div>
            )}
          </div>

          {/* Notes récentes */}
          <div className="card">
            <div className="card-title"><h2>Notes récentes</h2></div>
            {notes.length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>Aucune note pour l'instant.</div>
            ) : (
              <div className="dash-list">
                {notes.map((n) => (
                  <div className="dash-task" key={n.id}>
                    <span>{n.title}</span>
                    <span className="tag">{formatDate(n.updatedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
