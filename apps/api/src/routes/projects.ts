import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toProject, toTask } from "../lib/serialize.js";

const projectStatus = z.enum(["active", "paused", "done"]);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  status: projectStatus.optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: projectStatus.optional(),
});

// Calcule { taskCount, doneCount } pour une liste de projets en une requête.
async function countsFor(projectIds: string[]): Promise<Map<string, { total: number; done: number }>> {
  const map = new Map<string, { total: number; done: number }>();
  if (projectIds.length === 0) return map;
  const grouped = await prisma.task.groupBy({
    by: ["projectId", "status"],
    where: { projectId: { in: projectIds } },
    _count: { _all: true },
  });
  for (const id of projectIds) map.set(id, { total: 0, done: 0 });
  for (const g of grouped) {
    if (!g.projectId) continue;
    const entry = map.get(g.projectId)!;
    entry.total += g._count._all;
    if (g.status === "done") entry.done += g._count._all;
  }
  return map;
}

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", app.authenticate);

  // Liste des projets de l'utilisateur
  app.get("/projects", async (req, reply) => {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.sub },
      orderBy: { updatedAt: "desc" },
    });
    const counts = await countsFor(projects.map((p) => p.id));
    return reply.send({
      projects: projects.map((p) => {
        const c = counts.get(p.id) ?? { total: 0, done: 0 };
        return toProject(p, c.total, c.done);
      }),
    });
  });

  // Détail d'un projet + tâches liées
  app.get("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findFirst({
      where: { id, userId: req.user.sub },
    });
    if (!project) {
      return reply.code(404).send({ error: "not_found", message: "Projet introuvable." });
    }
    const tasks = await prisma.task.findMany({
      where: { projectId: id, userId: req.user.sub },
      orderBy: { createdAt: "asc" },
    });
    const done = tasks.filter((t) => t.status === "done").length;
    return reply.send({
      project: toProject(project, tasks.length, done),
      tasks: tasks.map(toTask),
    });
  });

  // Création
  app.post("/projects", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const project = await prisma.project.create({
      data: {
        userId: req.user.sub,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        status: parsed.data.status ?? "active",
      },
    });
    return reply.code(201).send({ project: toProject(project, 0, 0) });
  });

  // Mise à jour
  app.patch("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Données invalides." });
    }
    const existing = await prisma.project.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Projet introuvable." });
    }
    const project = await prisma.project.update({ where: { id }, data: parsed.data });
    const c = (await countsFor([id])).get(id) ?? { total: 0, done: 0 };
    return reply.send({ project: toProject(project, c.total, c.done) });
  });

  // Suppression (les tâches liées sont détachées via onDelete: SetNull)
  app.delete("/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.project.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) {
      return reply.code(404).send({ error: "not_found", message: "Projet introuvable." });
    }
    await prisma.project.delete({ where: { id } });
    return reply.code(204).send();
  });
}
