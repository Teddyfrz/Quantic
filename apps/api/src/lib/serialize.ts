import type {
  User as PrismaUser,
  InvitationCode as PrismaInvite,
  Project as PrismaProject,
  Task as PrismaTask,
  Note as PrismaNote,
  KbCategory as PrismaKbCategory,
  KbPage as PrismaKbPage,
  CalendarEvent as PrismaEvent,
  Contact as PrismaContact,
  TrackingEntry as PrismaTracking,
  HealthEntry as PrismaHealth,
  SportSession as PrismaSport,
  Transaction as PrismaTransaction,
  Budget as PrismaBudget,
} from "@prisma/client";
import type {
  User,
  InvitationCode,
  Role,
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
  TaskPriority,
  Note,
  KbCategory,
  KbPage,
  CalendarEvent,
  Contact,
  TrackingEntry,
  HealthEntry,
  SportSession,
  SportIntensity,
  Transaction,
  TransactionType,
  Budget,
} from "@quantic/shared";

export function toUser(u: PrismaUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export function toInvitation(i: PrismaInvite): InvitationCode {
  return {
    id: i.id,
    code: i.code,
    createdByUserId: i.createdByUserId,
    maxUses: i.maxUses,
    usedCount: i.usedCount,
    expiresAt: i.expiresAt ? i.expiresAt.toISOString() : null,
    isActive: i.isActive,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

export function toProject(
  p: PrismaProject,
  taskCount: number,
  doneCount: number
): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status as ProjectStatus,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    taskCount,
    doneCount,
    progress: taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100),
  };
}

export function toNote(n: PrismaNote): Note {
  return {
    id: n.id,
    projectId: n.projectId,
    title: n.title,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

export function toKbCategory(c: PrismaKbCategory): KbCategory {
  return {
    id: c.id,
    name: c.name,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function toKbPage(p: PrismaKbPage): KbPage {
  return {
    id: p.id,
    categoryId: p.categoryId,
    title: p.title,
    content: p.content,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toEvent(e: PrismaEvent): CalendarEvent {
  return {
    id: e.id,
    projectId: e.projectId,
    title: e.title,
    description: e.description,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt ? e.endAt.toISOString() : null,
    allDay: e.allDay,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function toTracking(t: PrismaTracking): TrackingEntry {
  return {
    id: t.id,
    date: t.date.toISOString().slice(0, 10),
    mental: t.mental,
    energy: t.energy,
    stress: t.stress,
    sleepHours: t.sleepHours,
    reflection: t.reflection,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toHealth(h: PrismaHealth): HealthEntry {
  return {
    id: h.id,
    date: h.date.toISOString().slice(0, 10),
    weight: h.weight,
    water: h.water,
    waterGoal: h.waterGoal,
    bodyFeeling: h.bodyFeeling,
    note: h.note,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
  };
}

export function toSport(s: PrismaSport): SportSession {
  return {
    id: s.id,
    date: s.date.toISOString().slice(0, 10),
    activity: s.activity,
    durationMin: s.durationMin,
    intensity: (s.intensity as SportIntensity | null) ?? null,
    note: s.note,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function toTransaction(t: PrismaTransaction): Transaction {
  return {
    id: t.id,
    amount: t.amount,
    type: t.type as TransactionType,
    category: t.category,
    date: t.date.toISOString().slice(0, 10),
    note: t.note,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toBudget(b: PrismaBudget): Budget {
  return {
    id: b.id,
    category: b.category,
    amount: b.amount,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function toContact(c: PrismaContact): Contact {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    type: c.type,
    note: c.note,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function toTask(t: PrismaTask): Task {
  return {
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status as TaskStatus,
    priority: (t.priority as TaskPriority | null) ?? null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    recurrence: (t.recurrence as Task["recurrence"]) ?? null,
    tags: parseStringArray(t.tags),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function parseStringArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
