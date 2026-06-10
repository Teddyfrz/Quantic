import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toTask } from "../lib/serialize.js";

const taskStatus = z.enum(["todo", "doing", "done"]);
const taskPriority = z.enum(["low", "medium", "high"]);
const taskRecurrence = z.enum(["daily", "weekly", "monthly"]);

const tagsSchema = z.array(z.string().min(1).max(30)).max(12);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  status: taskStatus.optional(),
  priority: taskPriority.nullable().optional(),
  projectId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  recurrence: taskRecurrence.nullable().optional(),
  tags: tagsSchema.optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: taskStatus.optional(),
  priority: taskPriority.nullable().optional(),
  projectId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  recurrence: taskRecurrence.nullable().optional(),
  tags: tagsSchema.optional(),
});

// Normalise une liste de tags (trim, sans doublons, sans vides).
function cleanTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
}

// Décale une date selon la récurrence.
function nextDate(d: Date, rec: "daily" | "weekly" | "monthly"): Date {
  const n = new Date(d);
  if (rec === "daily") n.setUTCDate(n.getUTCDate() + 1);
  else if (rec === "weekly") n.setUTCDate(n.getUTCDate() + 7);
  else n.setUTCMonth(n.getUTCMonth() + 1);
  return n;
}

// Vérifie que le projet (si fourni) appartient bien à l'utilisateur.
async function assertProjectOwnership(userId: string, projectId: string | null | undefined): Promise<boolean> {
  if (!projectId) return true;
  const p = await prisma.project.findFirst({ where: { id: projectId, userId } });
  return Boolean(p);
}

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // Liste (filtre optionnel ?projectId= / ?status=)
  app.get("/tasks", async (req, reply) => {
    const { projectId, status } = req.query as { projectId?: string; status?: string };
    const tasks = await prisma.task.findMany({
      where: {
        userId: req.user.sub,
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return reply.send({ tasks: tasks.map(toTask) });
  });

  // Création
  app.post("/tasks", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const { title, description, status, priority, projectId, dueDate, recurrence, tags } = parsed.data;
    if (!(await assertProjectOwnership(req.user.sub, projectId))) {
      return reply.code(400).send({ error: "invalid_project", message: "Projet invalide." });
    }
    const task = await prisma.task.create({
      data: {
        userId: req.user.sub,
        title,
        description: description ?? null,
        status: status ?? "todo",
        priority: priority ?? null,
        projectId: projectId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        recurrence: recurrence ?? null,
        tags: JSON.stringify(cleanTags(tags ?? [])),
      },
    });
    return reply.code(201).send({ task: toTask(task) });
  });

  // Mise à jour
  app.patch("/tasks/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const existing = await prisma.task.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Tâche introuvable." });
    }
    const { projectId, dueDate, tags, ...rest } = parsed.data;
    if (projectId !== undefined && !(await assertProjectOwnership(req.user.sub, projectId))) {
      return reply.code(400).send({ error: "invalid_project", message: "Projet invalide." });
    }
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(projectId !== undefined ? { projectId } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(tags !== undefined ? { tags: JSON.stringify(cleanTags(tags)) } : {}),
      },
    });

    // Tâche récurrente passée à « terminé » → on génère la prochaine occurrence (à faire).
    let spawned = null;
    const becameDone = rest.status === "done" && existing.status !== "done";
    if (becameDone && task.recurrence && task.dueDate) {
      const created = await prisma.task.create({
        data: {
          userId: req.user.sub,
          title: task.title,
          description: task.description,
          status: "todo",
          priority: task.priority,
          projectId: task.projectId,
          dueDate: nextDate(task.dueDate, task.recurrence as "daily" | "weekly" | "monthly"),
          recurrence: task.recurrence,
          tags: task.tags,
        },
      });
      spawned = toTask(created);
    }
    return reply.send({ task: toTask(task), spawned });
  });

  // Suppression
  app.delete("/tasks/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.task.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Tâche introuvable." });
    }
    await prisma.task.delete({ where: { id } });
    return reply.code(204).send();
  });
}
