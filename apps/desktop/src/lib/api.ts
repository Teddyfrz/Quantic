// Client API minimal de Quantic.

import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
  InvitationCode,
  CreateInvitationPayload,
  AdminStats,
  HealthStatus,
  Project,
  Task,
  CreateProjectPayload,
  UpdateProjectPayload,
  CreateTaskPayload,
  UpdateTaskPayload,
  Note,
  CreateNotePayload,
  UpdateNotePayload,
  KbCategory,
  KbPage,
  CreateKbCategoryPayload,
  UpdateKbCategoryPayload,
  CreateKbPagePayload,
  UpdateKbPagePayload,
  CalendarEvent,
  CreateCalendarEventPayload,
  UpdateCalendarEventPayload,
  Contact,
  CreateContactPayload,
  UpdateContactPayload,
  TrackingEntry,
  UpsertTrackingPayload,
  HealthEntry,
  UpsertHealthPayload,
  SportSession,
  CreateSportPayload,
  UpdateSportPayload,
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  Budget,
  CreateBudgetPayload,
  UpdateBudgetPayload,
  FinanceOverview,
  MyProfile,
  PublicProfile,
  UpdateProfilePayload,
  SearchResponse,
} from "@quantic/shared";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";
const TOKEN_KEY = "quantic.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export class ApiException extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const message = (data && data.message) || "Une erreur est survenue.";
    const code = (data && data.error) || "error";
    throw new ApiException(code, message);
  }
  return data as T;
}

