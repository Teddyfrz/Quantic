import type { ReactNode } from "react";

const s = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const NavIcon: Record<string, ReactNode> = {
  dashboard: (
    <svg {...s}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></svg>
  ),
  projects: (
    <svg {...s}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  tasks: (
    <svg {...s}><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3 6 1.2 1.2L6.5 5M4 12h.01M4 18h.01" /></svg>
  ),
  calendar: (
    <svg {...s}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
  ),
  notes: (
    <svg {...s}><path d="M5 3h11l3 3v15H5z" /><path d="M9 9h6M9 13h6M9 17h4" /></svg>
  ),
  knowledge: (
    <svg {...s}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M19 19H6a2 2 0 0 0-2 2" /></svg>
  ),
  contacts: (
    <svg {...s}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" /></svg>
  ),
  suivi: (
    <svg {...s}><path d="M3 12h4l2 6 4-14 2 8h6" /></svg>
  ),
  sante: (
    <svg {...s}><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" /></svg>
  ),
  finance: (
    <svg {...s}><circle cx="12" cy="12" r="9" /><path d="M14.5 9a2.5 2 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2A2.5 2 0 0 1 9.5 15M12 6v1.5M12 16.5V18" /></svg>
  ),
  admin: (
    <svg {...s}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  social: (
    <svg {...s}><circle cx="9" cy="9" r="3.2" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M16 8.2a3 3 0 0 1 0 5.6M18.5 18.5c1.6.4 2.5 1.4 2.5 2.5" /></svg>
  ),
  settings: (
    <svg {...s}><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.1-2.9H3a2 2 0 0 1 0-4h.2A1.7 1.7 0 0 0 4.3 6.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.1V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-1.1 2.9V11a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" /></svg>
  ),
  logout: (
    <svg {...s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
  ),
};
