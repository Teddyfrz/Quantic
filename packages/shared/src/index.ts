// Quantic — types partagés entre l'API et le client desktop.

export type Role = "user" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface InvitationCode {
  id: string;
  code: string;
  createdByUserId: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Payloads de requête ---

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  invitationCode: string;
}

export interface CreateInvitationPayload {
  maxUses?: number;
  expiresAt?: string | null;
}

// --- Statistiques admin (BDD) ---

export interface AdminStatEntry {
  label: string;
  count: number;
  group: string;
}

export interface AdminStats {
  entries: AdminStatEntry[];
  totalRows: number;
  users: number;
  admins: number;
  activeInvites: number;
  dbSizeBytes: number | null;
  generatedAt: string;
}

// --- Projets & Tâches ---

export type ProjectStatus = "active" | "paused" | "done";
export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskRecurrence = "daily" | "weekly" | "monthly";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  // Méta calculée côté serveur
  taskCount: number;
  doneCount: number;
  progress: number; // 0 - 100
}

export interface Task {
  id: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  dueDate: string | null;
  recurrence: TaskRecurrence | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority | null;
  projectId?: string | null;
  dueDate?: string | null;
  recurrence?: TaskRecurrence | null;
  tags?: string[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority | null;
  projectId?: string | null;
  dueDate?: string | null;
  recurrence?: TaskRecurrence | null;
  tags?: string[];
}

// --- Notes ---

export interface Note {
  id: string;
  projectId: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotePayload {
  title: string;
  content?: string;
  projectId?: string | null;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  projectId?: string | null;
}

// --- Base de connaissances ---

export interface KbCategory {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface KbPage {
  id: string;
  categoryId: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKbCategoryPayload {
  name: string;
}
export interface UpdateKbCategoryPayload {
  name: string;
}

export interface CreateKbPagePayload {
  title: string;
  content?: string;
  categoryId?: string | null;
}
export interface UpdateKbPagePayload {
  title?: string;
  content?: string;
  categoryId?: string | null;
}

// --- Calendrier ---

export interface CalendarEvent {
  id: string;
  projectId: string | null;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventPayload {
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  allDay?: boolean;
  projectId?: string | null;
}
export interface UpdateCalendarEventPayload {
  title?: string;
  description?: string | null;
  startAt?: string;
  endAt?: string | null;
  allDay?: boolean;
  projectId?: string | null;
}

// --- Contacts ---

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  type?: string | null;
  note?: string | null;
}
export interface UpdateContactPayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  type?: string | null;
  note?: string | null;
}

// --- Personnel : Suivi ---

export interface TrackingEntry {
  id: string;
  date: string; // yyyy-mm-dd
  mental: number | null;
  energy: number | null;
  stress: number | null;
  sleepHours: number | null;
  reflection: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTrackingPayload {
  date: string; // yyyy-mm-dd
  mental?: number | null;
  energy?: number | null;
  stress?: number | null;
  sleepHours?: number | null;
  reflection?: string | null;
}

// --- Personnel : Santé ---

export interface HealthEntry {
  id: string;
  date: string; // yyyy-mm-dd
  weight: number | null;
  water: number | null;
  waterGoal: number | null;
  bodyFeeling: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertHealthPayload {
  date: string;
  weight?: number | null;
  water?: number | null;
  waterGoal?: number | null;
  bodyFeeling?: string | null;
  note?: string | null;
}

export type SportIntensity = "low" | "medium" | "high";

export interface SportSession {
  id: string;
  date: string; // yyyy-mm-dd
  activity: string;
  durationMin: number;
  intensity: SportIntensity | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSportPayload {
  date: string;
  activity: string;
  durationMin: number;
  intensity?: SportIntensity | null;
  note?: string | null;
}
export interface UpdateSportPayload {
  date?: string;
  activity?: string;
  durationMin?: number;
  intensity?: SportIntensity | null;
  note?: string | null;
}

// --- Personnel : Finance ---

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // yyyy-mm-dd
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionPayload {
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  note?: string | null;
}
export interface UpdateTransactionPayload {
  amount?: number;
  type?: TransactionType;
  category?: string;
  date?: string;
  note?: string | null;
}

export interface Budget {
  id: string;
  category: string | null; // null = global
  amount: number;
  createdAt: string;
  updatedAt: string;
}
export interface CreateBudgetPayload {
  category?: string | null;
  amount: number;
}
export interface UpdateBudgetPayload {
  category?: string | null;
  amount?: number;
}

export interface BudgetStatus {
  id: string;
  category: string | null;
  amount: number; // prévu
  used: number; // utilisé (dépenses du mois)
  remaining: number; // reste
}

export interface CategorySpend {
  category: string;
  total: number;
}

export interface FinanceOverview {
  balance: number; // solde tout temps (revenus - dépenses)
  monthIncome: number;
  monthExpense: number;
  byCategory: CategorySpend[]; // dépenses du mois par catégorie
  budgets: BudgetStatus[];
}

// --- Profil social ---

export type PresenceStatus = "available" | "focus" | "away" | "offline";
export type ProfileVisibility = "private" | "members";

// Profil public (visible par les autres membres) — jamais d'email.
export interface PublicProfile {
  userId: string;
  name: string;
  role: Role;
  memberSince: string;
  handle: string | null;
  bio: string | null;
  status: PresenceStatus;
  statusText: string | null;
  location: string | null;
  avatarColor: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  links: string[];
}

// Mon profil = profil public + visibilité (réglage perso).
export interface MyProfile extends PublicProfile {
  visibility: ProfileVisibility;
}

export interface UpdateProfilePayload {
  handle?: string | null;
  bio?: string | null;
  status?: PresenceStatus;
  statusText?: string | null;
  location?: string | null;
  avatarColor?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  links?: string[];
  visibility?: ProfileVisibility;
}

// --- Recherche globale ---

export type SearchKind = "project" | "task" | "note" | "kbPage" | "contact";

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
}

// --- Réponses utilitaires ---

export interface ApiError {
  error: string;
  message: string;
}

export interface HealthStatus {
  status: "ok";
  version: string;
  time: string;
}
