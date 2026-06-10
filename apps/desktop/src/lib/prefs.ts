// Préférences locales de l'application (thème, météo, profil léger).
// Stockées dans localStorage — pas de persistance serveur nécessaire.

export type ThemeName = "sombre" | "blanc";
export type PresenceStatus = "available" | "focus" | "away" | "offline";

export interface Prefs {
  theme: ThemeName;
  weatherEnabled: boolean;
  weatherCity: string;
  sidebarCollapsed: boolean;
  // Profil (onglet Social)
  handle: string;
  status: PresenceStatus;
  statusText: string;
  location: string;
  avatarColor: string; // index de palette ("0".."5") ou ""
  bio: string;
  links: string[];
}

const KEY = "quantic.prefs";

const DEFAULTS: Prefs = {
  theme: "sombre",
  weatherEnabled: false,
  weatherCity: "",
  sidebarCollapsed: false,
  handle: "",
  status: "available",
  statusText: "",
  location: "",
  avatarColor: "",
  bio: "",
  links: [],
};

export function getPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const merged = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
    // Migration : l'ancien thème "ardoise" devient "sombre".
    if (merged.theme !== "sombre" && merged.theme !== "blanc") merged.theme = "sombre";
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...getPrefs(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  if (patch.theme) applyTheme(patch.theme);
  window.dispatchEvent(new CustomEvent("quantic-prefs"));
  return next;
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

export function initPrefs(): void {
  applyTheme(getPrefs().theme);
}
