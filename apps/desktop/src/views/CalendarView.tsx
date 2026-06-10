import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent, Project, Task } from "@quantic/shared";
import { api, ApiException } from "../lib/api";
import { EventEditModal } from "../components/EventEditModal";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Clé jour en UTC (cohérent avec le stockage à 00:00 UTC).
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function isoKey(iso: string): string {
  return iso.slice(0, 10);
}

export function CalendarView() {
  // Mois affiché (1er du mois, en UTC).
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [creatingDate, setCreatingDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // 6 semaines à partir du lundi précédant le 1er du mois.
  const cells = useMemo(() => {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const first = new Date(Date.UTC(year, month, 1));
    const weekday = (first.getUTCDay() + 6) % 7; // 0 = lundi
    const start = new Date(first);
    start.setUTCDate(first.getUTCDate() - weekday);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return d;
    });
  }, [cursor]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const from = cells[0].toISOString();
      const to = new Date(cells[cells.length - 1]);
      to.setUTCHours(23, 59, 59);
      const [ev, tk, pr] = await Promise.all([
        api.listEvents({ from, to: to.toISOString() }),
        api.listTasks(),
        api.listProjects(),
      ]);
      setEvents(ev.events);
      setTasks(tk.tasks);
      setProjects(pr.projects);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const k = isoKey(e.startAt);
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
    }
    return map;
  }, [events]);

  const deadlinesByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate || t.status === "done") continue;
      const k = isoKey(t.dueDate);
      (map.get(k) ?? map.set(k, []).get(k)!).push(t);
    }
    return map;
  }, [tasks]);

  const monthLabel = cursor.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const todayKey = dayKey(new Date());
  const currentMonth = cursor.getUTCMonth();

  const move = (delta: number) =>
    setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + delta, 1)));

  return (
    <div>
      <div className="page-header">
        <div className="row between">
          <div>
            <h1>Calendrier</h1>
            <p>Vos événements et échéances.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setCreatingDate(todayKey)}>
            Nouvel événement
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="card">
        <div className="cal-head">
          <span className="month">{monthLabel}</span>
          <div className="cal-nav">
            <button className="btn btn-ghost" onClick={() => move(-1)}>←</button>
            <button
              className="btn btn-ghost"
              onClick={() => setCursor(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)))}
            >
              Aujourd'hui
            </button>
            <button className="btn btn-ghost" onClick={() => move(1)}>→</button>
          </div>
        </div>

        <div className="cal-weekdays">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {loading ? (
          <div className="loading-state">Chargement…</div>
        ) : (
          <div className="cal-grid">
            {cells.map((d) => {
              const k = dayKey(d);
              const dayEvents = eventsByDay.get(k) ?? [];
              const dayDeadlines = deadlinesByDay.get(k) ?? [];
              const items = [
                ...dayEvents.map((e) => ({ kind: "event" as const, e })),
                ...dayDeadlines.map((t) => ({ kind: "deadline" as const, t })),
              ];
              return (
                <div
                  key={k}
                  className={`cal-cell ${d.getUTCMonth() !== currentMonth ? "dim" : ""} ${k === todayKey ? "today" : ""}`}
                  onClick={() => setCreatingDate(k)}
                >
                  <div className="num">{d.getUTCDate()}</div>
                  {items.slice(0, 3).map((it, idx) =>
                    it.kind === "event" ? (
                      <div
                        key={it.e.id}
                        className="cal-event"
                        title={it.e.title}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setEditingEvent(it.e);
                        }}
                      >
                        {it.e.title}
                      </div>
                    ) : (
                      <div key={`d-${it.t.id}-${idx}`} className="cal-event deadline" title={`Échéance : ${it.t.title}`}>
                        ⚑ {it.t.title}
                      </div>
                    )
                  )}
                  {items.length > 3 && <div className="cal-more">+{items.length - 3}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(creatingDate || editingEvent) && (
        <EventEditModal
          event={editingEvent}
          projects={projects}
          defaultDate={creatingDate ?? undefined}
          onClose={() => {
            setCreatingDate(null);
            setEditingEvent(null);
          }}
          onSaved={() => {
            setCreatingDate(null);
            setEditingEvent(null);
            void load();
          }}
          onDeleted={() => {
            setEditingEvent(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
