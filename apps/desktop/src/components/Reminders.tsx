import { useEffect, useState } from "react";
import type { Task, CalendarEvent } from "@quantic/shared";
import { api } from "../lib/api";
import { formatDate } from "../lib/labels";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Item { id: string; title: string; tag: string; overdue?: boolean }

export function Reminders({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const load = () => {
    const from = new Date().toISOString();
    Promise.all([api.listTasks(), api.listEvents({ from })])
      .then(([t, e]) => { setTasks(t.tasks); setEvents(e.events); })
      .catch(() => undefined);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  const tk = todayKey();
  const overdue: Item[] = tasks
    .filter((t) => t.dueDate && t.status !== "done" && t.dueDate.slice(0, 10) < tk)
    .map((t) => ({ id: `o-${t.id}`, title: t.title, tag: `En retard · ${formatDate(t.dueDate!)}`, overdue: true }));
  const dueToday: Item[] = tasks
    .filter((t) => t.dueDate && t.status !== "done" && t.dueDate.slice(0, 10) === tk)
    .map((t) => ({ id: `d-${t.id}`, title: t.title, tag: "Échéance aujourd'hui" }));
  const todayEvents: Item[] = events
    .filter((e) => e.startAt.slice(0, 10) === tk)
    .map((e) => ({ id: `e-${e.id}`, title: e.title, tag: "Événement aujourd'hui" }));

  const items = [...overdue, ...dueToday, ...todayEvents];
  const count = items.length;

  return (
    <div className="user-area">
      <button className="nav-item bell-btn" onClick={() => setOpen((v) => !v)} title={collapsed ? "Rappels" : undefined}>
        <span className="nav-ico">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        </span>
        <span className="nav-label">Rappels</span>
        {count > 0 && <span className="bell-dot">{count}</span>}
      </button>

      {open && (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <div className="reminders">
            {count === 0 ? (
              <div className="rh" style={{ padding: 14, textTransform: "none", letterSpacing: 0, fontSize: 13 }}>
                Rien d'urgent. Tout est sous contrôle.
              </div>
            ) : (
              <>
                <div className="rh">À traiter ({count})</div>
                {items.map((it) => (
                  <div className={`rem-item ${it.overdue ? "overdue" : ""}`} key={it.id}>
                    <span className="rt">{it.title}</span>
                    <span className="rs">{it.tag}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