export const api = {
  login: (payload: LoginPayload) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: payload }),

  register: (payload: RegisterPayload) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: payload }),

  me: () => request<{ user: User }>("/auth/me", { auth: true }),

  updateAccount: (payload: { name: string }) =>
    request<{ user: User }>("/auth/me", { method: "PATCH", body: payload, auth: true }),

  health: () => request<HealthStatus>("/health"),

  // Admin
  listUsers: () => request<{ users: User[] }>("/admin/users", { auth: true }),
  listInvitations: () =>
    request<{ invitations: InvitationCode[] }>("/admin/invitations", { auth: true }),
  createInvitation: (payload: CreateInvitationPayload) =>
    request<{ invitation: InvitationCode }>("/admin/invitations", {
      method: "POST",
      body: payload,
      auth: true,
    }),
  disableInvitation: (id: string) =>
    request<{ invitation: InvitationCode }>(`/admin/invitations/${id}/disable`, {
      method: "PATCH",
      auth: true,
    }),
  deleteInvitation: (id: string) =>
    request<null>(`/admin/invitations/${id}`, { method: "DELETE", auth: true }),
  setUserRole: (id: string, role: "user" | "admin") =>
    request<{ user: User }>(`/admin/users/${id}/role`, { method: "PATCH", body: { role }, auth: true }),
  deleteUser: (id: string) =>
    request<null>(`/admin/users/${id}`, { method: "DELETE", auth: true }),
  adminStats: () => request<AdminStats>("/admin/stats", { auth: true }),

  // Projets
  listProjects: () => request<{ projects: Project[] }>("/projects", { auth: true }),
  getProject: (id: string) =>
    request<{ project: Project; tasks: Task[] }>(`/projects/${id}`, { auth: true }),
  createProject: (payload: CreateProjectPayload) =>
    request<{ project: Project }>("/projects", { method: "POST", body: payload, auth: true }),
  updateProject: (id: string, payload: UpdateProjectPayload) =>
    request<{ project: Project }>(`/projects/${id}`, { method: "PATCH", body: payload, auth: true }),
  deleteProject: (id: string) =>
    request<null>(`/projects/${id}`, { method: "DELETE", auth: true }),

  // Tâches
  listTasks: (params?: { projectId?: string; status?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][]
    ).toString();
    return request<{ tasks: Task[] }>(`/tasks${qs ? `?${qs}` : ""}`, { auth: true });
  },
  createTask: (payload: CreateTaskPayload) =>
    request<{ task: Task }>("/tasks", { method: "POST", body: payload, auth: true }),
  updateTask: (id: string, payload: UpdateTaskPayload) =>
    request<{ task: Task; spawned: Task | null }>(`/tasks/${id}`, { method: "PATCH", body: payload, auth: true }),
  deleteTask: (id: string) => request<null>(`/tasks/${id}`, { method: "DELETE", auth: true }),

  // Notes
  listNotes: (params?: { projectId?: string; limit?: number }) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "");
    const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
    return request<{ notes: Note[] }>(`/notes${qs ? `?${qs}` : ""}`, { auth: true });
  },
  createNote: (payload: CreateNotePayload) =>
    request<{ note: Note }>("/notes", { method: "POST", body: payload, auth: true }),
  updateNote: (id: string, payload: UpdateNotePayload) =>
    request<{ note: Note }>(`/notes/${id}`, { method: "PATCH", body: payload, auth: true }),
  deleteNote: (id: string) => request<null>(`/notes/${id}`, { method: "DELETE", auth: true }),

  // Base de connaissances — catégories
  listKbCategories: () => request<{ categories: KbCategory[] }>("/kb/categories", { auth: true }),
  createKbCategory: (payload: CreateKbCategoryPayload) =>
    request<{ category: KbCategory }>("/kb/categories", { method: "POST", body: payload, auth: true }),
  updateKbCategory: (id: string, payload: UpdateKbCategoryPayload) =>
    request<{ category: KbCategory }>(`/kb/categories/${id}`, { method: "PATCH", body: payload, auth: true }),
  deleteKbCategory: (id: string) =>
    request<null>(`/kb/categories/${id}`, { method: "DELETE", auth: true }),

  // Base de connaissances — pages
  listKbPages: (params?: { categoryId?: string; q?: string }) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "");
    const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
    return request<{ pages: KbPage[] }>(`/kb/pages${qs ? `?${qs}` : ""}`, { auth: true });
  },
  getKbPage: (id: string) => request<{ page: KbPage }>(`/kb/pages/${id}`, { auth: true }),
  createKbPage: (payload: CreateKbPagePayload) =>
    request<{ page: KbPage }>("/kb/pages", { method: "POST", body: payload, auth: true }),
  updateKbPage: (id: string, payload: UpdateKbPagePayload) =>
    request<{ page: KbPage }>(`/kb/pages/${id}`, { method: "PATCH", body: payload, auth: true }),
  deleteKbPage: (id: string) => request<null>(`/kb/pages/${id}`, { method: "DELETE", auth: true }),

  // Calendrier
  listEvents: (params?: { from?: string; to?: string }) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "");
    const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
    return request<{ events: CalendarEvent[] }>(`/events${qs ? `?${qs}` : ""}`, { auth: true });
  },
  createEvent: (payload: CreateCalendarEventPayload) =>
    request<{ event: CalendarEvent }>("/events", { method: "POST", body: payload, auth: true }),
  updateEvent: (id: string, payload: UpdateCalendarEventPayload) =>
    request<{ event: CalendarEvent }>(`/events/${id}`, { method: "PATCH", body: payload, auth: true }),
  deleteEvent: (id: string) => request<null>(`/events/${id}`, { method: "DELETE", auth: true }),

  // Contacts
  listContacts: (params?: { q?: string }) => {
    const qs = params?.q ? `?q=${encodeURIComponent(params.q)}` : "";
    return request<{ contacts: Contact[] }>(`/contacts${qs}`, { auth: true });
  },
  createContact: (payload: CreateContactPayload) =>
    request<{ contact: Contact }>("/contacts", { method: "POST", body: payload, auth: true }),
  updateContact: (id: string, payload: UpdateContactPayload) =>
    request<{ contact: Contact }>(`/contacts/${id}`, { method: "PATCH", body: payload, auth: true }),
  deleteContact: (id: string) => request<null>(`/contacts/${id}`, { method: "DELETE", auth: true }),

  // Personnel — Suivi
  listTracking: (days = 7) =>
    request<{ entries: TrackingEntry[] }>(`/tracking?days=${days}`, { auth: true }),
  getTracking: (date: string) =>
    request<{ entry: TrackingEntry | null }>(`/tracking/${date}`, { auth: true }),
  upsertTracking: (payload: UpsertTrackingPayload) =>
    request<{ entry: TrackingEntry }>("/tracking", { method: "POST", body: payload, auth: true }),

  // Personnel — Santé
  listHealth: (days = 30) =>
    request<{ entries: HealthEntry[] }>(`/health-entries?days=${days}`, { auth: true }),
  upsertHealth: (payload: UpsertHealthPayload) =>
    request<{ entry: HealthEntry }>("/health-entries", { method: "POST", body: payload, auth: true }),
  listSport: (days = 30) =>
    request<{ sessions: SportSession[] }>(`/sport-sessions?days=${days}`, { auth: true }),
  createSport: (payload: CreateSportPayload) =>
    request<{ session: SportSession }>("/sport-sessions", { method: "POST", body: payload, auth: true }),
  updateSport: (id: string, payload: UpdateSportPayload) =>
    request<{ session: SportSession }>(`/sport-sessions/${id}`, { method: "PATCH", body: payload, auth: true }),
  deleteSport: (id: string) => request<null>(`/sport-sessions/${id}`, { method: "DELETE", auth: true }),

  // Personnel — Finance
  listTransactions: () =>
    request<{ transactions: Transaction[] }>("/transactions", { auth: true }),
  createTransaction: (payload: CreateTransactionPayload) =>
    request<{ transaction: Transaction }>("/transactions", { method: "POST", body: payload, auth: true }),
  updateTransaction: (id: string, payload: UpdateTransactionPayload) =>
    request<{ transaction: Transaction }>(`/transactions/${id}`, { method: "PATCH", body: payload, auth: true }),
  deleteTransaction: (id: string) =>
    request<null>(`/transactions/${id}`, { method: "DELETE", auth: true }),
  listBudgets: () => request<{ budgets: Budget[] }>("/budgets", { auth: true }),
  createBudget: (payload: CreateBudgetPayload) =>
    request<{ budget: Budget }>("/budgets", { method: "POST", body: payload, auth: true }),
  updateBudget: (id: string, payload: UpdateBudgetPayload) =>
    request<{ budget: Budget }>(`/budgets/${id}`, { method: "PATCH", body: payload, auth: true }),
  deleteBudget: (id: string) => request<null>(`/budgets/${id}`, { method: "DELETE", auth: true }),
  financeOverview: () => request<FinanceOverview>("/finance/overview", { auth: true }),

  // Profil social / annuaire
  myProfile: () => request<{ profile: MyProfile }>("/me/profile", { auth: true }),
  updateMyProfile: (payload: UpdateProfilePayload) =>
    request<{ profile: MyProfile }>("/me/profile", { method: "PUT", body: payload, auth: true }),
  listProfiles: (q?: string) =>
    request<{ profiles: PublicProfile[] }>(`/profiles${q ? `?q=${encodeURIComponent(q)}` : ""}`, { auth: true }),
  getProfile: (userId: string) =>
    request<{ profile: PublicProfile }>(`/profiles/${userId}`, { auth: true }),

  // Recherche globale
  search: (q: string) =>
    request<SearchResponse>(`/search?q=${encodeURIComponent(q)}`, { auth: true }),
};
